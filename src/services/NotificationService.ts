import { NativeModules } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FollowUp {
    id: string;
    name: string;
    status: string;
    followUpDate: string;
    followUpTime: string;
    followUpTimestamp: number;
}

// ─── Notifee lazy-loader ───────────────────────────────────────────────────────

const CHANNEL_ID = 'followup_reminders';

let _notifeeModule: any = null;
let _notifeeChecked = false;

function getDateTimeAndMinutesLeft(dateString: any) {
    const target: any = new Date(dateString);
    const now: any = new Date();

    // format date
    const date = target.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    // format time
    const time = target.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });


    const diffMs = target - now;
    const minutesLeft = Math.floor(diffMs / (1000 * 60));

    return {
        date,
        time,
        minutesLeft: minutesLeft > 0 ? `${minutesLeft} minutes left` : "Time passed"
    };
}

/**
 * Safe Notifee loader — checks native module presence first to avoid
 * red-screen crashes on New Architecture / Bridgeless mode.
 */
const loadNotifee = () => {
    if (_notifeeChecked) return _notifeeModule;
    _notifeeChecked = true;

    if (!NativeModules.NotifeeApiModule) {
        return null;
    }

    try {
        _notifeeModule = require('@notifee/react-native');
    } catch (e) {
        console.warn('[NotificationService] Failed to load @notifee/react-native:', e);
    }
    return _notifeeModule;
};

const getNotifee = () => {
    const mod = loadNotifee();
    if (mod) return mod.default || mod;

    // No-Op fallback so callers never crash
    return {
        createChannel: async () => { },
        requestPermission: async () => ({ status: 1 }),
        displayNotification: async () => { },
        createTriggerNotification: async () => { },
        cancelAllNotifications: async () => { },
        cancelNotification: async () => { },
        getTriggerNotificationIds: async () => [],
    } as any;
};

// ─── NotificationService ──────────────────────────────────────────────────────

export const NotificationService = {

    /**
     * Creates the Android notification channel + requests permission.
     * Safe to call multiple times (idempotent).
     */
    async init() {
        const notifee = getNotifee();
        const mod = loadNotifee();
        const AndroidImportance = mod?.AndroidImportance || {};
        const AndroidVisibility = mod?.AndroidVisibility || {};

        try {
            await notifee.createChannel({
                id: CHANNEL_ID,
                name: 'Follow-up Reminders',
                importance: AndroidImportance.HIGH ?? 4,
                visibility: AndroidVisibility.PUBLIC ?? 1,
                sound: 'default',
                vibration: true,
            });
        } catch (e) {
            console.warn('[NotificationService] init() createChannel failed:', e);
        }
    },

    async requestPermission() {
        const notifee = getNotifee();
        try {
            await notifee.requestPermission();
        } catch (e) {
            console.warn('[NotificationService] requestPermission failed:', e);
        }
    },

    /**
     * Fire an immediate, visible notification for an urgent task.
     */
    async displayUrgentNotification(task: any, isOverdue: boolean) {
        // console.log('task', task);
        const notifee = getNotifee();
        const mod = loadNotifee();
        const AndroidImportance = mod?.AndroidImportance || {};

        // Use a stable ID so re-firing the same task replaces the previous notification
        const uniqueId = `urgent-${task.id}-${isOverdue ? 'overdue' : 'upcoming'}`;

        const leadName = task.name
            ? `${task.name}`
            : 'Lead';
        const timeLabel = getDateTimeAndMinutesLeft(task.followupDate);

        try {
            await notifee.displayNotification({
                id: uniqueId,
                title: isOverdue ? `🚨 Overdue Follow-up: ${leadName} ` : `⏰ Upcoming Follow - up: ${leadName} `,
                body: isOverdue ? `Follow - up was scheduled for ${timeLabel.date} at ${timeLabel.time} ${timeLabel.minutesLeft} .Please act now!` : `Follow - up due soon at ${timeLabel.date} at ${timeLabel.time} ${timeLabel.minutesLeft}.`,
                android: {
                    channelId: CHANNEL_ID,
                    importance: AndroidImportance.HIGH ?? 4,
                    smallIcon: 'ic_notification',
                    pressAction: { id: 'default' },
                    showTimestamp: true,
                    autoCancel: true,
                },
            });
        } catch (e) {
            console.warn('[NotificationService] displayUrgentNotification failed:', e);
        }
    },

    /**
     * Main polling function — called every 15 minutes by useAutoNotifications.
     * Fetches urgent follow-ups from the real backend and fires OS notifications.
     */
    async fetchAndDisplayUrgent() {
        await this.init();

        try {
            const { api } = require('./api');
            const data = await api.getUrgentNotifications();
            // console.log('data', data);

            if (!data) return;

            const upcoming: any[] = Array.isArray(data.upcoming) ? data.upcoming : [];
            const overdue: any[] = Array.isArray(data.overdue) ? data.overdue : [];

            // Fire a notification for every overdue and upcoming task.
            // Using a stable notification ID means the OS replaces an existing
            // notification instead of stacking duplicates on every 15-min poll.
            for (const task of overdue) {
                await this.displayUrgentNotification(task, true);
            }
            for (const task of upcoming) {
                await this.displayUrgentNotification(task, false);
            }

            // console.log(
            //     `[NotificationService] Fired ${ overdue.length } overdue + ${ upcoming.length } upcoming notifications.`
            // );
        } catch (e: any) {
            if (e?.message !== 'Network Error' && !e?.message?.includes('timeout')) {
                console.warn('[NotificationService] fetchAndDisplayUrgent failed:', e?.message);
            }
        }
    },

    async cancelAll() {
        const notifee = getNotifee();
        try {
            await notifee.cancelAllNotifications();
        } catch (e) {
            console.warn('[NotificationService] cancelAll failed:', e);
        }
    },
};
