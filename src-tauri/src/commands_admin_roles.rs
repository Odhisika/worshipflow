use tauri::State;
use crate::AppState;
use crate::models::{AdminRole, UpdateAdminRoleRequest};
use crate::repositories::AdminRoleRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_admin_roles(state: State<'_, AppState>) -> AppResult<Vec<AdminRole>> {
    let conn = state.db.lock().unwrap();
    AdminRoleRepository::get_admin_roles(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn set_admin_role(
    state: State<'_, AppState>,
    request: UpdateAdminRoleRequest,
) -> AppResult<AdminRole> {
    let conn = state.db.lock().unwrap();
    AdminRoleRepository::set_admin_role(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn get_admin_role(
    state: State<'_, AppState>,
    admin_id: String,
) -> AppResult<AdminRole> {
    let conn = state.db.lock().unwrap();
    AdminRoleRepository::get_admin_role(&conn, &admin_id).map_err(Into::into)
}
