import { invoke } from '@tauri-apps/api/core';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
}

export interface Song {
  id: string;
  title: string;
  lyrics: string;
  key?: string;
  tempo?: number;
  tags: string[];
  chords?: string;
  show_chords: boolean;
  arrangement?: string;
  collection_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSongRequest {
  title: string;
  lyrics: string;
  key?: string;
  tempo?: number;
  tags?: string[];
  chords?: string;
  show_chords?: boolean;
  arrangement?: string;
  collection_id?: string;
}

export interface Service {
  id: string;
  title: string;
  date: string;
  theme?: string;
  notes?: string;
  activities: Activity[];
  created_at: string;
  updated_at: string;
}

export interface CreateServiceRequest {
  title: string;
  date: string;
  theme?: string;
  notes?: string;
}

export interface Activity {
  id: string;
  service_id: string;
  name: string;
  duration_minutes: number;
  leader?: string;
  notes?: string;
  order_index: number;
  created_at: string;
}

export interface Slide {
  id: string;
  slide_type: 'text' | 'song' | 'bible' | 'image' | 'video' | 'audio' | 'announcement' | 'timer' | 'capture';
  title?: string;
  content: string;
  media_path?: string;
  background_path?: string;
  order_index: number;
  created_at: string;
}

export interface CreateActivityRequest {
  service_id: string;
  name: string;
  duration_minutes: number;
  leader?: string;
  notes?: string;
}

export interface SongExportData {
  title: string;
  lyrics: string;
  key?: string;
  tags: string[];
  chords?: string;
  show_chords: boolean;
  arrangement?: string;
  collection_id?: string;
}

// Song API
export const songApi = {
  create: (request: CreateSongRequest): Promise<Song> =>
    invoke('create_song', { request }),
  
  get: (id: string): Promise<Song> =>
    invoke('get_song', { id }),
  
  getAll: (): Promise<Song[]> =>
    invoke('get_all_songs'),
  
  search: (query: string): Promise<Song[]> =>
    invoke('search_songs', { query }),

  searchFts: (query: string): Promise<Song[]> =>
    invoke('search_songs_fts', { query }),
  
  update: (id: string, request: CreateSongRequest): Promise<Song> =>
    invoke('update_song', { id, request }),
  
  delete: (id: string): Promise<void> =>
    invoke('delete_song', { id }),
  
  importFromContent: (title: string, content: string, tags?: string[], collectionId?: string): Promise<Song> =>
    invoke('import_song_from_content', { title, content, tags, collectionId }),

  exportLibrary: (): Promise<SongExportData[]> =>
    invoke('export_songs_library'),
};

// Collection API
export const collectionApi = {
  create: (request: CreateCollectionRequest): Promise<Collection> =>
    invoke('create_collection', { request }),

  get: (id: string): Promise<Collection> =>
    invoke('get_collection', { id }),

  getAll: (): Promise<Collection[]> =>
    invoke('get_all_collections'),

  update: (id: string, request: CreateCollectionRequest): Promise<Collection> =>
    invoke('update_collection', { id, request }),

  delete: (id: string): Promise<void> =>
    invoke('delete_collection', { id }),

  getSongsByCollection: (collectionId: string): Promise<Song[]> =>
    invoke('get_songs_by_collection', { collectionId }),

  getUncategorized: (): Promise<Song[]> =>
    invoke('get_uncategorized_songs'),
};

// Service API
export const serviceApi = {
  create: (request: CreateServiceRequest): Promise<Service> =>
    invoke('create_service', { request }),
  
  get: (id: string): Promise<Service> =>
    invoke('get_service', { id }),
  
  getAll: (): Promise<Service[]> =>
    invoke('get_all_services'),
  
  update: (id: string, request: CreateServiceRequest): Promise<Service> =>
    invoke('update_service', { id, request }),
  
  delete: (id: string): Promise<void> =>
    invoke('delete_service', { id }),
};

// Activity API
export const activityApi = {
  create: (request: CreateActivityRequest): Promise<Activity> =>
    invoke('create_activity', { request }),
  
  get: (id: string): Promise<Activity> =>
    invoke('get_activity', { id }),
  
  getByService: (serviceId: string): Promise<Activity[]> =>
    invoke('get_service_activities', { serviceId }),
  
  update: (id: string, request: CreateActivityRequest): Promise<Activity> =>
    invoke('update_activity', { id, request }),
  
  reorder: (serviceId: string, activityIds: string[]): Promise<void> =>
    invoke('reorder_activities', { serviceId, activityIds }),
  
  delete: (id: string): Promise<void> =>
    invoke('delete_activity', { id }),
};
