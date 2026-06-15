import { invoke } from '@tauri-apps/api/core';

export interface Event {
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    category?: string;
    is_recurring: boolean;
    recurrence_rule?: string;
    recurrence_end?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateEventRequest {
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    category?: string;
    is_recurring?: boolean;
    recurrence_rule?: string;
    recurrence_end?: string;
}

export interface UpdateEventRequest {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    category?: string;
    is_recurring?: boolean;
    recurrence_rule?: string;
    recurrence_end?: string;
}

export interface EventAttendance {
    id: string;
    event_id: string;
    member_id?: string;
    visitor_id?: string;
    status: string;
    check_in_time?: string;
    created_at: string;
    attendee_name?: string;
}

export interface MarkEventAttendanceRequest {
    event_id: string;
    member_id?: string;
    visitor_id?: string;
    status: string;
}

export const eventsApi = {
    createEvent: (request: CreateEventRequest) => invoke<Event>('create_event', { request }),
    getAllEvents: () => invoke<Event[]>('get_all_events'),
    getEventById: (id: string) => invoke<Event>('get_event_by_id', { id }),
    updateEvent: (id: string, request: UpdateEventRequest) => invoke<Event>('update_event', { id, request }),
    deleteEvent: (id: string) => invoke<void>('delete_event', { id }),

    getEventAttendance: (eventId: string) => invoke<EventAttendance[]>('get_event_attendance', { eventId }),
    markEventAttendance: (request: MarkEventAttendanceRequest) => invoke<EventAttendance>('mark_event_attendance', { request }),
    deleteEventAttendance: (id: string) => invoke<void>('delete_event_attendance', { id }),
};
