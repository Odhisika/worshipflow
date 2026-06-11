use crate::error::AppResult;
use crate::models::{Campaign, CreateCampaignRequest, SubscriberStats};
use crate::repositories::CommunicationsRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_campaign(
    state: State<'_, AppState>,
    request: CreateCampaignRequest,
) -> AppResult<Campaign> {
    let conn = state.db.lock().unwrap();
    CommunicationsRepository::create_campaign(&conn, request)
}

#[tauri::command]
pub async fn get_campaigns(
    state: State<'_, AppState>,
) -> AppResult<Vec<Campaign>> {
    let conn = state.db.lock().unwrap();
    CommunicationsRepository::get_campaigns(&conn)
}

#[tauri::command]
pub async fn get_subscriber_stats(
    state: State<'_, AppState>,
) -> AppResult<SubscriberStats> {
    let conn = state.db.lock().unwrap();
    CommunicationsRepository::get_subscriber_stats(&conn)
}

#[tauri::command]
pub async fn delete_campaign(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    CommunicationsRepository::delete_campaign(&conn, &id)
}
