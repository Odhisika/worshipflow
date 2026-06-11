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
    payment_method?: string;
    notes?: string;
    created_at: string;
    type_name?: string;
    member_name?: string;
}

export interface CreateContributionRequest {
    type_id: string;
    member_id?: string;
    amount: number;
    date: string;
    payment_method?: string;
    notes?: string;
}

export interface UpdateContributionRequest {
    type_id?: string;
    member_id?: string;
    amount?: number;
    date?: string;
    payment_method?: string;
    notes?: string;
}

export interface Pledge {
    id: string;
    member_id: string;
    category: string;
    amount_promised: number;
    amount_paid: number;
    due_date?: string;
    status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    member_name?: string;
}

export interface CreatePledgeRequest {
    member_id: string;
    category: string;
    amount_promised: number;
    due_date?: string;
    notes?: string;
}

export interface UpdatePledgeRequest {
    amount_promised?: number;
    amount_paid?: number;
    due_date?: string;
    status?: string;
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

export interface MonthlyGivingTrend {
    month: string;
    tithes: number;
    offerings: number;
    pledges: number;
}

export interface YearComparison {
    current_year: string;
    previous_year: string;
    current_total: number;
    previous_total: number;
    change_pct: number;
}

export const financeApi = {
    // Giving Types
    getGivingTypes: () => invoke<GivingType[]>('get_giving_types'),
    createGivingType: (request: CreateGivingTypeRequest) => invoke<GivingType>('create_giving_type', { request }),
    updateGivingType: (id: string, request: UpdateGivingTypeRequest) => invoke<GivingType>('update_giving_type', { id, request }),
    deleteGivingType: (id: string) => invoke<void>('delete_giving_type', { id }),

    // Contributions
    getContributions: (limit: number, offset: number, dateFrom?: string, dateTo?: string) =>
        invoke<Contribution[]>('get_contributions', { limit, offset, dateFrom: dateFrom || null, dateTo: dateTo || null }),
    addContribution: (request: CreateContributionRequest) => invoke<Contribution>('add_contribution', { request }),
    updateContribution: (id: string, request: UpdateContributionRequest) => invoke<Contribution>('update_contribution', { id, request }),
    deleteContribution: (id: string) => invoke<void>('delete_contribution', { id }),

    // Pledges
    getPledges: () => invoke<Pledge[]>('get_pledges'),
    createPledge: (request: CreatePledgeRequest) => invoke<Pledge>('create_pledge', { request }),
    updatePledge: (id: string, request: UpdatePledgeRequest) => invoke<Pledge>('update_pledge', { id, request }),
    addPledgePayment: (id: string, amount: number) => invoke<Pledge>('add_pledge_payment', { id, amount }),
    deletePledge: (id: string) => invoke<void>('delete_pledge', { id }),

    // Stats & Summaries
    getDashboardStats: (yearMonthPrefix: string) => invoke<FinanceDashboardStats>('get_dashboard_stats', { yearMonthPrefix }),
    getMemberTitheSummary: (yearMonthPrefix: string) => invoke<MemberTitheSummary[]>('get_member_tithe_summary', { yearMonthPrefix }),
    getMonthlyGivingTrends: (months: number) => invoke<MonthlyGivingTrend[]>('get_monthly_giving_trends', { months }),
    getYearComparison: () => invoke<YearComparison>('get_year_comparison'),
    getMemberStatement: (memberId: string, year: string) => invoke<Contribution[]>('get_member_statement', { memberId, year }),
};
