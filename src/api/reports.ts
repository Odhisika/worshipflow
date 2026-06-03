import { invoke } from '@tauri-apps/api/core';

export interface AttendanceTrend {
    month: string;
    count: number;
}

export interface GivingSummary {
    category: string;
    total: number;
}

export interface GrowthMetric {
    period: string;
    new_members: number;
}

export interface AnalyticsReport {
    attendance_trends: AttendanceTrend[];
    giving_summaries: GivingSummary[];
    growth_metrics: GrowthMetric[];
}

export const reportsApi = {
    getAnalyticsReport: () => invoke<AnalyticsReport>('get_analytics_report'),
};
