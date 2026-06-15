import { invoke } from '@tauri-apps/api/core';

export interface Venue {
    id: string;
    name: string;
    capacity?: number;
    location?: string;
    description?: string;
    facilities?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateVenueRequest {
    name: string;
    capacity?: number;
    location?: string;
    description?: string;
    facilities?: string;
}

export interface UpdateVenueRequest {
    name?: string;
    capacity?: number;
    location?: string;
    description?: string;
    facilities?: string;
    is_active?: boolean;
}

export interface VenueBooking {
    id: string;
    venue_id: string;
    event_id?: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    booked_by?: string;
    purpose?: string;
    status: string;
    created_at: string;
    venue_name?: string;
    event_title?: string;
}

export interface CreateVenueBookingRequest {
    venue_id: string;
    event_id?: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    booked_by?: string;
    purpose?: string;
}

export const venueApi = {
    getVenues: (activeOnly: boolean = false) => invoke<Venue[]>('get_venues', { activeOnly }),
    createVenue: (request: CreateVenueRequest) => invoke<Venue>('create_venue', { request }),
    updateVenue: (id: string, request: UpdateVenueRequest) => invoke<Venue>('update_venue', { id, request }),
    deleteVenue: (id: string) => invoke<void>('delete_venue', { id }),

    getVenueBookings: (venueId?: string, bookingDate?: string) => invoke<VenueBooking[]>('get_venue_bookings', { venueId: venueId || null, bookingDate: bookingDate || null }),
    createVenueBooking: (request: CreateVenueBookingRequest) => invoke<VenueBooking>('create_venue_booking', { request }),
    updateBookingStatus: (id: string, status: string) => invoke<void>('update_booking_status', { id, status }),
    deleteVenueBooking: (id: string) => invoke<void>('delete_venue_booking', { id }),
};
