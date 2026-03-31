use crate::error::AppResult;
use crate::models::{Event, CreateEventRequest, UpdateEventRequest};
use crate::repositories::EventRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_event(
    state: State<'_, AppState>,
    request: CreateEventRequest,
) -> AppResult<Event> {
    let conn = state.db.lock().unwrap();
    EventRepository::create(&conn, request)
}

#[tauri::command]
pub async fn get_all_events(
    state: State<'_, AppState>,
) -> AppResult<Vec<Event>> {
    let conn = state.db.lock().unwrap();
    EventRepository::get_all(&conn)
}

#[tauri::command]
pub async fn get_event_by_id(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Event> {
    let conn = state.db.lock().unwrap();
    EventRepository::get_by_id(&conn, &id)
}

#[tauri::command]
pub async fn update_event(
    state: State<'_, AppState>,
    id: String,
    request: UpdateEventRequest,
) -> AppResult<Event> {
    let conn = state.db.lock().unwrap();
    EventRepository::update(&conn, &id, request)
}

#[tauri::command]
pub async fn delete_event(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    EventRepository::delete(&conn, &id)
}
