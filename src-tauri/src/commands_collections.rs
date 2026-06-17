use crate::error::AppResult;
use crate::models::{Collection, CreateCollectionRequest, Song};
use crate::repositories::{CollectionRepository, SongRepository};
use crate::AppState;
use tauri::State;

// ── Collection commands ──────────────────────────────────────────────────

#[tauri::command]
pub async fn create_collection(
    state: State<'_, AppState>,
    request: CreateCollectionRequest,
) -> AppResult<Collection> {
    let conn = state.db.lock().unwrap();
    CollectionRepository::create(&conn, request)
}

#[tauri::command]
pub async fn get_collection(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Collection> {
    let conn = state.db.lock().unwrap();
    CollectionRepository::get_by_id(&conn, &id)
}

#[tauri::command]
pub async fn get_all_collections(
    state: State<'_, AppState>,
) -> AppResult<Vec<Collection>> {
    let conn = state.db.lock().unwrap();
    CollectionRepository::get_all(&conn)
}

#[tauri::command]
pub async fn update_collection(
    state: State<'_, AppState>,
    id: String,
    request: CreateCollectionRequest,
) -> AppResult<Collection> {
    let conn = state.db.lock().unwrap();
    CollectionRepository::update(&conn, &id, request)
}

#[tauri::command]
pub async fn delete_collection(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    CollectionRepository::delete(&conn, &id)
}

// ── Collection song filtering commands ────────────────────────────────────

#[tauri::command]
pub async fn get_songs_by_collection(
    state: State<'_, AppState>,
    collection_id: String,
) -> AppResult<Vec<Song>> {
    let conn = state.db.lock().unwrap();
    SongRepository::get_by_collection(&conn, &collection_id)
}

#[tauri::command]
pub async fn get_uncategorized_songs(
    state: State<'_, AppState>,
) -> AppResult<Vec<Song>> {
    let conn = state.db.lock().unwrap();
    SongRepository::get_uncategorized(&conn)
}
