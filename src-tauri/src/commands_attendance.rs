use crate::error::AppResult;
use crate::models::{AttendanceRecord, MarkAttendanceRequest, ServiceAttendanceSummary};
use crate::repositories::AttendanceRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn mark_attendance(
    state: State<'_, AppState>,
    request: MarkAttendanceRequest,
) -> AppResult<AttendanceRecord> {
    let conn = state.db.lock().unwrap();
    AttendanceRepository::mark_attendance(&conn, request)
}

#[tauri::command]
pub async fn get_service_attendance(
    state: State<'_, AppState>,
    service_id: String,
) -> AppResult<Vec<AttendanceRecord>> {
    let conn = state.db.lock().unwrap();
    AttendanceRepository::get_service_attendance(&conn, &service_id)
}

#[tauri::command]
pub async fn get_attendance_summary(
    state: State<'_, AppState>,
    service_id: String,
) -> AppResult<ServiceAttendanceSummary> {
    let conn = state.db.lock().unwrap();
    AttendanceRepository::get_attendance_summary(&conn, &service_id)
}
