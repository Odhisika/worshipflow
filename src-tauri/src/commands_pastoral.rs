use tauri::State;
use crate::AppState;
use crate::models::{
    Visitation, CreateVisitationRequest,
    PrayerRequest, CreatePrayerRequestRequest,
    CounsellingSession, CreateCounsellingSessionRequest,
};
use crate::repositories::PastoralCareRepository;
use crate::error::AppResult;

// --- Visitations ---
#[tauri::command]
pub async fn get_visitations(state: State<'_, AppState>) -> AppResult<Vec<Visitation>> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::get_visitations(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn create_visitation(
    state: State<'_, AppState>,
    request: CreateVisitationRequest,
) -> AppResult<Visitation> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::create_visitation(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_visitation(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::delete_visitation(&conn, &id).map_err(Into::into)
}

// --- Prayer Requests ---
#[tauri::command]
pub async fn get_prayer_requests(state: State<'_, AppState>) -> AppResult<Vec<PrayerRequest>> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::get_prayer_requests(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn create_prayer_request(
    state: State<'_, AppState>,
    request: CreatePrayerRequestRequest,
) -> AppResult<PrayerRequest> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::create_prayer_request(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_prayer_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> AppResult<PrayerRequest> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::update_prayer_status(&conn, &id, &status).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_prayer_request(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::delete_prayer_request(&conn, &id).map_err(Into::into)
}

// --- Counselling Sessions ---
#[tauri::command]
pub async fn get_counselling_sessions(state: State<'_, AppState>) -> AppResult<Vec<CounsellingSession>> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::get_counselling_sessions(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn create_counselling_session(
    state: State<'_, AppState>,
    request: CreateCounsellingSessionRequest,
) -> AppResult<CounsellingSession> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::create_counselling_session(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_counselling_session(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    PastoralCareRepository::delete_counselling_session(&conn, &id).map_err(Into::into)
}
