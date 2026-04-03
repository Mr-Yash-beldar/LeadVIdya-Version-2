import React, { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HistoryScreen from '../screens/HistoryScreen';
// import { HomeScreen } from '../screens/HomeScreen';
import { CampaignsScreen } from '../screens/CampaignsScreen';
import { LeadsScreen } from '../screens/LeadsScreen';
import { CallAnalyticsScreen } from '../screens/CallAnalyticsScreen';
import { ContactAnalyticsScreen } from '../screens/ContactAnalyticsScreen';
import { LeadDetailsScreen } from '../screens/LeadDetailsScreen';
import { LeadDisposeScreen } from '../screens/LeadDisposeScreen';
import { CallSummaryScreen } from '../screens/CallSummaryScreen';
import { ServerDownScreen } from '../screens/ServerDownScreen';
import { SessionExpiredScreen } from '../screens/SessionExpiredScreen';
import { CampaignLeadsScreen } from '../screens/CampaignLeadsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/colors';
import { Phone, Users, BarChart2, Menu, UserPlus, Megaphone, Download } from 'lucide-react-native';

import { PrivacyScreen } from '../screens/Onboarding/PrivacyScreen';
import { VerificationScreen } from '../screens/Onboarding/VerificationScreen';
import { PermissionScreen } from '../screens/Onboarding/PermissionScreen';
import { DefaultPhoneScreen } from '../screens/Onboarding/DefaultPhoneScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { PermissionCallHistoryScreen } from '../screens/Onboarding/PermissionCallHistoryScreen';
import { PermissionContactScreen } from '../screens/Onboarding/PermissionContactScreen';
import { PermissionNotificationScreen } from '../screens/Onboarding/PermissionNotificationScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { OtpVerificationScreen } from '../screens/Auth/OtpVerificationScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, Text, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { useAutoSync } from '../hooks/useAutoSync';
import { useAutoNotifications } from '../hooks/useAutoNotifications';
import { useNavigationPersistence } from '../hooks/useNavigationPersistence';
import { clearNavigationState } from '../utils/navigationPersistence';
import { navigationRef } from '../services/apiClient';
import { CallScreen } from '../screens/CallScreen';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';
import { FollowUpScreen } from '../screens/FollowUpScreen';
import { UpdateAppScreen } from '../screens/UpdateAppScreen';

// Import NetworkProvider
import { NetworkProvider } from '../context/NetworkContext';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { OfflinePopup } from '../components/OfflinePopup';
import { api } from '../services/api';
import { CURRENT_APP_VERSION, compareVersions } from '../utils/appVersion';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// const AnalyticsScreen = () => <HomeScreen title="Analytics" />;


const TabNavigator = () => {
  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#000',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
      }}
    >
      <Tab.Screen
        name="Call History"
        component={HistoryScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Phone color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Leads"
        component={LeadsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <UserPlus color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Reports"
        component={CallAnalyticsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Campaigns"
        component={CampaignsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="More"
        component={SettingsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
};

// FIXED: Move NetworkProvider to wrap everything
export const RootNavigator = () => {
  return (
    <NetworkProvider>
      <AuthProvider>
        <RootContent />
        <OfflinePopup />
      </AuthProvider>
    </NetworkProvider>
  );
};

const RootContent = () => {
  const { user, loading, isFirstLaunch, logout: authLogout } = useAuth();

  // ── Navigation state persistence ──────────────────────────────────────────
  const isAuthenticated = !!user && !loading;
  const { initialState, onStateChange, isReady } = useNavigationPersistence(isAuthenticated);

  /**
   * Wrap logout so we always clear persisted nav state before the auth
   * context clears the user — prevents stale authenticated state from
   * being restored on the next login.
   */
  const logout = useCallback(
    async (reason?: string) => {
      await clearNavigationState();
      await authLogout(reason);
    },
    [authLogout],
  );

  // Start background notifications polling
  useAutoNotifications();

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const versionData = await api.getAppVersion();
        // console.log("App version check data:", versionData);
        if (versionData && versionData.latestVersion) {
          const current = CURRENT_APP_VERSION;
          const { latestVersion, minVersion = '0.0.0', updateUrl } = versionData;

          const navigateWithRetry = (name: string, params: any) => {
            if (navigationRef.isReady()) {
              (navigationRef as any).navigate(name, params);
            } else {
              const interval = setInterval(() => {
                if (navigationRef.isReady()) {
                  clearInterval(interval);
                  (navigationRef as any).navigate(name, params);
                }
              }, 200);
            }
          };

          // 1. Check for Forced Update
          if (compareVersions(current, minVersion) < 0) {
            console.log("FORCED UPDATE REQUIRED");
            navigateWithRetry('UpdateApp', { isForced: true, updateUrl });
            return;
          }

          // 2. Check for Optional Update
          if (compareVersions(current, latestVersion) < 0) {
            Alert.alert(
              "Update Available",
              "A newer version of the app is available. Please update for the best experience.",
              [
                { text: "Later", style: "cancel" },
                { text: "Update Now", onPress: () => navigateWithRetry('UpdateApp', { isForced: false, updateUrl }) }
              ]
            );
          }
        }
      } catch (e) {
        console.error("Version check failed", e);
      }
    };

    if (!loading && isReady) {
      // Delay to allow UI/Splash to finish transitioning so Alert doesn't drop
      setTimeout(() => {
        checkVersion();
      }, 1500);
    }
  }, [loading, isReady]);

  // Start background notifications polling
  useAutoNotifications();

  useEffect(() => {
    const checkPendingDispose = async () => {
      try {
        const pendingLeadJson = await AsyncStorage.getItem('pendingDisposeLead');
        if (pendingLeadJson && user && navigationRef.current) {
          const lead = JSON.parse(pendingLeadJson);
          setTimeout(() => {
            navigationRef.current?.navigate('LeadDetails', { lead, openDispose: true });
          }, 500);
        }
      } catch (e) {
        console.error("Checking pending dispose failed", e);
      }
    };

    if (user && !loading) {
      checkPendingDispose();
    }
  }, [user, loading]);

  // Show splash while auth context is bootstrapping OR while nav state is
  // being read from AsyncStorage (isReady). This prevents a flash of the
  // wrong screen on startup.
  if (loading || !isReady) {
    return <SplashScreen />;
  }

  // Single NavigationContainer at the top level with persistence props
  return (
    <NavigationContainer
      ref={navigationRef}
      initialState={initialState}
      onStateChange={onStateChange}
    >
      <Stack.Navigator
        id="RootStack"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >
        {!user ? (
          // Auth screens
          <>
            {isFirstLaunch && (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="DefaultPhone" component={DefaultPhoneScreen} />
            <Stack.Screen name="Permissions" component={PermissionCallHistoryScreen} />
            <Stack.Screen name="PermissionContacts" component={PermissionContactScreen} />
            <Stack.Screen name="PermissionNotification" component={PermissionNotificationScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen name="Verification" component={VerificationScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          </>
        ) : (
          // Main app screens
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="CallAnalytics" component={CallAnalyticsScreen} />
            <Stack.Screen name="CampaignLeads" component={CampaignLeadsScreen} />
            <Stack.Screen name="ContactAnalytics" component={ContactAnalyticsScreen} />
            <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
            <Stack.Screen name="LeadDispose" component={LeadDisposeScreen} />
            <Stack.Screen name="CallSummary" component={CallSummaryScreen} />
            <Stack.Screen name="CallScreen"
              component={CallScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="FollowUp" component={FollowUpScreen} />
          </>
        )}

        {/* Global Error/Maintenance Screens should be always registered at the bottom */}
        <Stack.Screen name="ServerDown" component={ServerDownScreen} />
        <Stack.Screen name="SessionExpired" component={SessionExpiredScreen} />
        <Stack.Screen name="UpdateApp" component={UpdateAppScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};