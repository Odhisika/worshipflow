use crate::error::AppResult;
use crate::models::SystemStats;
use crate::repositories::OverviewRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_system_stats(
    state: State<'_, AppState>,
) -> AppResult<SystemStats> {
    let conn = state.db.lock().unwrap();
    OverviewRepository::get_system_stats(&conn)
}

#[tauri::command]
pub async fn get_recent_activity(
    state: State<'_, AppState>,
) -> AppResult<Vec<serde_json::Value>> {
    let conn = state.db.lock().unwrap();
    OverviewRepository::get_recent_activity(&conn)
}
