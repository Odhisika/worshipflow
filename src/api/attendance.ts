import { invoke } from '@tauri-apps/api/core';

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface AttendanceRecord {
    id: string;
    service_id: string;
    member_id: string;
    status: AttendanceStatus;
    created_at: string;
    member_name?: string;
}

export interface MarkAttendanceRequest {
    service_id: string;
    member_id: string;
    status: AttendanceStatus;
}

export interface ServiceAttendanceSummary {
    service_id: string;
    service_title: string;
    service_date: string;
    total_present: number;
    total_absent: number;
    total_excused: number;
    total_members: number;
}

export interface MemberAttendanceRecord {
    member_id: string;
    member_name: string;
    status: AttendanceStatus | null;
    role: string;
}

export const attendanceApi = {
    markAttendance: async (request: MarkAttendanceRequest): Promise<AttendanceRecord> => {
        return await invoke('mark_attendance', { request });
    },
    unmarkAttendance: async (serviceId: string, memberId: string): Promise<void> => {
        return await invoke('unmark_attendance', { serviceId, memberId });
    },
    getServiceAttendance: async (serviceId: string): Promise<AttendanceRecord[]> => {
        return await invoke('get_service_attendance', { serviceId });
    },
    getAllMemberAttendanceForService: async (serviceId: string): Promise<MemberAttendanceRecord[]> => {
        return await invoke('get_all_member_attendance_for_service', { serviceId });
    },
    getAttendanceSummary: async (serviceId: string): Promise<ServiceAttendanceSummary> => {
        return await invoke('get_attendance_summary', { serviceId });
    },
};
