use crate::capture::{CAPTURE_STATE, CAPTURE_RUNNING};
use crate::error::{AppError, AppResult};
use crate::models::{Slide, SlideType};
use crate::presentation::{PRESENTATION, generate_presentation_info};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::time::Duration;
use tauri::{Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapturableWindow {
    pub id: String,
    pub title: String,
    pub app_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureStateInfo {
    pub is_capturing: bool,
    pub window_title: String,
    pub current_frame_path: Option<String>,
}

/// Check if a CLI tool is available
fn tool_exists(name: &str) -> bool {
    std::process::Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Detect available screenshot tools
fn detect_capture_tool() -> Option<&'static str> {
    if tool_exists("import") {
        return Some("import");
    }
    if tool_exists("maim") {
        return Some("maim");
    }
    if tool_exists("grim") {
        return Some("grim");
    }
    if tool_exists("scrot") {
        return Some("scrot");
    }
    if tool_exists("spectacle") {
        return Some("spectacle");
    }
    None
}

/// List open windows using available CLI tools
fn list_windows_via_wmctrl() -> Vec<CapturableWindow> {
    let mut windows = Vec::new();

    if let Ok(output) = std::process::Command::new("wmctrl")
        .args(["-l"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.splitn(4, ' ').collect();
                if parts.len() >= 4 {
                    let win_id = parts[0].to_string();
                    let app_name = parts[2].to_string();
                    let title = parts[3].to_string();
                    if !title.is_empty() {
                        windows.push(CapturableWindow {
                            id: win_id,
                            title,
                            app_name,
                        });
                    }
                }
            }
        }
    }

    windows
}

// ─────────────────────────────────────────────
// Window Capture Commands (CLI-based)
// ─────────────────────────────────────────────

#[tauri::command]
pub async fn list_capturable_windows() -> AppResult<Vec<CapturableWindow>> {
    let tool = detect_capture_tool();
    if tool.is_none() {
        return Err(AppError::Unknown(
            "No screenshot tool found. Install ImageMagick (`import`), `maim`, `grim`, or `scrot`."
                .to_string(),
        ));
    }

    let windows = list_windows_via_wmctrl();
    Ok(windows)
}

#[tauri::command]
pub async fn start_window_capture(
    app: tauri::AppHandle,
    window_id: String,
    window_title: String,
) -> AppResult<String> {
    let tool = detect_capture_tool().ok_or_else(|| {
        AppError::Unknown(
            "No screenshot tool found. Install ImageMagick (`import`), `maim`, or `grim`."
                .to_string(),
        )
    })?;

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| AppError::Unknown(format!("Cache dir: {}", e)))?
        .join("window-capture");
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| AppError::Unknown(format!("Create cache dir: {}", e)))?;

    {
        let mut state = CAPTURE_STATE.lock().unwrap();
        state.is_capturing = true;
        state.window_id = window_id.clone();
        state.window_title = window_title.clone();
        state.current_frame_path = None;
    }

    CAPTURE_RUNNING.store(true, Ordering::SeqCst);

    let tool_str = tool.to_string();
    let win_id = window_id.clone();
    let cache_dir_str = cache_dir.to_string_lossy().to_string();

    std::thread::spawn(move || {
        let mut frame_counter = 0u64;
        while CAPTURE_RUNNING.load(Ordering::SeqCst) {
            let should_capture = {
                let state = CAPTURE_STATE.lock().unwrap();
                state.is_capturing
            };

            if !should_capture {
                std::thread::sleep(Duration::from_millis(200));
                continue;
            }

            frame_counter += 1;
            let frame_path = PathBuf::from(&cache_dir_str).join(format!("frame-{:06}.png", frame_counter));

            let result = match tool_str.as_str() {
                "import" => std::process::Command::new("import")
                    .args(["-window", &win_id, &frame_path.to_string_lossy()])
                    .output(),
                "maim" => std::process::Command::new("maim")
                    .args(["-i", &win_id, "--format", "png", &frame_path.to_string_lossy()])
                    .output(),
                "grim" => {
                    std::process::Command::new("grim")
                        .arg(frame_path.to_string_lossy().as_ref())
                        .output()
                }
                "scrot" => std::process::Command::new("scrot")
                    .args(["-u", &frame_path.to_string_lossy()])
                    .output(),
                _ => {
                    std::thread::sleep(Duration::from_millis(500));
                    continue;
                }
            };

            if let Ok(output) = result {
                if output.status.success() && frame_path.exists() {
                    // Clean up old frames (keep last 3)
                    let old_path = cache_dir_str.clone();
                    let old_frame = PathBuf::from(&old_path)
                        .join(format!("frame-{:06}.png", frame_counter.saturating_sub(3)));
                    let _ = std::fs::remove_file(&old_frame);

                    let mut state = CAPTURE_STATE.lock().unwrap();
                    state.current_frame_path = Some(frame_path.clone());
                }
            }

            let rate = {
                let state = CAPTURE_STATE.lock().unwrap();
                state.capture_rate_ms
            };
            std::thread::sleep(Duration::from_millis(rate));
        }
    });

    Ok(format!("Capture started using {}", tool))
}

#[tauri::command]
pub async fn stop_window_capture(app: tauri::AppHandle) -> AppResult<CaptureStateInfo> {
    CAPTURE_RUNNING.store(false, Ordering::SeqCst);

    let info = {
        let mut state = CAPTURE_STATE.lock().unwrap();
        state.is_capturing = false;
        CaptureStateInfo {
            is_capturing: false,
            window_title: state.window_title.clone(),
            current_frame_path: state
                .current_frame_path
                .as_ref()
                .map(|p| p.to_string_lossy().to_string()),
        }
    };

    let _ = app.emit("capture-stopped", &info);
    Ok(info)
}

#[tauri::command]
pub async fn get_capture_state() -> AppResult<CaptureStateInfo> {
    let state = CAPTURE_STATE.lock().unwrap();
    Ok(CaptureStateInfo {
        is_capturing: state.is_capturing,
        window_title: state.window_title.clone(),
        current_frame_path: state
            .current_frame_path
            .as_ref()
            .map(|p| p.to_string_lossy().to_string()),
    })
}

#[tauri::command]
pub async fn present_window_capture_slide(app: tauri::AppHandle) -> AppResult<()> {
    let (is_capturing, frame_path) = {
        let state = CAPTURE_STATE.lock().unwrap();
        (state.is_capturing, state.current_frame_path.clone())
    };

    if !is_capturing {
        return Err(AppError::InvalidInput("No active window capture".to_string()));
    }

    let path_str = frame_path
        .as_ref()
        .and_then(|p| p.to_str())
        .unwrap_or("")
        .to_string();

    if path_str.is_empty() {
        return Err(AppError::InvalidInput("No captured frame available yet".to_string()));
    }

    let slide = Slide {
        id: uuid::Uuid::new_v4().to_string(),
        slide_type: SlideType::Capture,
        title: Some("External Bible (Window Capture)".to_string()),
        content: String::new(),
        media_path: Some(path_str),
        background_path: None,
        order_index: 0,
        created_at: chrono::Utc::now(),
    };

    let mut pres = PRESENTATION.lock().unwrap();
    pres.add_slide_and_goto(slide);
    let info = generate_presentation_info(&pres);
    let _ = app.emit("slide-changed", &info);

    Ok(())
}

// ─────────────────────────────────────────────
// Bible Web Presentation
// ─────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct BibleWebInfo {
    pub url: String,
    pub title: String,
}

#[tauri::command]
pub async fn present_bible_web(app: tauri::AppHandle, url: String) -> AppResult<BibleWebInfo> {
    let title = "Online Bible".to_string();

    let slide = Slide {
        id: uuid::Uuid::new_v4().to_string(),
        slide_type: SlideType::Capture,
        title: Some(title.clone()),
        content: url.clone(),
        media_path: None,
        background_path: None,
        order_index: 0,
        created_at: chrono::Utc::now(),
    };

    let mut pres = PRESENTATION.lock().unwrap();
    pres.add_slide_and_goto(slide);
    let info = generate_presentation_info(&pres);
    let _ = app.emit("slide-changed", &info);

    Ok(BibleWebInfo { url, title })
}

// ─────────────────────────────────────────────
// Media Presentation Commands
// ─────────────────────────────────────────────

#[tauri::command]
pub async fn present_image_slide(
    app: tauri::AppHandle,
    file_path: String,
    title: Option<String>,
) -> AppResult<()> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(AppError::InvalidInput(format!("Image file not found: {}", file_path)));
    }

    let slide = Slide {
        id: uuid::Uuid::new_v4().to_string(),
        slide_type: SlideType::Image,
        title: title.or_else(|| {
            path.file_stem()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
        }),
        content: String::new(),
        media_path: Some(file_path),
        background_path: None,
        order_index: 0,
        created_at: chrono::Utc::now(),
    };

    let mut pres = PRESENTATION.lock().unwrap();
    pres.add_slide_and_goto(slide);
    let info = generate_presentation_info(&pres);
    let _ = app.emit("slide-changed", &info);

    Ok(())
}

#[tauri::command]
pub async fn present_video_slide(app: tauri::AppHandle, file_path: String) -> AppResult<()> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(AppError::InvalidInput(format!("Video file not found: {}", file_path)));
    }

    let slide = Slide {
        id: uuid::Uuid::new_v4().to_string(),
        slide_type: SlideType::Video,
        title: path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string()),
        content: String::new(),
        media_path: Some(file_path),
        background_path: None,
        order_index: 0,
        created_at: chrono::Utc::now(),
    };

    let mut pres = PRESENTATION.lock().unwrap();
    pres.add_slide_and_goto(slide);
    let info = generate_presentation_info(&pres);
    let _ = app.emit("slide-changed", &info);

    Ok(())
}

#[tauri::command]
pub async fn present_audio_slide(app: tauri::AppHandle, file_path: String) -> AppResult<()> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(AppError::InvalidInput(format!("Audio file not found: {}", file_path)));
    }

    let slide = Slide {
        id: uuid::Uuid::new_v4().to_string(),
        slide_type: SlideType::Audio,
        title: path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string()),
        content: String::new(),
        media_path: Some(file_path),
        background_path: None,
        order_index: 0,
        created_at: chrono::Utc::now(),
    };

    let mut pres = PRESENTATION.lock().unwrap();
    pres.add_slide_and_goto(slide);
    let info = generate_presentation_info(&pres);
    let _ = app.emit("slide-changed", &info);

    Ok(())
}
