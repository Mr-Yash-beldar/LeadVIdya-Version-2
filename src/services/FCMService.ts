/**
 * FCMService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles Firebase Cloud Messaging (FCM) for LeadVidya.
 *
 * Responsibilities:
 *  1. Request OS notification permission.
 *  2. Get the device FCM token and register it with the backend.
 *  3. Handle FOREGROUND messages   → show a Notifee notification immediately.
 *  4. Handle BACKGROUND / QUIT    → FCM wakes the app via a headless task;
 *     we display the notification via Notifee (registered in index.js).
 *  5. Re-register the FCM token whenever it refreshes.
 */

import { NativeModules } from 'react-native';

// ─── Safe Firebase loader ─────────────────────────────────────────────────────

let _messagingMod: any = null;
let _messagingChecked = false;

const getMessagingModule = () => {
    if (_messagingChecked) return _messagingMod;
    _messagingChecked = true;
    try {
        _messagingMod = require('@react-native-firebase/messaging');
    } catch (e) {
        console.warn('[FCMService] @react-native-firebase/messaging not available:', e);
    }
    return _messagingMod;
};

// ─── Safe Notifee loader ──────────────────────────────────────────────────────

const CHANNEL_ID = 'followup_reminders';

const getNotifee = () => {
    if (!NativeModules.NotifeeApiModule) return null;
    try {
        const mod = require('@notifee/react-native');
        return mod.default || mod;
    } catch {
        return null;
    }
};

// ─── FCMService ───────────────────────────────────────────────────────────────

export const FCMService = {

    /**
     * Request notification permission (iOS + Android 13+).
     * Returns true when granted.
     */
    async requestPermission(): Promise<boolean> {
        const mod = getMessagingModule();
        if (!mod) return false;
        try {
            const { getMessaging, requestPermission, AuthorizationStatus } = mod;
            const messaging = getMessaging();
            const authStatus = await requestPermission(messaging);

            const granted =
                authStatus === AuthorizationStatus.AUTHORIZED ||
                authStatus === AuthorizationStatus.PROVISIONAL;
            return granted;
        } catch (e) {
            console.warn('[FCMService] requestPermission error:', e);
            return false;
        }
    },

    /**
     * Get current FCM token and send it to the backend so the server can
     * push notifications to this specific device.
     */
    async registerToken(): Promise<string | null> {
        const mod = getMessagingModule();
        if (!mod) return null;
        try {
            const { getMessaging, registerDeviceForRemoteMessages, getToken } = mod;
            const messaging = getMessaging();

            await registerDeviceForRemoteMessages(messaging);
            const token = await getToken(messaging);
            if (token) {
                await FCMService._sendTokenToBackend(token);
                // console.log('[FCMService] FCM token registered:', token.substring(0, 20) + '...');
            }
            return token;
        } catch (e) {
            console.warn('[FCMService] registerToken error:', e);
            return null;
        }
    },

    /**
     * POST the FCM token to your backend endpoint.
     * The backend stores it per-user so it can send pushes later.
     */
    async _sendTokenToBackend(token: string): Promise<void> {
        try {
            const { api } = require('./api');
            await api.registerFCMToken(token);
        } catch (e: any) {
            // Don't crash — token registration is best-effort
            if (e?.message !== 'Network Error') {
                console.warn('[FCMService] Failed to register token with backend:', e?.message);
            }
        }
    },

    /**
     * Display a Notifee notification from an FCM remote message payload.
     * Used for both foreground messages and the background headless handler.
     */
    async displayFromRemoteMessage(remoteMessage: any): Promise<void> {
        const notifee = getNotifee();
        if (!notifee) return;

        const mod = (() => {
            try { return require('@notifee/react-native'); } catch { return null; }
        })();
        const AndroidImportance = mod?.AndroidImportance || {};

        const title = remoteMessage?.notification?.title
            || remoteMessage?.data?.title
            || '📋 LeadVidya';
        const body = remoteMessage?.notification?.body
            || remoteMessage?.data?.body
            || 'You have a new follow-up notification.';

        // Use a unique id so repeated pushes for the same lead replace, not stack
        const notifId = remoteMessage?.data?.leadId
            ? `fcm-${remoteMessage.data.leadId}`
            : `fcm-${Date.now()}`;

        try {
            // Ensure channel exists
            await notifee.createChannel({
                id: CHANNEL_ID,
                name: 'Follow-up Reminders',
                importance: AndroidImportance.HIGH ?? 4,
                sound: 'default',
                vibration: true,
            });

            await notifee.displayNotification({
                id: notifId,
                title,
                body,
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
            console.warn('[FCMService] displayFromRemoteMessage error:', e);
        }
    },

    /**
     * Subscribe to FOREGROUND FCM messages.
     * Returns the unsubscribe function — call it on component unmount.
     */
    subscribeToForegroundMessages(): (() => void) | null {
        const mod = getMessagingModule();
        if (!mod) return null;

        const { getMessaging, onMessage } = mod;
        const messaging = getMessaging();

        const unsubscribe = onMessage(messaging, async (remoteMessage: any) => {
            console.log('[FCMService] Foreground FCM message received:', remoteMessage?.notification?.title);
            await FCMService.displayFromRemoteMessage(remoteMessage);
        });

        return unsubscribe;
    },

    /**
     * Listen for FCM token refresh and re-register the new token.
     * Returns the unsubscribe function.
     */
    subscribeToTokenRefresh(): (() => void) | null {
        const mod = getMessagingModule();
        if (!mod) return null;

        const { getMessaging, onTokenRefresh } = mod;
        const messaging = getMessaging();

        const unsubscribe = onTokenRefresh(messaging, async (newToken: string) => {
            console.log('[FCMService] FCM token refreshed');
            await FCMService._sendTokenToBackend(newToken);
        });

        return unsubscribe;
    },

    /**
     * Full initialization:
     *   Permission → Token registration → Foreground listener → Token-refresh listener.
     *
     * Call this once in App.js when the user is authenticated.
     * Returns cleanup function.
     */
    async init(): Promise<() => void> {
        const cleanups: Array<() => void> = [];

        const granted = await FCMService.requestPermission();
        if (!granted) {
            console.warn('[FCMService] Notification permission denied. FCM disabled.');
            return () => { };
        }

        await FCMService.registerToken();

        const unsubForeground = FCMService.subscribeToForegroundMessages();
        if (unsubForeground) cleanups.push(unsubForeground);

        const unsubRefresh = FCMService.subscribeToTokenRefresh();
        if (unsubRefresh) cleanups.push(unsubRefresh);

        return () => cleanups.forEach(fn => fn());
    },
};
