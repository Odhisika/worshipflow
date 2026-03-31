use crate::error::AppResult;
use crate::models::{VolunteerRole, VolunteerAssignment};
use crate::repositories::VolunteerRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_volunteer_roles(
    state: State<'_, AppState>,
) -> AppResult<Vec<VolunteerRole>> {
    let conn = state.db.lock().unwrap();
    VolunteerRepository::get_roles(&conn)
}

#[tauri::command]
pub async fn get_volunteer_assignments(
    state: State<'_, AppState>,
    service_id: String,
) -> AppResult<Vec<VolunteerAssignment>> {
    let conn = state.db.lock().unwrap();
    VolunteerRepository::get_assignments(&conn, &service_id)
}

#[tauri::command]
pub async fn assign_volunteer(
    state: State<'_, AppState>,
    role_id: String,
    member_id: String,
    service_id: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    VolunteerRepository::assign_volunteer(&conn, &role_id, &member_id, &service_id)
}
#[tauri::command]
pub async fn create_volunteer_role(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
    required_count: i32,
) -> AppResult<VolunteerRole> {
    let conn = state.db.lock().unwrap();
    VolunteerRepository::create_role(&conn, &name, description.as_deref(), required_count)
}
