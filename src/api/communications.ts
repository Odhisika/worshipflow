import { invoke } from '@tauri-apps/api/core';

export interface Campaign {
    id: string;
    name: string;
    campaign_type: 'Email' | 'SMS';
    content: string;
    recipient_count: number;
    open_rate: number;
    click_rate: number;
    status: 'Draft' | 'Sent' | 'Scheduled';
    scheduled_at?: string;
    sent_at?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateCampaignRequest {
    name: string;
    campaign_type: 'Email' | 'SMS';
    content: string;
    scheduled_at?: string;
}

export interface SubscriberStats {
    email_subscribers: number;
    sms_subscribers: number;
    avg_open_rate: number;
}

export const communicationsApi = {
    createCampaign: (request: CreateCampaignRequest) => invoke<Campaign>('create_campaign', { request }),
    getCampaigns: () => invoke<Campaign[]>('get_campaigns'),
    getSubscriberStats: () => invoke<SubscriberStats>('get_subscriber_stats'),
    deleteCampaign: (id: string) => invoke<void>('delete_campaign', { id }),
};
