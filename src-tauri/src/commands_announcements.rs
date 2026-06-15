use tauri::State;
use crate::AppState;
use crate::models::{Announcement, CreateAnnouncementRequest, UpdateAnnouncementRequest};
use crate::repositories::AnnouncementRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_announcements(
    state: State<'_, AppState>,
    active_only: bool,
) -> AppResult<Vec<Announcement>> {
    let conn = state.db.lock().unwrap();
    AnnouncementRepository::get_announcements(&conn, active_only).map_err(Into::into)
}

#[tauri::command]
pub async fn create_announcement(
    state: State<'_, AppState>,
    request: CreateAnnouncementRequest,
) -> AppResult<Announcement> {
    let conn = state.db.lock().unwrap();
    AnnouncementRepository::create_announcement(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_announcement(
    state: State<'_, AppState>,
    id: String,
    request: UpdateAnnouncementRequest,
) -> AppResult<Announcement> {
    let conn = state.db.lock().unwrap();
    AnnouncementRepository::update_announcement(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_announcement(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    AnnouncementRepository::delete_announcement(&conn, &id).map_err(Into::into)
}
