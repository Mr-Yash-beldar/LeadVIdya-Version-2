import { useEffect, useRef } from 'react';
import BackgroundTimer from 'react-native-background-timer';
import { useAuth } from '../context/AuthContext';
import { NotificationService } from '../services/NotificationService';

const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

export const useAutoNotifications = () => {
    const { user } = useAuth();
    const isRunning = useRef(false);

    useEffect(() => {
        if (!user) {
            if (isRunning.current) {
                BackgroundTimer.stopBackgroundTimer();
                isRunning.current = false;
            }
            return;
        }

        // Initialize the Android notification channel once on mount
        NotificationService.init().catch(() => {});
        NotificationService.requestPermission().catch(() => {});

        const fetchNotifications = async () => {
            try {
                await NotificationService.fetchAndDisplayUrgent();
            } catch (error) {
                console.warn('[useAutoNotifications] poll error:', error);
            }
        };

        // Immediate first fetch
        fetchNotifications();

        if (!isRunning.current) {
            BackgroundTimer.runBackgroundTimer(() => {
                fetchNotifications();
            }, POLL_INTERVAL);
            isRunning.current = true;
        }

        return () => {
            if (isRunning.current) {
                BackgroundTimer.stopBackgroundTimer();
                isRunning.current = false;
            }
        };
    }, [user]);
};
