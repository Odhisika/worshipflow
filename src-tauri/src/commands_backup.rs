use tauri::State;
use crate::AppState;
use crate::error::{AppResult, AppError};
use std::path::PathBuf;
use std::fs;
use chrono::Utc;

#[tauri::command]
pub async fn backup_database(state: State<'_, AppState>) -> AppResult<String> {
    let conn = state.db.lock().unwrap();
    let db_path: String = conn.query_row("PRAGMA database_list", [], |row| {
        row.get::<_, String>(2)
    }).map_err(|e| AppError::Unknown(format!("Failed to get DB path: {}", e)))?;
    drop(conn);

    let src = PathBuf::from(&db_path);
    if !src.exists() {
        return Err(AppError::NotFound("Database file not found".to_string()));
    }

    let backup_dir = src.parent().unwrap_or(&src).join("backups");
    fs::create_dir_all(&backup_dir).map_err(|e| AppError::Io(e))?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("worshipflow_backup_{}.db", timestamp);
    let dest = backup_dir.join(&backup_name);

    fs::copy(&src, &dest).map_err(|e| AppError::Io(e))?;
    let size = fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);
    log::info!("Database backed up to {:?} ({} bytes)", dest, size);

    Ok(backup_name)
}

#[tauri::command]
pub async fn restore_database(state: State<'_, AppState>, backup_name: String) -> AppResult<String> {
    let conn = state.db.lock().unwrap();
    let db_path: String = conn.query_row("PRAGMA database_list", [], |row| {
        row.get::<_, String>(2)
    }).map_err(|e| AppError::Unknown(format!("Failed to get DB path: {}", e)))?;
    drop(conn);

    let src = PathBuf::from(&db_path);
    let backup_dir = src.parent().unwrap_or(&src).join("backups");
    let backup_file = backup_dir.join(&backup_name);

    if !backup_file.exists() {
        return Err(AppError::NotFound(format!("Backup file not found: {}", backup_name)));
    }

    // Create a pre-restore backup
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let pre_restore = format!("pre_restore_{}.db", timestamp);
    let pre_restore_path = backup_dir.join(&pre_restore);
    fs::copy(&src, &pre_restore_path).map_err(|e| AppError::Io(e))?;

    // Restore
    fs::copy(&backup_file, &src).map_err(|e| AppError::Io(e))?;
    log::info!("Database restored from {:?}", backup_file);

    Ok(format!("Restored from {}. Pre-restore backup saved as {}", backup_name, pre_restore))
}

#[tauri::command]
pub async fn list_backups(state: State<'_, AppState>) -> AppResult<Vec<crate::models::BackupInfo>> {
    let conn = state.db.lock().unwrap();
    let db_path: String = conn.query_row("PRAGMA database_list", [], |row| {
        row.get::<_, String>(2)
    }).map_err(|e| AppError::Unknown(format!("Failed to get DB path: {}", e)))?;
    drop(conn);

    let backup_dir = PathBuf::from(&db_path).parent().unwrap_or(&PathBuf::from(&db_path)).join("backups");
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();
    let entries = fs::read_dir(&backup_dir).map_err(|e| AppError::Io(e))?;
    for entry in entries {
        if let Ok(entry) = entry {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.ends_with(".db") {
                            backups.push(crate::models::BackupInfo {
                                file_name: name.to_string(),
                                file_size: metadata.len() as i64,
                                created_at: metadata.created()
                                    .map(|t| {
                                        let dt: chrono::DateTime<Utc> = t.into();
                                        dt.to_rfc3339()
                                    })
                                    .unwrap_or_else(|_| "unknown".to_string()),
                            });
                        }
                    }
                }
            }
        }
    }
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}
