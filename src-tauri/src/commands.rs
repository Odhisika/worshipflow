use crate::error::AppResult;
use crate::models::{Song, CreateSongRequest, Service, CreateServiceRequest, Activity, CreateActivityRequest};
use crate::repositories::{SongRepository, ServiceRepository, ActivityRepository};
use crate::AppState;
use tauri::State;

// Song commands
#[tauri::command]
pub async fn create_song(
    state: State<'_, AppState>,
    request: CreateSongRequest,
) -> AppResult<Song> {
    let conn = state.db.lock().unwrap();
    SongRepository::create(&conn, request)
}

#[tauri::command]
pub async fn get_song(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Song> {
    let conn = state.db.lock().unwrap();
    SongRepository::get_by_id(&conn, &id)
}

#[tauri::command]
pub async fn get_all_songs(
    state: State<'_, AppState>,
) -> AppResult<Vec<Song>> {
    let conn = state.db.lock().unwrap();
    SongRepository::get_all(&conn)
}

#[tauri::command]
pub async fn search_songs(
    state: State<'_, AppState>,
    query: String,
) -> AppResult<Vec<Song>> {
    let conn = state.db.lock().unwrap();
    SongRepository::search(&conn, &query)
}

#[tauri::command]
pub async fn update_song(
    state: State<'_, AppState>,
    id: String,
    request: CreateSongRequest,
) -> AppResult<Song> {
    let conn = state.db.lock().unwrap();
    SongRepository::update(&conn, &id, request)
}

#[tauri::command]
pub async fn delete_song(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    SongRepository::delete(&conn, &id)
}

// Service commands
#[tauri::command]
pub async fn create_service(
    state: State<'_, AppState>,
    request: CreateServiceRequest,
) -> AppResult<Service> {
    let conn = state.db.lock().unwrap();
    ServiceRepository::create(&conn, request)
}

#[tauri::command]
pub async fn get_service(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Service> {
    let conn = state.db.lock().unwrap();
    ServiceRepository::get_by_id(&conn, &id)
}

#[tauri::command]
pub async fn get_all_services(
    state: State<'_, AppState>,
) -> AppResult<Vec<Service>> {
    let conn = state.db.lock().unwrap();
    ServiceRepository::get_all(&conn)
}

#[tauri::command]
pub async fn update_service(
    state: State<'_, AppState>,
    id: String,
    request: CreateServiceRequest,
) -> AppResult<Service> {
    let conn = state.db.lock().unwrap();
    ServiceRepository::update(&conn, &id, request)
}

#[tauri::command]
pub async fn delete_service(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    ServiceRepository::delete(&conn, &id)
}

// Activity commands
#[tauri::command]
pub async fn create_activity(
    state: State<'_, AppState>,
    request: CreateActivityRequest,
) -> AppResult<Activity> {
    let conn = state.db.lock().unwrap();
    ActivityRepository::create(&conn, request)
}

#[tauri::command]
pub async fn get_activity(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Activity> {
    let conn = state.db.lock().unwrap();
    ActivityRepository::get_by_id(&conn, &id)
}

#[tauri::command]
pub async fn get_service_activities(
    state: State<'_, AppState>,
    service_id: String,
) -> AppResult<Vec<Activity>> {
    let conn = state.db.lock().unwrap();
    ActivityRepository::get_by_service(&conn, &service_id)
}

#[tauri::command]
pub async fn update_activity(
    state: State<'_, AppState>,
    id: String,
    request: CreateActivityRequest,
) -> AppResult<Activity> {
    let conn = state.db.lock().unwrap();
    ActivityRepository::update(&conn, &id, request)
}

#[tauri::command]
pub async fn reorder_activities(
    state: State<'_, AppState>,
    service_id: String,
    activity_ids: Vec<String>,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    ActivityRepository::reorder(&conn, &service_id, activity_ids)
}

#[tauri::command]
pub async fn delete_activity(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    ActivityRepository::delete(&conn, &id)
}


#[tauri::command]
pub async fn import_song_from_content(
    state: State<'_, AppState>,
    title: String,
    content: String,
    tags: Option<Vec<String>>,
) -> AppResult<Song> {
    let request = CreateSongRequest {
        title,
        lyrics: content,
        key: None,
        tempo: None,
        tags: tags.or_else(|| Some(vec![])),
        chords: None,
        show_chords: Some(false),
        arrangement: None,
    };
    
    let conn = state.db.lock().unwrap();
    SongRepository::create(&conn, request)
}

// ── Logging helper ──────────────────────────────────────────────────────
#[tauri::command]
pub fn log_to_terminal(level: String, message: String) {
    match level.to_lowercase().as_str() {
        "error" => eprintln!("[MEDIA] ERROR: {}", message),
        "warn" => println!("[MEDIA] WARN:  {}", message),
        _ => println!("[MEDIA] INFO:  {}", message),
    }
}
