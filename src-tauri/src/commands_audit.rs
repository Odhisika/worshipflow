use tauri::State;
use crate::AppState;
use crate::models::AuditLog;
use crate::repositories::AuditRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_audit_logs(
    state: State<'_, AppState>,
    limit: i32,
    entity_type: Option<String>,
) -> AppResult<Vec<AuditLog>> {
    let conn = state.db.lock().unwrap();
    AuditRepository::get_audit_logs(&conn, limit, entity_type.as_deref()).map_err(Into::into)
}

#[tauri::command]
pub async fn clear_audit_logs(
    state: State<'_, AppState>,
    before_date: Option<String>,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    AuditRepository::clear_audit_logs(&conn, before_date.as_deref()).map_err(Into::into)
}
