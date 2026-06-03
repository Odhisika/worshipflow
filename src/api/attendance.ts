import { invoke } from '@tauri-apps/api/core';

export interface AttendanceRecord {
    id: string;
    service_id: string;
    member_id: string;
    status: 'present' | 'absent' | 'excused';
    created_at: string;
    member_name?: string;
}

export interface MarkAttendanceRequest {
    service_id: string;
    member_id: string;
    status: 'present' | 'absent' | 'excused';
}

export interface ServiceAttendanceSummary {
    service_id: string;
    service_title: string;
    service_date: string;
    total_present: number;
    total_members: number;
}

export const attendanceApi = {
    markAttendance: async (request: MarkAttendanceRequest): Promise<AttendanceRecord> => {
        return await invoke('mark_attendance', { request });
    },

    getServiceAttendance: async (serviceId: string): Promise<AttendanceRecord[]> => {
        return await invoke('get_service_attendance', { serviceId });
    },

    getAttendanceSummary: async (serviceId: string): Promise<ServiceAttendanceSummary> => {
        return await invoke('get_attendance_summary', { serviceId });
    }
};
