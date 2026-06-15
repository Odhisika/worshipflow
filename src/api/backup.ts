import { invoke } from '@tauri-apps/api/core';

export interface BackupInfo {
    file_name: string;
    file_size: number;
    created_at: string;
}

export const backupApi = {
    backupDatabase: () => invoke<string>('backup_database'),
    restoreDatabase: (backupName: string) => invoke<string>('restore_database', { backupName }),
    listBackups: () => invoke<BackupInfo[]>('list_backups'),
};
