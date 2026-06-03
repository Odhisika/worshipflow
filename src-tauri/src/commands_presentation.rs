use crate::error::AppResult;
use crate::models::Slide;
use crate::presentation::{PRESENTATION, generate_song_slides, generate_bible_slide, generate_text_slide};

use crate::repositories::SongRepository;
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, State, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresentationInfo {
    pub current_index: usize,
    pub total_slides: usize,
    pub is_live: bool,
    pub is_blank: bool,
    pub current_slide: Option<Slide>,
    pub next_slide: Option<Slide>,
}

// Load song into presentation
#[tauri::command]
pub async fn load_song_to_presentation(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    song_id: String,
) -> AppResult<PresentationInfo> {
    let conn = state.db.lock().unwrap();
    let song = SongRepository::get_by_id(&conn, &song_id)?;
    drop(conn);

    let slides = generate_song_slides(&song.lyrics, &song.title);

    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.load_slides(slides);
    let info = get_presentation_info(&presentation);
    drop(presentation);

    app.emit("slide-changed", &info).ok();
    Ok(info)
}

// Add slides to presentation
#[tauri::command]
pub async fn add_slides_to_presentation(
    app: tauri::AppHandle,
    slides: Vec<Slide>,
) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    for slide in slides {
        presentation.add_slide(slide);
    }
    let info = get_presentation_info(&presentation);
    drop(presentation);

    app.emit("slide-changed", &info).ok();
    Ok(info)
}

// Add text slide — navigates immediately to the new slide so it shows on the output window
#[tauri::command]
pub async fn add_text_slide(
    app: tauri::AppHandle,
    title: Option<String>,
    content: String,
) -> AppResult<PresentationInfo> {
    let slide = generate_text_slide(title, content);

    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.add_slide_and_goto(slide);
    let info = get_presentation_info(&presentation);
    drop(presentation);

    app.emit("slide-changed", &info).ok();
    Ok(info)
}

// Add bible slide — navigates immediately to the new slide so it shows on the output window
#[tauri::command]
pub async fn add_bible_slide(
    app: tauri::AppHandle,
    book: String,
    chapter: i32,
    verses: String,
    text: String,
) -> AppResult<PresentationInfo> {
    let slide = generate_bible_slide(&book, chapter, &verses, &text);

    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.add_slide_and_goto(slide);
    let info = get_presentation_info(&presentation);
    drop(presentation);

    app.emit("slide-changed", &info).ok();
    Ok(info)
}

// Navigation commands
#[tauri::command]
pub async fn next_slide(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.next_slide()?;
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit("slide-changed", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn previous_slide(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.previous_slide()?;
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit("slide-changed", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn goto_slide(app: tauri::AppHandle, index: usize) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.goto_slide(index)?;
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit("slide-changed", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn toggle_blank(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.toggle_blank();
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit("blank-toggled", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn start_presentation(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.start_presentation();
    let info = get_presentation_info(&presentation);
    drop(presentation);

    app.emit("presentation-started", &info).ok();
    // Also emit slide-changed so the output window updates regardless of which event it catches first
    app.emit("slide-changed", &info).ok();

    Ok(info)
}

#[tauri::command]
pub async fn stop_presentation(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.stop_presentation();
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit("presentation-stopped", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn clear_presentation(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.clear_slides();
    let info = get_presentation_info(&presentation);
    drop(presentation);

    app.emit("slide-changed", &info).ok();
    Ok(info)
}

#[tauri::command]
pub async fn get_presentation_state() -> AppResult<PresentationInfo> {
    let presentation = PRESENTATION.lock().unwrap();
    Ok(get_presentation_info(&presentation))
}

#[tauri::command]
pub async fn remove_slide_from_presentation(
    app: tauri::AppHandle,
    index: usize,
) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.remove_slide(index)?;
    let info = get_presentation_info(&presentation);
    drop(presentation);

    app.emit("slide-changed", &info).ok();
    Ok(info)
}

#[tauri::command]
pub async fn reorder_presentation_slides(
    app: tauri::AppHandle,
    from: usize,
    to: usize,
) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.reorder_slides(from, to)?;
    let info = get_presentation_info(&presentation);
    drop(presentation);

    app.emit("slide-changed", &info).ok();
    Ok(info)
}

// Helper function
fn get_presentation_info(presentation: &crate::presentation::PresentationState) -> PresentationInfo {
    PresentationInfo {
        current_index: presentation.current_index,
        total_slides: presentation.slides.len(),
        is_live: presentation.is_live,
        is_blank: presentation.is_blank,
        current_slide: presentation.get_current_slide().cloned(),
        next_slide: presentation.get_next_slide().cloned(),
    }
}

// Open the presentation output window on the best available monitor
#[tauri::command]
pub async fn open_presentation_window(app: tauri::AppHandle) -> Result<(), String> {
    // If window already exists, ensure it's visible and push current state so it re-syncs
    if let Some(win) = app.get_webview_window("output") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        win.set_fullscreen(true).map_err(|e| e.to_string())?;
        // Push current state directly to the output window so it doesn't rely on a stale loadState
        let info = {
            let presentation = PRESENTATION.lock().unwrap();
            get_presentation_info(&presentation)
        };
        app.emit("slide-changed", &info).ok();
        return Ok(());
    }

    let main_win = app.get_webview_window("main").ok_or("Main window not found")?;
    let monitors = main_win.available_monitors().map_err(|e| e.to_string())?;
    let primary = main_win.primary_monitor().map_err(|e| e.to_string())?;

    // Find a secondary monitor by comparing positions (names may be None on Linux)
    let target = if monitors.len() > 1 {
        let primary_pos = primary.as_ref().map(|m| m.position());
        monitors.into_iter().find(|m| {
            match primary_pos {
                Some(pp) => {
                    let p = m.position();
                    p.x != pp.x || p.y != pp.y
                }
                None => false,
            }
        }).or_else(|| main_win.primary_monitor().ok().flatten())
    } else {
        primary
    };

    // Use the monitor's real size; fall back to 1920×1080 if detection fails
    let (x, y, w, h) = if let Some(mon) = &target {
        let pos = mon.position();
        let size = mon.size();
        (pos.x as f64, pos.y as f64, size.width as f64, size.height as f64)
    } else {
        (0.0, 0.0, 1920.0, 1080.0)
    };

    let win = tauri::WebviewWindowBuilder::new(&app, "output", tauri::WebviewUrl::App("output.html".into()))
        .title("Presentation Output")
        .decorations(false)
        .skip_taskbar(true)
        .position(x, y)
        .inner_size(w, h)
        .build()
        .map_err(|e| e.to_string())?;

    // Always go fullscreen so it covers the entire monitor
    win.set_fullscreen(true).map_err(|e| e.to_string())?;
    win.show().map_err(|e| e.to_string())?;
    Ok(())
}

// Close / hide the presentation output window
#[tauri::command]
pub async fn close_presentation_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("output") {
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Open the church management window as a separate, draggable window
#[tauri::command]
pub async fn open_admin_window(app: tauri::AppHandle) -> Result<(), String> {
    // If already open, just focus it
    if let Some(win) = app.get_webview_window("admin") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let win = tauri::WebviewWindowBuilder::new(
        &app,
        "admin",
        tauri::WebviewUrl::App("admin.html".into()),
    )
    .title("Church Management — WorshipFlow Pro")
    .inner_size(1400.0, 900.0)
    .min_inner_size(1024.0, 700.0)
    .resizable(true)
    .decorations(true)   // keep the title bar so the user can drag & close it
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    win.show().map_err(|e| e.to_string())?;
    Ok(())
}

// Set a background (builtin: CSS theme key, or absolute file path) on ALL slides
#[tauri::command]
pub async fn set_presentation_background(
    app: tauri::AppHandle,
    background: Option<String>,
) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    for slide in presentation.slides.iter_mut() {
        slide.background_path = background.clone();
    }
    let info = get_presentation_info(&presentation);
    drop(presentation);

    // Push update to output window if live
    app.emit("slide-changed", &info).ok();

    Ok(info)
}
