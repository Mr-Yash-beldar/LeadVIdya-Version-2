import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';

const CAMPAIGNS_CACHE_KEY = 'cached_campaigns';
const CALL_LOGS_CACHE_KEY = 'cached_call_logs';

export const api = {
    // Auth
    login: async (data: { email: string; password: string }) => {
        try {
            const response = await apiClient.post('/auth/login', {
                email: data.email,
                password: data.password
            });
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'Login failed';
            console.error('Login Error:', error.response?.data || error.message);
            throw new Error(errorMsg);
        }
    },

    register: async (data: any) => {
        try {
            const response = await apiClient.post('/auth/register', data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    },

    verify: async (data: { phone: string; code: string }) => {
        try {
            const response = await apiClient.post('/auth/verify', data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Verification failed');
        }
    },

    // Sync
    syncLogs: async (userId: string, logs: any[]) => {
        try {
            const response = await apiClient.post('/logs/sync', {
                userId,
                logs
            });
            return response.data;
        } catch (error: any) {
            console.error('Sync Error:', error.response?.data || error.message);
            throw error;
        }
    },

    getLogs: async (userId: string) => {
        try {
            const response = await apiClient.get(`/logs/${userId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    checkLeadAssignment: async (phone: string) => {
        try {
            const response = await apiClient.get('/leads/check-phone', {
                params: { phone }
            });
            return response.data;
        } catch (error: any) {
            if (error.message !== 'Network Error' && !error.message?.includes('timeout')) {
                console.error('Lead Check Error:', error.message || error);
            }
            return { success: false, error: true };
        }
    },

    checkPhone: async (phone: string) => {
        try {
            const response = await apiClient.get('/leads/checkandgive', {
                params: { phone }
            });
            return response.data.lead;
        } catch (error: any) {
            // Suppress log for expected network errors here to avoid console spam
            if (error.message !== 'Network Error' && !error.message?.includes('timeout')) {
                console.error('Lead Check Error:', error.message || error);
            }
            return { success: false, error: true };
        }
    },

    getCampaigns: async (forceRefresh = false) => {
        try {
            if (!forceRefresh) {
                const cached = await AsyncStorage.getItem(CAMPAIGNS_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    api.getCampaigns(true).catch(() => { }); // Background refresh
                    return { data: parsed, fromCache: true };
                }
            }

            const response = await apiClient.get('/campaigns');
            const data = response.data?.data || response.data?.campaigns || response.data;

            if (Array.isArray(data)) {
                await AsyncStorage.setItem(CAMPAIGNS_CACHE_KEY, JSON.stringify(data));
            }
            console.log("campaigns data", data);
            return { data, fromCache: false };
        } catch (error: any) {
            console.error('Get Campaigns Error:', error);
            const cached = await AsyncStorage.getItem(CAMPAIGNS_CACHE_KEY);
            if (cached) {
                return { data: JSON.parse(cached), fromCache: true, error: true };
            }
            throw error;
        }
    },

    refreshCampaigns: async () => {
        const res = await api.getCampaigns(true);
        return res.data;
    },

    getCallLogs: async (forceRefresh = false) => {
        try {
            if (!forceRefresh) {
                const cached = await AsyncStorage.getItem(CALL_LOGS_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Only background refresh if we have a token to avoid 401 spam
                    AsyncStorage.getItem('token').then(t => {
                        if (t) api.getCallLogs(true).catch(() => { });
                    });
                    return { data: parsed, fromCache: true };
                }
            }

            // Explicit check before network call
            const token = await AsyncStorage.getItem('token');
            if (!token) return { data: [], fromCache: false, error: 'Unauthorized' };

            const response = await apiClient.get('/calls/call-logs');
            const data = response.data;
            if (data?.success || Array.isArray(data)) {
                await AsyncStorage.setItem(CALL_LOGS_CACHE_KEY, JSON.stringify(data));
            }
            return { data, fromCache: false };
        } catch (error: any) {
            console.error('Call Logs Fetch Error:', error.response?.data || error.message);
            const cached = await AsyncStorage.getItem(CALL_LOGS_CACHE_KEY);
            if (cached) {
                return { data: JSON.parse(cached), fromCache: true, error: true };
            }
            throw error;
        }
    },

    refreshCallLogs: async () => {
        const res = await api.getCallLogs(true);
        return res.data;
    },

    createLead: async (data: { firstName: string; lastName: string; phone: string; campaign: string; date?: string }) => {
        try {
            const response = await apiClient.post('/leads/create-and-assign', data);
            return response.data;
        } catch (error: any) {
            console.error('Create Lead Error:', error);
            throw error;
        }
    },

    assignSelf: async (leadId: string, phone: string) => {
        try {
            const response = await apiClient.post('/leads/assign-self', { leadId, phone });
            return response.data;
        } catch (error: any) {
            console.error('Assign Self Error:', error);
            throw error;
        }
    },

    checkHealth: async () => {
        try {
            const response = await apiClient.get('/health');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    },

    getCallReports: async (startDate?: string, endDate?: string) => {
        try {
            const response = await apiClient.get('/calls/reports', {
                params: { start: startDate, end: endDate }
            });
            return response.data;
        } catch (error: any) {
            console.error('Report Fetch Error:', error.response?.data || error.message);
            throw error;
        }
    },

    getProfile: async () => {
        try {
            const response = await apiClient.get('/users/current/profile');
            return response.data;
        } catch (error: any) {
            console.error('Profile Fetch Error:', error.response?.data || error.message);
            throw error;
        }
    },

    // Removed redundant getAssigned (use LeadsService instead)

    getLeadById: async (id: string) => {
        try {
            const response = await apiClient.get('/leads/getLeadbyid', { params: { id } });
            return response.data?.data || response.data?.lead || response.data;
        } catch (error: any) {
            console.error('Get Lead Error:', error.response?.data || error.message);
            throw error;
        }
    },
};
