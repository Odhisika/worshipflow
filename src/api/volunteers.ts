import { invoke } from '@tauri-apps/api/tauri';

export interface VolunteerRole {
    id: string;
    name: string;
    description?: string;
    required_count: number;
    created_at: string;
}

export interface VolunteerAssignment {
    id: string;
    role_id: string;
    role_name: string;
    member_id: string;
    member_name: string;
    service_id: string;
    status: 'Confirmed' | 'Pending' | 'Declined';
}

export const volunteersApi = {
    getVolunteerRoles: () => invoke<VolunteerRole[]>('get_volunteer_roles'),
    getVolunteerAssignments: (serviceId: string) => invoke<VolunteerAssignment[]>('get_volunteer_assignments', { serviceId }),
    assignVolunteer: (roleId: string, memberId: string, serviceId: string) =>
        invoke<void>('assign_volunteer', { roleId, memberId, serviceId }),
    createVolunteerRole: (name: string, description: string | undefined, requiredCount: number) =>
        invoke<VolunteerRole>('create_volunteer_role', { name, description, requiredCount }),
};
