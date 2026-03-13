import { NativeModules } from 'react-native';

export interface FollowUp {
    id: string;
    name: string;
    status: string;
    followUpDate: string;
    followUpTime: string;
    followUpTimestamp: number;
}

export const DEMO_FOLLOWUPS: FollowUp[] = [
    {
        id: 'fu_1',
        name: 'Yashodip Shete',
        status: 'Pending',
        followUpDate: '27.02.2026',
        followUpTime: '3:00 PM',
        followUpTimestamp: new Date('2026-02-27T09:30:00.000Z').getTime(), 
    },
    {
        id: 'fu_2',
        name: 'Ajit Sir',
        status: 'Pending',
        followUpDate: '27.02.2026',
        followUpTime: '5:00 PM',
        followUpTimestamp: new Date('2026-02-27T11:30:00.000Z').getTime(),
    }
];

const CHANNEL_ID = 'followup_reminders';

// Cached module reference
let _notifeeModule: any = null;
let _notifeeChecked = false;

/**
 * Safe Notifee loader for New Architecture (Fabric/Bridgeless).
 *
 * In the new architecture, Metro's guardedLoadModule calls reportFatalError
 * which bypasses a JS try/catch around require(). So we must check whether
 * the native Notifee module is registered BEFORE calling require().
 */
const loadNotifee = () => {
    if (_notifeeChecked) return _notifeeModule; // already resolved

    _notifeeChecked = true;

    // Step 1: Check if the Notifee native module is actually registered.
    // If not, bail out silently — no require() call, no error flood.
    if (!NativeModules.NotifeeApiModule) {
        // console.warn('[NotificationService] Notifee native module not registered. Notifications disabled.');
        return null;
    }

    // Step 2: Native module is present — safe to load the JS layer.
    try {
        _notifeeModule = require('@notifee/react-native');
    } catch (e) {
        console.warn('[NotificationService] Failed to load @notifee/react-native JS module:', e);
    }
    return _notifeeModule;
};

// Returns either the real Notifee module or a safe "No-Op" object
const getNotifee = () => {
    const mod = loadNotifee();
    if (mod) {
        return mod.default || mod;
    }

    // Failsafe No-Op object to prevent crashes on method calls
    return {
        createChannel: async () => {},
        requestPermission: async () => ({ status: 1 }),
        displayNotification: async () => {},
        createTriggerNotification: async () => {},
        cancelAllNotifications: async () => {},
        getTriggerNotificationIds: async () => [],
    } as any;
};

export const NotificationService = {
    async init() {
        const notifee = getNotifee();
        if (!notifee) return;

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
            console.error("Notifee init failed:", e);
        }
    },

    async requestPermission() {
        const notifee = getNotifee();
        if (!notifee) return;
        try {
            await notifee.requestPermission();
        } catch (e) {
            console.error("Notifee requestPermission failed:", e);
        }
    },

    async scheduleReminder(followUp: FollowUp) {
        const notifee = getNotifee();
        if (!notifee) return;

        const mod = loadNotifee();
        const TriggerType = mod?.TriggerType || {};
        const AndroidImportance = mod?.AndroidImportance || {};

        const reminderTs = followUp.followUpTimestamp - 60 * 60 * 1000; 
        if (reminderTs <= Date.now()) return; 

        try {
            await notifee.createTriggerNotification(
                {
                    id: followUp.id,
                    title: `📞 Follow-up Reminder — ${followUp.name}`,
                    body: `Status: ${followUp.status} · Due at ${followUp.followUpTime} on ${followUp.followUpDate}`,
                    android: {
                        channelId: CHANNEL_ID,
                        importance: AndroidImportance.HIGH ?? 4,
                        smallIcon: 'ic_notification', 
                        pressAction: { id: 'default' },
                        showTimestamp: true,
                    },
                },
                {
                    type: TriggerType.TIMESTAMP ?? 1,
                    timestamp: reminderTs,
                },
            );
        } catch (e) {
            console.error("Notifee scheduleReminder failed:", e);
        }
    },

    async scheduleAll(followUps: FollowUp[] = DEMO_FOLLOWUPS) {
        if (!getNotifee()) return;
        await this.init();
        await this.requestPermission();
        for (const fu of followUps) {
            await this.scheduleReminder(fu);
        }
    },

    async cancelAll() {
        const notifee = getNotifee();
        if (notifee) {
            await notifee.cancelAllNotifications();
        }
    }
};
