import { invoke } from '@tauri-apps/api/core';

export interface Reminder {
    id: string;
    reminder_type: string;
    title: string;
    description?: string;
    reference_type?: string;
    reference_id?: string;
    scheduled_date: string;
    is_sent: boolean;
    sent_at?: string;
    created_at: string;
}

export interface UpcomingBirthday {
    member_id: string;
    member_name: string;
    dob: string;
    age: number;
    days_until: number;
}

export interface UpcomingAnniversary {
    member_id: string;
    member_name: string;
    joined_at: string;
    years: number;
    days_until: number;
}

export const reminderApi = {
    getReminders: (reminderType?: string) => invoke<Reminder[]>('get_reminders', { reminderType: reminderType || null }),
    createReminder: (reminderType: string, title: string, description?: string, referenceType?: string, referenceId?: string, scheduledDate?: string) =>
        invoke<Reminder>('create_reminder', { reminderType, title, description: description || null, referenceType: referenceType || null, referenceId: referenceId || null, scheduledDate }),
    deleteReminder: (id: string) => invoke<void>('delete_reminder', { id }),

    getUpcomingBirthdays: (daysAhead: number = 30) => invoke<UpcomingBirthday[]>('get_upcoming_birthdays', { daysAhead }),
    getUpcomingAnniversaries: (daysAhead: number = 30) => invoke<UpcomingAnniversary[]>('get_upcoming_anniversaries', { daysAhead }),
};
