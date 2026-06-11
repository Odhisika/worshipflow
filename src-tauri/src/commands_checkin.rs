use tauri::State;
use crate::models::{CheckIn, CheckInRequest, CheckOutRequest, MemberRelationship, CreateRelationshipRequest};
use crate::repositories::CheckInRepository;
use std::sync::Mutex;
use rusqlite::Connection;

#[tauri::command]
pub async fn get_active_checkins(conn_mutex: State<'_, Mutex<Connection>>) -> Result<Vec<CheckIn>, String> {
    let conn = conn_mutex.lock().unwrap();
    CheckInRepository::get_active(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_in_child(
    conn_mutex: State<'_, Mutex<Connection>>,
    req: CheckInRequest
) -> Result<CheckIn, String> {
    let conn = conn_mutex.lock().unwrap();
    CheckInRepository::check_in(&conn, req).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_out_child(
    conn_mutex: State<'_, Mutex<Connection>>,
    req: CheckOutRequest
) -> Result<bool, String> {
    let conn = conn_mutex.lock().unwrap();
    CheckInRepository::check_out(&conn, &req.check_in_id, &req.security_code).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_relationship(
    conn_mutex: State<'_, Mutex<Connection>>,
    req: CreateRelationshipRequest
) -> Result<MemberRelationship, String> {
    let conn = conn_mutex.lock().unwrap();
    CheckInRepository::create_relationship(&conn, req).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_member_relationships(
    conn_mutex: State<'_, Mutex<Connection>>,
    member_id: String
) -> Result<Vec<MemberRelationship>, String> {
    let conn = conn_mutex.lock().unwrap();
    CheckInRepository::get_relationships_for_member(&conn, &member_id).map_err(|e| e.to_string())
}
