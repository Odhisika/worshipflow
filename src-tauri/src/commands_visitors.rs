use tauri::State;
use crate::AppState;
use crate::models::{
    Visitor, CreateVisitorRequest, UpdateVisitorRequest,
    VisitorFollowup, CreateVisitorFollowupRequest,
};
use crate::repositories::VisitorRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_visitors(state: State<'_, AppState>) -> AppResult<Vec<Visitor>> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::get_visitors(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn get_visitor_by_id(state: State<'_, AppState>, id: String) -> AppResult<Visitor> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::get_visitor_by_id(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn create_visitor(
    state: State<'_, AppState>,
    request: CreateVisitorRequest,
) -> AppResult<Visitor> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::create_visitor(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_visitor(
    state: State<'_, AppState>,
    id: String,
    request: UpdateVisitorRequest,
) -> AppResult<Visitor> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::update_visitor(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_visitor(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::delete_visitor(&conn, &id).map_err(Into::into)
}

// --- Follow-ups ---
#[tauri::command]
pub async fn get_visitor_followups(
    state: State<'_, AppState>,
    visitor_id: String,
) -> AppResult<Vec<VisitorFollowup>> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::get_followups(&conn, &visitor_id).map_err(Into::into)
}

#[tauri::command]
pub async fn create_visitor_followup(
    state: State<'_, AppState>,
    request: CreateVisitorFollowupRequest,
) -> AppResult<VisitorFollowup> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::create_followup(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_followup_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::update_followup_status(&conn, &id, &status).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_visitor_followup(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    VisitorRepository::delete_followup(&conn, &id).map_err(Into::into)
}
