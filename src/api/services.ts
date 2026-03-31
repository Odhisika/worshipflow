import { invoke } from '@tauri-apps/api/tauri';

export interface Service {
    id: string;
    title: string;
    date: string;
    theme?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateServiceRequest {
    title: string;
    date: string;
    theme?: string;
    notes?: string;
}

export const serviceApi = {
    createService: (request: CreateServiceRequest) => invoke<Service>('create_service', { request }),
    getService: (id: string) => invoke<Service>('get_service', { id }),
    getAllServices: () => invoke<Service[]>('get_all_services'),
    updateService: (id: string, request: CreateServiceRequest) => invoke<Service>('update_service', { id, request }),
    deleteService: (id: string) => invoke<void>('delete_service', { id }),
};
