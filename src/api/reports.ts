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

export interface ServiceAttendanceSummary {
    service_id: string;
    service_title: string;
    service_date: string;
    total_present: number;
    total_absent: number;
    total_excused: number;
    total_members: number;
}

export const reportsApi = {
    getAnalyticsReport: () => invoke<AnalyticsReport>('get_analytics_report'),
};
