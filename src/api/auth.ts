import { invoke } from '@tauri-apps/api/core';

export interface AdminUser {
    id: string;
    email: string;
    created_at: string;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
}

export interface ChangeEmailRequest {
    password: string;
    new_email: string;
}

export const authApi = {
    login: async (email: string, password: string): Promise<AdminUser> => {
        return await invoke('login_admin', {
            request: { email, password }
        });
    },

    changePassword: async (request: ChangePasswordRequest): Promise<string> => {
        return await invoke('change_admin_password', { request });
    },

    changeEmail: async (request: ChangeEmailRequest): Promise<string> => {
        return await invoke('change_admin_email', { request });
    },
};
