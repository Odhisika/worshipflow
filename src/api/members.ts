import { invoke } from '@tauri-apps/api/core';

export type MemberRole = 'member' | 'youth_leader' | 'mens_leader' | 'deacon' | 'pastor';
export type MemberStatus = 'active' | 'suspended';

export interface Member {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    address?: string;
    dob?: string;
    gender?: string;
    hometown?: string;
    occupation?: string;
    is_baptized: boolean;
    marital_status?: string;
    emergency_contact?: string;
    role: MemberRole;
    status: MemberStatus;
    ministry?: string;
    joined_at?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateMemberRequest {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    address?: string;
    dob?: string;
    gender?: string;
    hometown?: string;
    occupation?: string;
    is_baptized?: boolean;
    marital_status?: string;
    emergency_contact?: string;
    role?: MemberRole;
    ministry?: string;
}

export interface UpdateMemberRequest {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    dob?: string;
    gender?: string;
    hometown?: string;
    occupation?: string;
    is_baptized?: boolean;
    marital_status?: string;
    emergency_contact?: string;
    role?: MemberRole;
    status?: MemberStatus;
    ministry?: string;
}

export const memberApi = {
    getMembers: () => invoke<Member[]>('get_members'),
    getMemberById: (id: string) => invoke<Member>('get_member_by_id', { id }),
    createMember: (request: CreateMemberRequest) => invoke<Member>('create_member', { request }),
    updateMember: (id: string, request: UpdateMemberRequest) => invoke<Member>('update_member', { id, request }),
    deleteMember: (id: string) => invoke<void>('delete_member', { id }),
    promoteMember: (id: string, role: MemberRole) => invoke<Member>('promote_member', { id, role }),
    suspendMember: (id: string) => invoke<Member>('suspend_member', { id }),
    activateMember: (id: string) => invoke<Member>('activate_member', { id }),
};
