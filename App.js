import React, { useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationService } from './src/services/NotificationService';
import { FCMService } from './src/services/FCMService';
import { api } from './src/services/api';
import { LeadsService } from './src/services/LeadsService';

// ─── Background / Killed-app FCM handler ──────────────────────────────────────
// This MUST be registered at the top level of App.js (outside the component)
// so Firebase can call it even when the app is fully killed by the user.
//
// When dismissed: Firebase wakes a headless JS task, calls this function,
// and we use Notifee to display the notification.
try {
  const messagingMod = require('@react-native-firebase/messaging');
  const { getMessaging, setBackgroundMessageHandler } = messagingMod;
  setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
    console.log('[FCM Background] Message received while app is killed/background:', remoteMessage?.notification?.title);
    await NotificationService.init();          // ensure channel exists
    await FCMService.displayFromRemoteMessage(remoteMessage);
  });
} catch (e) {
  console.warn('[FCM] Background handler registration failed:', e);
}
// ──────────────────────────────────────────────────────────────────────────────

export default function App() {
  const fcmCleanupRef = useRef(null);

  useEffect(() => {
    // 1. Create Notifee notification channel
    NotificationService.init().catch(() => {});

    // 2. Initialize FCM: permission → token → foreground listener → token-refresh
    FCMService.init()
      .then(cleanup => { fcmCleanupRef.current = cleanup; })
      .catch(() => {});

    // 3. Health check then background-refresh caches
    api.checkHealth().then(isUp => {
      if (!isUp) {
        console.warn('[API] Server is unreachable. Using cached data.');
        return;
      }
      api.refreshCampaigns().catch(() => {});
      LeadsService.refreshLeads().catch(() => {});
      api.refreshCallLogs().catch(() => {});
    });

    return () => {
      if (fcmCleanupRef.current) {
        fcmCleanupRef.current();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <RootNavigator />
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
