import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationService, DEMO_FOLLOWUPS } from './src/services/NotificationService';
import { api } from './src/services/api';
import { LeadsService } from './src/services/LeadsService';

export default function App() {
  useEffect(() => {
    // 1. Create notification channel + schedule follow-up reminders
    // (safe no-op if Notifee native module is missing)
    NotificationService.scheduleAll(DEMO_FOLLOWUPS).catch(() => {});

    // 2. Health check first, then background-refresh only if server is reachable.
    // This prevents the 3x retry flood on every launch when the server is down.
    api.checkHealth().then(isUp => {
      if (!isUp) {
        console.warn('[API] Server is unreachable. Using cached data.');
        return;
      }
      // Server is up — silently refresh caches in the background
      api.refreshCampaigns().catch(() => {});
      LeadsService.refreshLeads().catch(() => {});
      api.refreshCallLogs().catch(() => {});
    });
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
