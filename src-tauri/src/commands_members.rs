use tauri::State;
use crate::AppState;
use crate::models::{Member, CreateMemberRequest, UpdateMemberRequest, MemberRole};
use crate::repositories::MemberRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_members(state: State<'_, AppState>) -> AppResult<Vec<Member>> {
    let conn = state.db.lock().unwrap();
    MemberRepository::get_all(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn get_member_by_id(state: State<'_, AppState>, id: String) -> AppResult<Member> {
    let conn = state.db.lock().unwrap();
    MemberRepository::get_by_id(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn create_member(
    state: State<'_, AppState>,
    request: CreateMemberRequest,
) -> AppResult<Member> {
    let conn = state.db.lock().unwrap();
    MemberRepository::create(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_member(
    state: State<'_, AppState>,
    id: String,
    request: UpdateMemberRequest,
) -> AppResult<Member> {
    let conn = state.db.lock().unwrap();
    MemberRepository::update(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_member(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    MemberRepository::delete(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn promote_member(
    state: State<'_, AppState>,
    id: String,
    role: MemberRole,
) -> AppResult<Member> {
    let conn = state.db.lock().unwrap();
    MemberRepository::promote(&conn, &id, role).map_err(Into::into)
}

#[tauri::command]
pub async fn suspend_member(state: State<'_, AppState>, id: String) -> AppResult<Member> {
    let conn = state.db.lock().unwrap();
    MemberRepository::suspend(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn activate_member(state: State<'_, AppState>, id: String) -> AppResult<Member> {
    let conn = state.db.lock().unwrap();
    MemberRepository::active(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn set_member_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> AppResult<Member> {
    let conn = state.db.lock().unwrap();
    MemberRepository::set_status(&conn, &id, &status).map_err(Into::into)
}
