use crate::error::AppResult;
use crate::models::{Song, CreateSongRequest};
use crate::repositories::SongRepository;
use crate::AppState;
use std::fs;
use std::path::Path;
use tauri::State;

#[tauri::command]
pub async fn import_song_from_file(
    state: State<'_, AppState>,
    file_path: String,
) -> AppResult<Song> {
    // Read the file content
    let content = fs::read_to_string(&file_path)
        .map_err(|e| crate::error::AppError::Unknown(e.to_string()))?;
    
    // Parse the file content to extract song data
    // For now, assuming it's a simple format with title and lyrics separated by ---
    let parts: Vec<&str> = content.split("---").collect();
    
    let title = if parts.len() > 0 {
        parts[0].trim().to_string()
    } else {
        Path::new(&file_path)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string()
    };
    
    let lyrics = if parts.len() > 1 {
        parts[1..].join("---").trim().to_string()
    } else {
        content.trim().to_string()
    };
    
    // Create a song request
    let request = CreateSongRequest {
        title,
        lyrics,
        key: None,
        tempo: None,
        tags: Some(vec!["imported".to_string()]),
        chords: None,
        show_chords: Some(false),
        arrangement: None,
    };
    
    // Save the song to the database
    let conn = state.db.lock().unwrap();
    SongRepository::create(&conn, request)
}

use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use tauri::api::dialog::blocking::FileDialogBuilder;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalMediaFile {
    pub name: String,
    pub path: String,
    pub extension: String,
    pub size_bytes: u64,
}

#[tauri::command]
pub async fn open_media_file_dialog(media_type: String) -> AppResult<Vec<String>> {
    let mut builder = FileDialogBuilder::new()
        .set_title(&format!("Select {} files", media_type));

    if media_type.to_lowercase() == "audio" {
        builder = builder.add_filter("Audio Files", &["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma"]);
    } else if media_type.to_lowercase() == "video" {
        builder = builder.add_filter("Video Files", &["mp4", "webm", "mkv", "avi", "mov", "wmv"]);
    }

    // Run blocking dialog in another thread to avoid blocking async runtime
    let paths = tokio::task::spawn_blocking(move || {
        builder.pick_files()
    })
    .await
    .map_err(|e| crate::error::AppError::Unknown(format!("Failed to spawn dialog thread: {}", e)))?
    .unwrap_or_default();

    Ok(paths.into_iter().map(|p| p.to_string_lossy().to_string()).collect())
}

#[tauri::command]
pub async fn open_folder_dialog() -> AppResult<String> {
    let builder = FileDialogBuilder::new()
        .set_title("Select Media Folder");

    let path = tokio::task::spawn_blocking(move || {
        builder.pick_folder()
    })
    .await
    .map_err(|e| crate::error::AppError::Unknown(format!("Failed to spawn dialog thread: {}", e)))?;

    match path {
        Some(p) => Ok(p.to_string_lossy().to_string()),
        None => Ok("".to_string()),
    }
}

#[tauri::command]
pub async fn scan_folder_for_media(folder_path: String, media_type: String) -> AppResult<Vec<LocalMediaFile>> {
    if folder_path.is_empty() {
        return Ok(vec![]);
    }

    let is_audio = media_type.to_lowercase() == "audio";
    let extensions: Vec<&str> = if is_audio {
        vec!["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma"]
    } else {
        vec!["mp4", "webm", "mkv", "avi", "mov", "wmv"]
    };

    let path_buf = PathBuf::from(folder_path);

    let files = tokio::task::spawn_blocking(move || {
        let mut results = Vec::new();

        // Limit depth to avoid traversing massive remote mounts
        for entry in WalkDir::new(path_buf).max_depth(3).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                let path = entry.path();
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if extensions.contains(&ext.to_lowercase().as_str()) {
                        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        let name = path.file_stem()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        results.push(LocalMediaFile {
                            name,
                            path: path.to_string_lossy().to_string(),
                            extension: ext.to_lowercase().to_string(),
                            size_bytes: size,
                        });
                    }
                }
            }
        }
        
        // Sort alphabetically
        results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        results
    })
    .await
    .map_err(|e| crate::error::AppError::Unknown(format!("Failed to scan folder: {}", e)))?;

    Ok(files)
}

#[tauri::command]
pub async fn read_image_base64(file_path: String) -> AppResult<String> {
    if file_path.is_empty() {
        return Ok("".to_string());
    }

    let path = PathBuf::from(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(crate::error::AppError::Unknown(format!("File not found or not a valid file: {}", file_path)));
    }

    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|e| crate::error::AppError::Unknown(format!("Failed to read file: {}", e)))?;

    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();

    let mime_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "image/png",
    };

    use base64::{Engine as _, engine::general_purpose::STANDARD};
    let b64 = STANDARD.encode(&bytes);

    Ok(format!("data:{};base64,{}", mime_type, b64))
}