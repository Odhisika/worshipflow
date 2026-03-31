use crate::error::AppResult;
use crate::models::AnalyticsReport;
use crate::repositories::ReportsRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_analytics_report(
    state: State<'_, AppState>,
) -> AppResult<AnalyticsReport> {
    let conn = state.db.lock().unwrap();
    ReportsRepository::get_analytics_report(&conn)
}
