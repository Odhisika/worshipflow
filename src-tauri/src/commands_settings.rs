use crate::error::AppResult;
use crate::models::{AppConfig, UpdateSettingRequest};
use crate::repositories::SettingsRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_app_config(state: State<'_, AppState>) -> AppResult<AppConfig> {
    let conn = state.db.lock().unwrap();
    SettingsRepository::get_app_config(&conn)
}

#[tauri::command]
pub async fn update_setting(state: State<'_, AppState>, request: UpdateSettingRequest) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    SettingsRepository::set_key(&conn, &request.key, &request.value)
}

#[tauri::command]
pub async fn update_settings_batch(state: State<'_, AppState>, settings: Vec<UpdateSettingRequest>) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    for setting in settings {
        SettingsRepository::set_key(&conn, &setting.key, &setting.value)?;
    }
    Ok(())
}
