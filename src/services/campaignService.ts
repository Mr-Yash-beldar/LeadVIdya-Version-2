import { api } from './api';
import apiClient from './apiClient';
import { Campaign, CampaignDetailResponse } from '../types/Campaign';
import { Lead } from '../types/Lead';

export const campaignService = {
    getCampaigns: async (params: { page?: number; limit?: number; search?: string } = {}, forceRefresh = false): Promise<Campaign[]> => {
        try {
            const res = await api.getCampaigns(params, forceRefresh);
            const data = res.data;
            
            if (Array.isArray(data)) {
                return data;
            } else if (data && Array.isArray(data.campaigns)) {
                return data.campaigns;
            } else if (data && Array.isArray(data.data)) {
                return data.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            throw error;
        }
    },

    getCampaignDetails: async (id: string): Promise<CampaignDetailResponse> => {
        try {
            const response = await apiClient.get<CampaignDetailResponse>(`/campaigns/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching campaign details for ${id}:`, error);
            throw error;
        }
    }
};
