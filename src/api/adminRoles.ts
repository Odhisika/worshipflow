import { invoke } from '@tauri-apps/api/core';

export interface AdminRole {
    id: string;
    admin_id: string;
    role: string;
    permissions?: string;
    created_at: string;
}

export interface UpdateAdminRoleRequest {
    admin_id: string;
    role: string;
    permissions?: string;
}

export const adminRoleApi = {
    getAdminRoles: () => invoke<AdminRole[]>('get_admin_roles'),
    setAdminRole: (request: UpdateAdminRoleRequest) => invoke<AdminRole>('set_admin_role', { request }),
    getAdminRole: (adminId: string) => invoke<AdminRole>('get_admin_role', { adminId }),
};
