import { invoke } from '@tauri-apps/api/core';

export interface Event {
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    category?: string;
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
}

export interface UpdateEventRequest {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    category?: string;
}

export const eventsApi = {
    createEvent: (request: CreateEventRequest) => invoke<Event>('create_event', { request }),
    getAllEvents: () => invoke<Event[]>('get_all_events'),
    getEventById: (id: string) => invoke<Event>('get_event_by_id', { id }),
    updateEvent: (id: string, request: UpdateEventRequest) => invoke<Event>('update_event', { id, request }),
    deleteEvent: (id: string) => invoke<void>('delete_event', { id }),
};
