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
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::time::UNIX_EPOCH;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tokio::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalMediaFile {
    pub name: String,
    pub path: String,
    pub extension: String,
    pub size_bytes: u64,
}

const AUDIO_EXTENSIONS: &[&str] = &[
    "aac", "ac3", "aif", "aiff", "alac", "amr", "ape", "dts", "flac", "m4a", "mid",
    "midi", "mp2", "mp3", "oga", "ogg", "opus", "wav", "webm", "wma",
];

const VIDEO_EXTENSIONS: &[&str] = &[
    "3g2", "3gp", "asf", "avi", "divx", "flv", "m2ts", "m4v", "mkv", "mov", "mp4",
    "mpe", "mpeg", "mpg", "mpv", "mts", "ogv", "qt", "rm", "rmvb", "ts", "vob",
    "webm", "wmv",
];

const IMAGE_EXTENSIONS: &[&str] = &["gif", "jpeg", "jpg", "png", "svg", "webp"];

fn extensions_for_media_type(media_type: &str) -> &'static [&'static str] {
    match media_type.to_lowercase().as_str() {
        "audio" => AUDIO_EXTENSIONS,
        "video" => VIDEO_EXTENSIONS,
        "image" => IMAGE_EXTENSIONS,
        _ => &[],
    }
}

#[tauri::command]
pub async fn open_media_file_dialog(app: tauri::AppHandle, media_type: String) -> AppResult<Vec<String>> {
    let mut dialog = app.dialog()
        .file()
        .set_title(&format!("Select {} files", media_type));

    let extensions = extensions_for_media_type(&media_type);
    if !extensions.is_empty() {
        let filter_name = match media_type.to_lowercase().as_str() {
            "audio" => "Audio Files",
            "video" => "Video Files",
            "image" => "Image Files",
            _ => "Media Files",
        };
        dialog = dialog.add_filter(filter_name, extensions);
    }

    let paths = dialog.blocking_pick_files().unwrap_or_default();

    Ok(paths.into_iter().map(|p| p.to_string()).collect())
}

#[tauri::command]
pub async fn open_folder_dialog(app: tauri::AppHandle) -> AppResult<String> {
    let path = app.dialog()
        .file()
        .set_title("Select Media Folder")
        .blocking_pick_folder();

    match path {
        Some(p) => Ok(p.to_string()),
        None => Ok("".to_string()),
    }
}

#[tauri::command]
pub async fn scan_folder_for_media(folder_path: String, media_type: String) -> AppResult<Vec<LocalMediaFile>> {
    if folder_path.is_empty() {
        return Ok(vec![]);
    }

    let extensions = extensions_for_media_type(&media_type);

    let path_buf = PathBuf::from(folder_path);

    let files = tokio::task::spawn_blocking(move || {
        let mut results = Vec::new();

        // Limit depth to avoid traversing massive remote mounts
        for entry in WalkDir::new(path_buf).max_depth(3).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                let path = entry.path();
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext = ext.to_lowercase();
                    if extensions.contains(&ext.as_str()) {
                        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        let name = path.file_stem()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        results.push(LocalMediaFile {
                            name,
                            path: path.to_string_lossy().to_string(),
                            extension: ext,
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

#[tauri::command]
pub async fn prepare_media_for_playback(
    app: tauri::AppHandle,
    file_path: String,
    media_type: String,
) -> AppResult<String> {
    if file_path.is_empty() {
        return Ok("".to_string());
    }

    let input_path = PathBuf::from(&file_path);
    if !input_path.exists() || !input_path.is_file() {
        return Err(crate::error::AppError::Unknown(format!(
            "File not found or not a valid file: {}",
            file_path
        )));
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| crate::error::AppError::Unknown(format!("Failed to locate cache directory: {}", e)))?
        .join("playback-media");

    let media_type = media_type.to_lowercase();
    let output_ext = if media_type == "audio" { "ogg" } else { "webm" };
    let cache_key = media_cache_key(&input_path, &media_type);
    let original_stem = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(sanitize_file_stem)
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "media".to_string());
    let output_path = cache_dir.join(format!("{}-{}.{}", original_stem, cache_key, output_ext));

    if output_path.exists() && output_path.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
        return Ok(output_path.to_string_lossy().to_string());
    }

    // Create cache directory
    tokio::fs::create_dir_all(&cache_dir)
        .await
        .map_err(|e| crate::error::AppError::Unknown(format!("Failed to create media cache: {}", e)))?;

    // Build the ffmpeg command asynchronously (tokio::process::Command)
    let output = if media_type == "audio" {
        Command::new("ffmpeg")
            .args(["-hide_banner", "-loglevel", "error", "-y", "-i"])
            .arg(&input_path)
            .args(["-vn", "-c:a", "libvorbis", "-q:a", "5"])
            .arg(&output_path)
            .output()
            .await
    } else {
        Command::new("ffmpeg")
            .args(["-hide_banner", "-loglevel", "error", "-y", "-i"])
            .arg(&input_path)
            .args([
                "-map", "0:v:0",
                "-map", "0:a?",
                "-c:v", "libvpx",
                "-deadline", "realtime",
                "-cpu-used", "8",
                "-b:v", "2500k",
                "-c:a", "libvorbis",
                "-q:a", "4",
            ])
            .arg(&output_path)
            .output()
            .await
    };

    let output = output.map_err(|e| {
        crate::error::AppError::Unknown(format!(
            "FFmpeg is required to convert unsupported media for playback: {}", e
        ))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let _ = tokio::fs::remove_file(&output_path).await;
        return Err(crate::error::AppError::Unknown(format!(
            "FFmpeg conversion failed: {}",
            if stderr.is_empty() { "unknown error".to_string() } else { stderr }
        )));
    }

    Ok(output_path.to_string_lossy().to_string())
}

fn media_cache_key(path: &PathBuf, media_type: &str) -> String {
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    media_type.hash(&mut hasher);

    if let Ok(metadata) = path.metadata() {
        metadata.len().hash(&mut hasher);
        if let Ok(modified) = metadata.modified() {
            if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
                duration.as_secs().hash(&mut hasher);
                duration.subsec_nanos().hash(&mut hasher);
            }
        }
    }

    format!("{:016x}", hasher.finish())
}

fn sanitize_file_stem(stem: &str) -> String {
    stem.chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' { ch } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

/// Reads the entire file from disk and returns its bytes.
/// In Tauri v2, Vec<u8> is serialized as binary (not JSON array),
/// making this efficient even for moderately large files.
#[tauri::command]
pub async fn read_file_bytes(path: String) -> crate::error::AppResult<Vec<u8>> {
    tokio::fs::read(&path)
        .await
        .map_err(|e| crate::error::AppError::Unknown(format!("Failed to read file: {}", e)))
}


