import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiClient from './apiClient';
import { Lead } from '../types/Lead';

const LEADS_CACHE_KEY = 'cached_assigned_leads';
const LEADS_CACHE_TS_KEY = 'cached_assigned_leads_ts';
const MIN_REFRESH_TTL_MS = 5 * 60 * 1000; // 5 minutes between background refreshes

export const LeadsService = {
    getAssignedLeads: async (page: number = 1, limit: number = 100, forceRefresh = false): Promise<Lead[]> => {
        try {
            // 1. Try cache if not forcing refresh
            if (!forceRefresh && page === 1) {
                const cached = await AsyncStorage.getItem(LEADS_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Background refresh ONLY if cache is older than MIN_REFRESH_TTL_MS
                    const tsRaw = await AsyncStorage.getItem(LEADS_CACHE_TS_KEY);
                    const lastTs = tsRaw ? parseInt(tsRaw, 10) : 0;
                    if (Date.now() - lastTs > MIN_REFRESH_TTL_MS) {
                        LeadsService.refreshLeads().catch(() => { });
                    }
                    return parsed;
                }
            }

            // 2. Network fetch
            const response = await apiClient.get<{ success: boolean; data: Lead[]; meta?: any }>('/leads/assigned', {
                params: { page, limit }
            });

            if (response.data.success) {
                const data = response.data.data;
                if (page === 1) {
                    await AsyncStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(data));
                }
                return data;
            }
            return [];
        } catch (error: any) {
            console.error('Error fetching assigned leads:', error.message);
            // On error, return cache if available for page 1
            if (page === 1) {
                const cached = await AsyncStorage.getItem(LEADS_CACHE_KEY);
                if (cached) return JSON.parse(cached);
            }
            return [];
        }
    },

    refreshLeads: async (): Promise<Lead[]> => {
        try {
            const response = await apiClient.get<{ success: boolean; data: Lead[]; meta?: any }>('/leads/assigned', {
                params: { page: 1, limit: 100 }
            });
            if (response.data.success) {
                const data = response.data.data;
                await AsyncStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(data));
                await AsyncStorage.setItem(LEADS_CACHE_TS_KEY, String(Date.now()));
                return data;
            }
            return [];
        } catch (error: any) {
            if (!error.message?.includes('Rate limited')) {
                console.error('Error refreshing leads cache:', error);
            }
            return [];
        }
    },

    updateLeadStatus: async (leadId: string, status: string, notes?: string) => {
        try {
            const response = await apiClient.put(`/leads/${leadId}`, { status, notes });
            return response.data;
        } catch (error) {
            console.error('Error updating lead:', error);
            throw error;
        }
    },

    updateLeadBySalesperson: async (data: any) => {
        try {
            const response = await apiClient.put('/leads/update-by-salesperson', data);
            return response.data;
        } catch (error) {
            console.error('Error updating lead by salesperson:', error);
            throw error;
        }
    },

    updateLeadDetails: async (leadId: string, data: { name: string; phone: string; alt_phone: string; email: string }) => {
        try {
            const response = await apiClient.put(`/leads/update-lead-by-salesperson/${leadId}`, data);
            return response.data;
        } catch (error) {
            console.error('Error updating lead details:', error);
            throw error;
        }
    },


    /**
     * Auto-posts a matched system call log to the backend.
     * Token is added automatically by apiClient interceptor.
     */
    postCallLog: async (data: {
        leadId: string;
        callTime: string;        // ISO string
        durationSeconds: number;
        callStatus: string;      // "completed" | "missed" | "rejected"
        callType: string;        // "incoming" | "outgoing" | "missed"
        notes?: string;
    }) => {
        const response = await apiClient.post('/calls', data);
        return response.data;
    },

    logCall: async (data: any) => {
        try {
            // If there's a local recording path, use FormData for file upload
            if (data.recordingLink && (data.recordingLink.startsWith('/') || data.recordingLink.startsWith('file://'))) {
                const formData = new FormData();

                // Add all existing fields to formData
                Object.keys(data).forEach(key => {
                    if (key !== 'recordingLink') {
                        formData.append(key, data[key]);
                    }
                });

                // Add the file
                const filePath = data.recordingLink.replace('file://', '');
                const fileName = filePath.split('/').pop() || 'recording.mp4';

                formData.append('recording', {
                    uri: Platform.OS === 'android' ? `file://${filePath}` : filePath,
                    type: 'audio/mp4', // Adjust type as needed
                    name: fileName,
                } as any);

                const response = await apiClient.post('/calls', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                return response.data;
            }

            // Fallback to regular JSON if no local file
            const response = await apiClient.post('/calls', data);
            return response.data;
        } catch (error) {
            console.error('Error logging call:', error);
            throw error;
        }
    }
};
