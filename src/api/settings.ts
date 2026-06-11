import { invoke } from '@tauri-apps/api/core';

export interface AppConfig {
    church_name: string;
    church_address?: string;
    church_phone?: string;
    church_email?: string;
    church_logo?: string;
    currency: string;
    language: string;
    theme: string;
    checkin_proximity_enabled: boolean;
}

export interface UpdateSettingRequest {
    key: string;
    value: string;
}

export const settingsApi = {
    getAppConfig: () => invoke<AppConfig>('get_app_config'),
    updateSetting: (request: UpdateSettingRequest) => invoke<void>('update_setting', { request }),
    updateSettingsBatch: (settings: UpdateSettingRequest[]) => invoke<void>('update_settings_batch', { settings }),
};
