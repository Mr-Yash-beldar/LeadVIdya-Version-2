import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';

const BASE_URL = 'http://192.168.1.8:5000/api';
// const BASE_URL = 'https://connect.leadvidya.in/api';

// ── Global 429 backoff ─────────────────────────────────────────────────────
// When ANY request returns 429, block ALL new requests for BACKOFF_MS.
const BACKOFF_MS = 60_000; // 60 seconds
let rateLimitedUntil = 0; // timestamp (ms) until which requests are blocked

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        // Block request if we are in a 429 backoff window
        if (Date.now() < rateLimitedUntil) {
            const waitMs = rateLimitedUntil - Date.now();
            return Promise.reject(
                new Error(`Rate limited — retrying in ${Math.ceil(waitMs / 1000)}s`)
            );
        }
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Helper to get navigation outside of components

export const navigationRef = createNavigationContainerRef<any>();

let logoutHandler: (() => void) | null = null;
export const setLogoutHandler = (handler: () => void) => {
    logoutHandler = handler;
};

// Helper to extract clean error messages from axios errors
export const extractErrorMessage = (error: any): string => {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.message === 'Network Error') return 'No internet connection available.';
    if (error.code === 'ECONNABORTED') return 'Request timeout. Please try again.';
    return 'An unexpected error occurred.';
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;

        // 1. Handle 429 — set backoff, do NOT navigate away
        if (response?.status === 429) {
            rateLimitedUntil = Date.now() + BACKOFF_MS;
            console.warn(`[API] 429 received — pausing all requests for ${BACKOFF_MS / 1000}s`);
            error.message = 'Too many requests. Pausing for 60s.';
            return Promise.reject(error);
        }

        // 2. Retry Logic for GET requests
        const isNetworkError = !response || error.message === 'Network Error';
        const isServerError = response && (response.status >= 500 && response.status <= 599);

        // DO NOT RETRY these endpoints:
        // - Background polling endpoints that run in loops often
        // - Cache-backed endpoints (they fall back to AsyncStorage on failure)
        const noRetryEndpoints = [
            '/leads/checkandgive',
            '/leads/check-phone',
            '/health',
            '/campaigns',           // has AsyncStorage cache fallback
            '/leads/assigned',      // has AsyncStorage cache fallback
            '/calls/call-logs',     // has AsyncStorage cache fallback
        ];
        const shouldRetryEndpoint = config?.url && !noRetryEndpoints.some(ep => config.url?.includes(ep));

        // Only retry truly idempotent GETs on network/server errors AND allowed endpoints
        if (config && config.method === 'get' && (isNetworkError || isServerError) && shouldRetryEndpoint) {
            config.__retryCount = config.__retryCount || 0;
            if (config.__retryCount < 3) {
                config.__retryCount += 1;

                // Exponential Backoff: 1s, 4s, 9s
                const delay = Math.pow(config.__retryCount, 2) * 1000;

                console.warn(`[API] Retrying GET ${config.url} (${config.__retryCount}/3) in ${delay}ms`);
                await new Promise(resolve => setTimeout(() => resolve(undefined), delay));
                return apiClient(config);
            }
        }

        // 3. Handle 401 Unauthorized (Session Expired)
        if (response && response.status === 401) {
            console.log('Session expired, logging out...');
            if (logoutHandler) {
                logoutHandler();
            } else {
                await AsyncStorage.multiRemove(['user', 'token', 'refreshToken']);
                if (navigationRef.isReady()) {
                    navigationRef.reset({
                        index: 0,
                        routes: [{ name: 'SessionExpired' }],
                    });
                }
            }
        }

        // 4. Handle Server Down / Network Errors (exclude 429)
        const isFatalError = isNetworkError || [500, 502, 503, 504].includes(response?.status);
        if (isFatalError && navigationRef.isReady()) {
            // Check if the current route is one that shouldn't be interrupted
            const currentRoute = navigationRef.getCurrentRoute();
            const ignoreRoutes = ['Campaigns', 'MainTabs', 'HistoryScreen', 'LeadsScreen'];

            // WE NO LONGER FORCE NAVIGATION TO SERVER_DOWN GLOBALLY.
            // This allows Redux/Context to fall back to AsyncStorage cached data
            // instead of blinding the user with an error screen.
            console.warn('[apiClient] Fatal network error suppressed from global router:', error.message);
        }

        // Enrich error for UI
        error.uiMessage = extractErrorMessage(error);
        return Promise.reject(error);
    }
);

export default apiClient;
