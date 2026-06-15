import { invoke } from '@tauri-apps/api/core';

export interface Announcement {
    id: string;
    title: string;
    content: string;
    category?: string;
    priority?: string;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateAnnouncementRequest {
    title: string;
    content: string;
    category?: string;
    priority?: string;
    start_date: string;
    end_date?: string;
}

export interface UpdateAnnouncementRequest {
    title?: string;
    content?: string;
    category?: string;
    priority?: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
}

export const announcementApi = {
    getAnnouncements: (activeOnly: boolean = false) => invoke<Announcement[]>('get_announcements', { activeOnly }),
    createAnnouncement: (request: CreateAnnouncementRequest) => invoke<Announcement>('create_announcement', { request }),
    updateAnnouncement: (id: string, request: UpdateAnnouncementRequest) => invoke<Announcement>('update_announcement', { id, request }),
    deleteAnnouncement: (id: string) => invoke<void>('delete_announcement', { id }),
};
