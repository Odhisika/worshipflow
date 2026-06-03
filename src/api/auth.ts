import { invoke } from '@tauri-apps/api/core';

export interface AdminUser {
    id: string;
    email: string;
    created_at: string;
}

export const authApi = {
    login: async (email: string, password: string): Promise<AdminUser> => {
        return await invoke('login_admin', {
            request: { email, password }
        });
    },
};
