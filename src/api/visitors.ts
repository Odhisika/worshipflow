import { invoke } from '@tauri-apps/api/core';

export interface Visitor {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    address?: string;
    gender?: string;
    age_group?: string;
    visited_date: string;
    service_id?: string;
    heard_from?: string;
    prayer_need?: string;
    interest?: string;
    status: string;
    converted_member_id?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateVisitorRequest {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    address?: string;
    gender?: string;
    age_group?: string;
    visited_date: string;
    service_id?: string;
    heard_from?: string;
    prayer_need?: string;
    interest?: string;
}

export interface UpdateVisitorRequest {
    status?: string;
    converted_member_id?: string;
    email?: string;
    phone?: string;
    interest?: string;
}

export interface VisitorFollowup {
    id: string;
    visitor_id: string;
    followup_date: string;
    notes?: string;
    status: string;
    assigned_to?: string;
    created_at: string;
    visitor_name?: string;
}

export interface CreateVisitorFollowupRequest {
    visitor_id: string;
    followup_date: string;
    notes?: string;
    assigned_to?: string;
}

export const visitorApi = {
    getVisitors: () => invoke<Visitor[]>('get_visitors'),
    getVisitorById: (id: string) => invoke<Visitor>('get_visitor_by_id', { id }),
    createVisitor: (request: CreateVisitorRequest) => invoke<Visitor>('create_visitor', { request }),
    updateVisitor: (id: string, request: UpdateVisitorRequest) => invoke<Visitor>('update_visitor', { id, request }),
    deleteVisitor: (id: string) => invoke<void>('delete_visitor', { id }),

    getVisitorFollowups: (visitorId: string) => invoke<VisitorFollowup[]>('get_visitor_followups', { visitorId }),
    createVisitorFollowup: (request: CreateVisitorFollowupRequest) => invoke<VisitorFollowup>('create_visitor_followup', { request }),
    updateFollowupStatus: (id: string, status: string) => invoke<void>('update_followup_status', { id, status }),
    deleteVisitorFollowup: (id: string) => invoke<void>('delete_visitor_followup', { id }),
};
