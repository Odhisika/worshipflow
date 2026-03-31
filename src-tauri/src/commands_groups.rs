use tauri::State;
use crate::AppState;
use crate::models::{Group, GroupMember, CreateGroupRequest, UpdateGroupRequest, AddMemberToGroupRequest};
use crate::repositories::GroupRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_groups(state: State<'_, AppState>) -> AppResult<Vec<Group>> {
    let conn = state.db.lock().unwrap();
    GroupRepository::get_all(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn get_group_by_id(state: State<'_, AppState>, id: String) -> AppResult<Group> {
    let conn = state.db.lock().unwrap();
    GroupRepository::get_by_id(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn create_group(state: State<'_, AppState>, request: CreateGroupRequest) -> AppResult<Group> {
    let conn = state.db.lock().unwrap();
    GroupRepository::create(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_group(state: State<'_, AppState>, id: String, request: UpdateGroupRequest) -> AppResult<Group> {
    let conn = state.db.lock().unwrap();
    GroupRepository::update(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_group(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    GroupRepository::delete(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn add_member_to_group(state: State<'_, AppState>, request: AddMemberToGroupRequest) -> AppResult<GroupMember> {
    let conn = state.db.lock().unwrap();
    GroupRepository::add_member(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn remove_member_from_group(state: State<'_, AppState>, group_member_id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    GroupRepository::remove_member(&conn, &group_member_id).map_err(Into::into)
}

#[tauri::command]
pub async fn get_group_members(state: State<'_, AppState>, group_id: String) -> AppResult<Vec<GroupMember>> {
    let conn = state.db.lock().unwrap();
    GroupRepository::get_group_members(&conn, &group_id).map_err(Into::into)
}
