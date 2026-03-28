/**
 * useNavigationPersistence.ts
 *
 * React hook that manages navigation state persistence lifecycle:
 *  1. Restores state on cold launch (only for authenticated users).
 *  2. Saves state on every navigation change (debounced to avoid thrashing).
 *  3. Clears state on logout.
 *  4. Handles AppState changes (background → foreground) gracefully.
 *
 * Usage in NavigationContainer:
 *
 *   const { initialState, onStateChange, isReady } = useNavigationPersistence(!!user);
 *
 *   if (!isReady) return <SplashScreen />;
 *
 *   <NavigationContainer
 *     initialState={initialState}
 *     onStateChange={onStateChange}
 *   >
 *     ...
 *   </NavigationContainer>
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  saveNavigationState,
  restoreNavigationState,
  clearNavigationState,
} from '../utils/navigationPersistence';

// Debounce delay in ms — avoids writing to storage on every single frame
const SAVE_DEBOUNCE_MS = 500;

interface UseNavigationPersistenceReturn {
  /**
   * Pass directly as `initialState` prop to NavigationContainer.
   * Typed as `any` to satisfy NavigationContainer's internal `InitialState`
   * shape without hand-writing every NavigationRoute field.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialState: any;
  /** Pass as `onStateChange` prop to NavigationContainer */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onStateChange: (state: any) => void;
  /**
   * `false` while the initial async restore is pending.
   * Render a loading/splash screen while this is false so NavigationContainer
   * never mounts without its initialState being ready.
   */
  isReady: boolean;
}

/**
 * @param isAuthenticated - Reflects whether a user is currently logged in.
 *   When false, no state is saved or restored, and any existing state is cleared.
 */
export function useNavigationPersistence(
  isAuthenticated: boolean,
): UseNavigationPersistenceReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [initialState, setInitialState] = useState<any>(undefined);
  const [isReady, setIsReady] = useState(false);

  // Hold the latest state for saving when the app backgrounds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestStateRef = useRef<any>(undefined);

  // Debounce timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1. Restore state on mount / auth change ──────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (!isAuthenticated) {
        // Logged-out users always start fresh; clear any stale state
        await clearNavigationState();
        if (!cancelled) {
          setInitialState(undefined);
          setIsReady(true);
        }
        return;
      }

      const saved = await restoreNavigationState(isAuthenticated);
      if (!cancelled) {
        // `saved` is null when nothing is stored — pass undefined so
        // NavigationContainer boots from its default initial route.
        setInitialState(saved !== null ? saved : undefined);
        setIsReady(true);
      }
    };

    // Reset readiness so the NavigationContainer re-mounts cleanly on
    // auth state changes (login / logout)
    setIsReady(false);
    restore();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ── 2. Save state on every navigation change (debounced) ─────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onStateChange = useCallback(
    (state: any) => {
      latestStateRef.current = state;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveNavigationState(state, isAuthenticated);
      }, SAVE_DEBOUNCE_MS);
    },
    [isAuthenticated],
  );

  // ── 3. Save immediately when the app goes to background ──────────────────
  //    (Debounced timer might not fire before the app is suspended)

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Cancel any pending debounced save and flush immediately
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        saveNavigationState(latestStateRef.current, isAuthenticated);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated]);

  // ── 4. Cleanup on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return { initialState, onStateChange, isReady };
}
