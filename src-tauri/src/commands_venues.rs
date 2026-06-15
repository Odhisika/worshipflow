use tauri::State;
use crate::AppState;
use crate::models::{
    Venue, CreateVenueRequest, UpdateVenueRequest,
    VenueBooking, CreateVenueBookingRequest,
};
use crate::repositories::VenueRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_venues(
    state: State<'_, AppState>,
    active_only: bool,
) -> AppResult<Vec<Venue>> {
    let conn = state.db.lock().unwrap();
    VenueRepository::get_venues(&conn, active_only).map_err(Into::into)
}

#[tauri::command]
pub async fn create_venue(
    state: State<'_, AppState>,
    request: CreateVenueRequest,
) -> AppResult<Venue> {
    let conn = state.db.lock().unwrap();
    VenueRepository::create_venue(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_venue(
    state: State<'_, AppState>,
    id: String,
    request: UpdateVenueRequest,
) -> AppResult<Venue> {
    let conn = state.db.lock().unwrap();
    VenueRepository::update_venue(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_venue(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    VenueRepository::delete_venue(&conn, &id).map_err(Into::into)
}

// --- Venue Bookings ---
#[tauri::command]
pub async fn get_venue_bookings(
    state: State<'_, AppState>,
    venue_id: Option<String>,
    booking_date: Option<String>,
) -> AppResult<Vec<VenueBooking>> {
    let conn = state.db.lock().unwrap();
    VenueRepository::get_bookings(&conn, venue_id.as_deref(), booking_date.as_deref()).map_err(Into::into)
}

#[tauri::command]
pub async fn create_venue_booking(
    state: State<'_, AppState>,
    request: CreateVenueBookingRequest,
) -> AppResult<VenueBooking> {
    let conn = state.db.lock().unwrap();
    VenueRepository::create_booking(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_booking_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    VenueRepository::update_booking_status(&conn, &id, &status).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_venue_booking(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    VenueRepository::delete_booking(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn get_venues_and_bookings(
    state: State<'_, AppState>,
    booking_date: String,
) -> AppResult<Vec<VenueBooking>> {
    let conn = state.db.lock().unwrap();
    VenueRepository::get_bookings(&conn, None, Some(&booking_date)).map_err(Into::into)
}
