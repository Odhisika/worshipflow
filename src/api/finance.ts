import { invoke } from '@tauri-apps/api/core';

export interface GivingType {
    id: string;
    name: string;
    description?: string;
    is_system: boolean;
    created_at: string;
}

export interface CreateGivingTypeRequest {
    name: string;
    description?: string;
}

export interface UpdateGivingTypeRequest {
    name?: string;
    description?: string;
}

export interface Contribution {
    id: string;
    type_id: string;
    member_id?: string;
    amount: number;
    date: string;
    notes?: string;
    created_at: string;

    // Joined fields
    type_name?: string;
    member_name?: string;
}

export interface CreateContributionRequest {
    type_id: string;
    member_id?: string;
    amount: number;
    date: string;
    notes?: string;
}

export interface FinanceDashboardStats {
    total_offerings: number;
    total_tithes: number;
    total_pledges: number;
}

export interface MemberTitheSummary {
    member_id: string;
    member_name: string;
    total_amount: number;
    month: string;
}

export const financeApi = {
    // Giving Types
    getGivingTypes: () => invoke<GivingType[]>('get_giving_types'),
    createGivingType: (request: CreateGivingTypeRequest) => invoke<GivingType>('create_giving_type', { request }),
    updateGivingType: (id: string, request: UpdateGivingTypeRequest) => invoke<GivingType>('update_giving_type', { id, request }),
    deleteGivingType: (id: string) => invoke<void>('delete_giving_type', { id }),

    // Contributions
    getContributions: (limit: number, offset: number) => invoke<Contribution[]>('get_contributions', { limit, offset }),
    addContribution: (request: CreateContributionRequest) => invoke<Contribution>('add_contribution', { request }),
    deleteContribution: (id: string) => invoke<void>('delete_contribution', { id }),

    // Stats & Summaries
    getDashboardStats: (yearMonthPrefix: string) => invoke<FinanceDashboardStats>('get_dashboard_stats', { yearMonthPrefix }),
    getMemberTitheSummary: (yearMonthPrefix: string) => invoke<MemberTitheSummary[]>('get_member_tithe_summary', { yearMonthPrefix }),
};
