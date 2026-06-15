import { invoke } from '@tauri-apps/api/core';

export interface Visitation {
    id: string;
    member_id?: string;
    visitor_id?: string;
    visitation_date: string;
    visitation_type: string;
    notes?: string;
    conducted_by?: string;
    follow_up_needed: boolean;
    follow_up_date?: string;
    created_at: string;
    person_name?: string;
}

export interface CreateVisitationRequest {
    member_id?: string;
    visitation_date: string;
    visitation_type?: string;
    notes?: string;
    conducted_by?: string;
    follow_up_needed?: boolean;
    follow_up_date?: string;
}

export interface PrayerRequest {
    id: string;
    member_id?: string;
    visitor_id?: string;
    request: string;
    is_anonymous: boolean;
    category?: string;
    status: string;
    prayed_for_date?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    requester_name?: string;
}

export interface CreatePrayerRequestRequest {
    member_id?: string;
    request: string;
    is_anonymous?: boolean;
    category?: string;
    notes?: string;
}

export interface CounsellingSession {
    id: string;
    member_id: string;
    session_date: string;
    session_type: string;
    notes?: string;
    is_confidential: boolean;
    conducted_by?: string;
    follow_up_date?: string;
    status: string;
    created_at: string;
    updated_at: string;
    member_name?: string;
}

export interface CreateCounsellingSessionRequest {
    member_id: string;
    session_date: string;
    session_type: string;
    notes?: string;
    is_confidential?: boolean;
    conducted_by?: string;
    follow_up_date?: string;
}

export const pastoralApi = {
    // Visitations
    getVisitations: () => invoke<Visitation[]>('get_visitations'),
    createVisitation: (request: CreateVisitationRequest) => invoke<Visitation>('create_visitation', { request }),
    deleteVisitation: (id: string) => invoke<void>('delete_visitation', { id }),

    // Prayer Requests
    getPrayerRequests: () => invoke<PrayerRequest[]>('get_prayer_requests'),
    createPrayerRequest: (request: CreatePrayerRequestRequest) => invoke<PrayerRequest>('create_prayer_request', { request }),
    updatePrayerStatus: (id: string, status: string) => invoke<PrayerRequest>('update_prayer_status', { id, status }),
    deletePrayerRequest: (id: string) => invoke<void>('delete_prayer_request', { id }),

    // Counselling Sessions
    getCounsellingSessions: () => invoke<CounsellingSession[]>('get_counselling_sessions'),
    createCounsellingSession: (request: CreateCounsellingSessionRequest) => invoke<CounsellingSession>('create_counselling_session', { request }),
    deleteCounsellingSession: (id: string) => invoke<void>('delete_counselling_session', { id }),
};
