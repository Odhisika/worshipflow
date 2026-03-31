import { invoke } from "@tauri-apps/api/tauri";

export interface CheckIn {
    id: string;
    member_id: string;
    service_id?: string;
    event_id?: string;
    location?: string;
    check_in_time: string;
    check_out_time?: string;
    security_code: string;
    status: 'active' | 'completed';
    created_at: string;
    member_name?: string;
    service_title?: string;
}

export interface MemberRelationship {
    id: string;
    child_id: string;
    guardian_id: string;
    relationship_type: string;
    created_at: string;
    child_name?: string;
    guardian_name?: string;
}

export interface CheckInRequest {
    member_id: string;
    service_id?: string;
    event_id?: string;
    location?: string;
}

export interface CheckOutRequest {
    check_in_id: string;
    security_code: string;
}

export interface CreateRelationshipRequest {
    child_id: string;
    guardian_id: string;
    relationship_type: string;
}

export const checkInApi = {
    getActiveCheckins: () => invoke<CheckIn[]>("get_active_checkins"),

    checkInChild: (req: CheckInRequest) => invoke<CheckIn>("check_in_child", { req }),

    checkOutChild: (req: CheckOutRequest) => invoke<boolean>("check_out_child", { req }),

    createRelationship: (req: CreateRelationshipRequest) =>
        invoke<MemberRelationship>("create_relationship", { req }),

    getMemberRelationships: (memberId: string) =>
        invoke<MemberRelationship[]>("get_member_relationships", { memberId })
};
