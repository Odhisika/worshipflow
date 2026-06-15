import { invoke } from '@tauri-apps/api/core';

export interface AuditLog {
    id: string;
    user_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    old_values?: string;
    new_values?: string;
    ip_address?: string;
    created_at: string;
}

export const auditApi = {
    getAuditLogs: (limit: number = 100, entityType?: string) => invoke<AuditLog[]>('get_audit_logs', { limit, entityType: entityType || null }),
    clearAuditLogs: (beforeDate?: string) => invoke<void>('clear_audit_logs', { beforeDate: beforeDate || null }),
};
