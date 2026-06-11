use crate::error::AppResult;
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
    println!("[MediaIO] prepare_media_for_playback: type={media_type}, input={file_path}");

    if file_path.is_empty() {
        println!("[MediaIO] Empty file path, returning empty string");
        return Ok("".to_string());
    }

    let input_path = PathBuf::from(&file_path);
    if !input_path.exists() || !input_path.is_file() {
        let err_msg = format!("File not found or not a valid file: {}", file_path);
        println!("[MediaIO] {err_msg}");
        return Err(crate::error::AppError::Unknown(err_msg));
    }
    let input_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);
    println!("[MediaIO] Input file OK: size={input_size}");

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
    println!("[MediaIO] Cache path: {}", output_path.display());

    if output_path.exists() && output_path.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
        let cached_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .unwrap_or(0);
        println!("[MediaIO] Cache HIT: using existing file ({cached_size} bytes)");
        return Ok(output_path.to_string_lossy().to_string());
    }

    println!("[MediaIO] Cache MISS: starting ffmpeg conversion...");

    // Create cache directory
    tokio::fs::create_dir_all(&cache_dir)
        .await
        .map_err(|e| crate::error::AppError::Unknown(format!("Failed to create media cache: {}", e)))?;

    let start = std::time::Instant::now();

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
                // VP9 with maximum speed settings for realtime-like conversion
                "-c:v", "libvpx-vp9",
                "-deadline", "realtime",
                "-cpu-used", "8",       // 0=slowest/best, 8=fastest/worst quality
                "-row-mt", "1",         // row-based multi-threading (big speedup)
                "-tile-columns", "2",   // encode tiles in parallel
                "-threads", "0",        // use all available CPU cores
                "-crf", "35",           // quality (lower = better; 35 is fine for presentations)
                "-b:v", "0",            // pure CRF mode (ignore bitrate target)
                "-c:a", "libvorbis",
                "-q:a", "4",
            ])
            .arg(&output_path)
            .output()
            .await
    };

    let elapsed = start.elapsed();
    println!("[MediaIO] ffmpeg finished in {elapsed:?}");

    let output = output.map_err(|e| {
        let msg = format!("FFmpeg is required to convert unsupported media for playback: {}", e);
        println!("[MediaIO] ffmpeg spawn error: {msg}");
        crate::error::AppError::Unknown(msg)
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let _ = tokio::fs::remove_file(&output_path).await;
        let msg = format!(
            "FFmpeg conversion failed: {}",
            if stderr.is_empty() { "unknown error".to_string() } else { stderr }
        );
        println!("[MediaIO] {msg}");
        return Err(crate::error::AppError::Unknown(msg));
    }

    let final_size = std::fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);
    println!("[MediaIO] Conversion OK: output={} ({final_size} bytes, took {elapsed:?})", output_path.display());

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
    let start = std::time::Instant::now();
    let metadata = std::fs::metadata(&path).ok();
    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
    println!(
        "[MediaIO] read_file_bytes called: path={path}, size={size}, exists={}",
        metadata.is_some()
    );
    let result = tokio::fs::read(&path).await;
    match &result {
        Ok(bytes) => println!(
            "[MediaIO] read_file_bytes success: {} bytes in {:?}",
            bytes.len(),
            start.elapsed()
        ),
        Err(e) => println!("[MediaIO] read_file_bytes FAILED: {e}"),
    }
    result.map_err(|e| crate::error::AppError::Unknown(format!("Failed to read file: {}", e)))
}

/// Opens a save dialog and writes binary data to the selected path.
/// Supports common file types: xlsx, pdf, csv, png, jpg.
#[tauri::command]
pub async fn save_file(app: tauri::AppHandle, filename: String, data: Vec<u8>) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;

    let ext = std::path::Path::new(&filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mut dialog = app.dialog()
        .file()
        .set_file_name(&filename);

    let filter_name = match ext.as_str() {
        "xlsx" => "Excel Files (*.xlsx)",
        "pdf" => "PDF Files (*.pdf)",
        "csv" => "CSV Files (*.csv)",
        "png" => "PNG Images (*.png)",
        "jpg" | "jpeg" => "JPEG Images (*.jpg)",
        _ => "All Files (*.*)",
    };
    let extensions: &[&str] = match ext.as_str() {
        "xlsx" => &["xlsx"],
        "pdf" => &["pdf"],
        "csv" => &["csv"],
        "png" => &["png"],
        "jpg" | "jpeg" => &["jpg", "jpeg"],
        _ => &["*"],
    };
    dialog = dialog.add_filter(filter_name, extensions);

    let path = dialog.blocking_save_file().ok_or("Save cancelled")?;

    tokio::fs::write(path.to_string(), &data)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}


