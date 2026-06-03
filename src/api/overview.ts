import { invoke } from '@tauri-apps/api/core';

export interface SystemStats {
    total_members: number;
    members_growth: number;
    weekly_giving: number;
    giving_trend: number;
    upcoming_events: number;
    next_event_title: string;
    active_groups: number;
    total_participants: number;
}

export interface RecentActivity {
    id: string;
    name: string;
    action: string;
    time: string;
    type: 'member' | 'finance' | 'event' | 'group';
}

export const overviewApi = {
    getSystemStats: () => invoke<SystemStats>('get_system_stats'),
    getRecentActivity: () => invoke<RecentActivity[]>('get_recent_activity'),
};
