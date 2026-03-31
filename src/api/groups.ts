import { invoke } from '@tauri-apps/api/tauri';

export interface Group {
    id: string;
    name: string;
    description?: string;
    meeting_day?: string;
    meeting_time?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateGroupRequest {
    name: string;
    description?: string;
    meeting_day?: string;
    meeting_time?: string;
}

export interface UpdateGroupRequest {
    name?: string;
    description?: string;
    meeting_day?: string;
    meeting_time?: string;
}

export interface GroupMember {
    id: string;
    group_id: string;
    member_id: string;
    role: string;
    joined_at: string;
    member_name?: string;
    group_name?: string;
}

export interface AddMemberToGroupRequest {
    group_id: string;
    member_id: string;
    role: string;
}

export const groupApi = {
    getGroups: () => invoke<Group[]>('get_groups'),
    getGroupById: (id: string) => invoke<Group>('get_group_by_id', { id }),
    createGroup: (request: CreateGroupRequest) => invoke<Group>('create_group', { request }),
    updateGroup: (id: string, request: UpdateGroupRequest) => invoke<Group>('update_group', { id, request }),
    deleteGroup: (id: string) => invoke<void>('delete_group', { id }),

    addGroupMember: (request: AddMemberToGroupRequest) => invoke<GroupMember>('add_member_to_group', { request }),
    removeGroupMember: (groupMemberId: string) => invoke<void>('remove_member_from_group', { groupMemberId }),
    getGroupMembers: (groupId: string) => invoke<GroupMember[]>('get_group_members', { groupId }),
};
