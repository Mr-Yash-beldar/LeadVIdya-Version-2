/**
 * navigationPersistence.ts
 *
 * Handles saving and restoring React Navigation state to/from AsyncStorage.
 * Only persists state for authenticated users — auth screens are never restored.
 *
 * Strategy:
 *  - State is serialized as JSON and stored under NAV_STATE_KEY.
 *  - A version stamp (NAV_STATE_VERSION) allows us to invalidate stale state
 *    after major navigation structural changes (bump the version to bust cache).
 *  - On restore, the state is validated structurally before being used.
 *  - If anything is corrupt / outdated, we silently fall back to the default
 *    initial route so the user never sees a blank screen.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InitialState } from '@react-navigation/native';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_STATE_KEY = '@LeadVidya:navState';
const NAV_STATE_VERSION_KEY = '@LeadVidya:navStateVersion';

/**
 * Bump this number whenever you make breaking changes to the navigator
 * structure (e.g. rename a screen, restructure nested navigators).
 * Old persisted state will be discarded automatically.
 */
const NAV_STATE_VERSION = 1;

/**
 * Screen names that should NEVER be the restored entry point.
 * Even if they appear in saved state, we drop the whole snapshot so the
 * user starts from a clean, authenticated initial screen.
 */
const EXCLUDED_ROUTES = new Set([
  'Login',
  'Onboarding',
  'OtpVerification',
  'Verification',
  'Privacy',
  'Permissions',
  'PermissionContacts',
  'PermissionNotification',
  'DefaultPhone',
  'SplashScreen',
  // System utility screens — always reset these
  'SessionExpired',
  'ServerDown',
  'UpdateApp',
]);

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * We use InitialState from react-navigation as our persisted state shape.
 * It is intentionally partial / "stale" — the NavigationContainer will
 * rehydrate the full state from it on mount.
 */
type RawNavState = InitialState;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively walks a navigation state tree and returns true if it contains
 * a route that should be excluded from persistence.
 */
function containsExcludedRoute(state: RawNavState): boolean {
  if (!state?.routes) return false;
  for (const route of state.routes) {
    if (route.name && EXCLUDED_ROUTES.has(route.name)) return true;
    if (route.state && containsExcludedRoute(route.state as RawNavState)) return true;
  }
  return false;
}

/**
 * Basic structural validation of a deserialized navigation state object.
 * We only check the minimum required shape; react-navigation handles the rest.
 */
function isValidState(state: unknown): state is RawNavState {
  if (!state || typeof state !== 'object') return false;
  const s = state as RawNavState;
  if (!Array.isArray(s.routes) || s.routes.length === 0) return false;
  if (typeof s.index !== 'number') return false;
  if (s.index < 0 || s.index >= (s.routes as unknown[]).length) return false;
  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Persists the current navigation state for authenticated users.
 */
export async function saveNavigationState(
  state: InitialState | undefined,
  isAuthenticated: boolean,
): Promise<void> {
  try {
    if (!isAuthenticated || !state) {
      // Clear any previously saved state when the user is not authenticated
      await AsyncStorage.removeItem(NAV_STATE_KEY);
      return;
    }

    // Never persist auth / onboarding / error screens
    if (containsExcludedRoute(state)) {
      return;
    }

    await AsyncStorage.multiSet([
      [NAV_STATE_KEY, JSON.stringify(state)],
      [NAV_STATE_VERSION_KEY, String(NAV_STATE_VERSION)],
    ]);
  } catch (error) {
    // Storage errors must never crash the app
    console.warn('[NavPersistence] Failed to save state:', error);
  }
}

/**
 * Attempts to restore a previously saved navigation state.
 *
 * Returns `null` when:
 *  - No state is stored (first launch)
 *  - The stored version doesn't match the current version
 *  - The JSON is corrupt / unparseable
 *  - The state structure fails validation
 *  - The state contains any excluded route
 *
 * @param isAuthenticated - Pass `false` to skip restore (user not logged in).
 */
export async function restoreNavigationState(
  isAuthenticated: boolean,
): Promise<InitialState | null> {
  try {
    if (!isAuthenticated) return null;

    const [[, rawVersion], [, rawState]] = await AsyncStorage.multiGet([
      NAV_STATE_VERSION_KEY,
      NAV_STATE_KEY,
    ]);

    // Version mismatch — discard stale state
    if (rawVersion === null || Number(rawVersion) !== NAV_STATE_VERSION) {
      await AsyncStorage.multiRemove([NAV_STATE_KEY, NAV_STATE_VERSION_KEY]);
      console.log('[NavPersistence] State version mismatch — cleared.');
      return null;
    }

    if (!rawState) return null;

    const parsed: unknown = JSON.parse(rawState);

    if (!isValidState(parsed)) {
      console.warn('[NavPersistence] Stored state failed validation — discarding.');
      await clearNavigationState();
      return null;
    }

    // Final safety check: don't restore into an excluded screen
    if (containsExcludedRoute(parsed)) {
      console.warn('[NavPersistence] Stored state contains excluded route — discarding.');
      await clearNavigationState();
      return null;
    }

    console.log('[NavPersistence] State restored successfully.');
    return parsed;
  } catch (error) {
    // JSON.parse or AsyncStorage failures
    console.warn('[NavPersistence] Failed to restore state:', error);
    await clearNavigationState();
    return null;
  }
}

/**
 * Clears all persisted navigation state.
 * Call this on logout so the next login starts from the default screen.
 */
export async function clearNavigationState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([NAV_STATE_KEY, NAV_STATE_VERSION_KEY]);
  } catch (error) {
    console.warn('[NavPersistence] Failed to clear state:', error);
  }
}
