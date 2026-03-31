use crate::error::AppResult;
use crate::models::Slide;
use crate::presentation::{PRESENTATION, generate_song_slides, generate_bible_slide, generate_text_slide};
use crate::repositories::SongRepository;
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::{State, Manager};

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
    state: State<'_, AppState>,
    song_id: String,
) -> AppResult<PresentationInfo> {
    let conn = state.db.lock().unwrap();
    let song = SongRepository::get_by_id(&conn, &song_id)?;
    drop(conn);

    let slides = generate_song_slides(&song.lyrics, &song.title);
    
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.load_slides(slides);
    
    Ok(get_presentation_info(&presentation))
}

// Add slides to presentation
#[tauri::command]
pub async fn add_slides_to_presentation(
    slides: Vec<Slide>,
) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    
    for slide in slides {
        presentation.add_slide(slide);
    }
    
    Ok(get_presentation_info(&presentation))
}

// Add text slide
#[tauri::command]
pub async fn add_text_slide(
    title: Option<String>,
    content: String,
) -> AppResult<PresentationInfo> {
    let slide = generate_text_slide(title, content);
    
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.add_slide(slide);
    
    Ok(get_presentation_info(&presentation))
}

// Add bible slide
#[tauri::command]
pub async fn add_bible_slide(
    book: String,
    chapter: i32,
    verses: String,
    text: String,
) -> AppResult<PresentationInfo> {
    let slide = generate_bible_slide(&book, chapter, &verses, &text);
    
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.add_slide(slide);
    
    Ok(get_presentation_info(&presentation))
}

// Navigation commands
#[tauri::command]
pub async fn next_slide(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.next_slide()?;
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit_all("slide-changed", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn previous_slide(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.previous_slide()?;
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit_all("slide-changed", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn goto_slide(app: tauri::AppHandle, index: usize) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.goto_slide(index)?;
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit_all("slide-changed", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn toggle_blank(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.toggle_blank();
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit_all("blank-toggled", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn start_presentation(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.start_presentation();
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit_all("presentation-started", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn stop_presentation(app: tauri::AppHandle) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.stop_presentation();
    let info = get_presentation_info(&presentation);
    drop(presentation);
    
    // Emit event to output window
    app.emit_all("presentation-stopped", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn clear_presentation() -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.clear_slides();
    Ok(get_presentation_info(&presentation))
}

#[tauri::command]
pub async fn get_presentation_state() -> AppResult<PresentationInfo> {
    let presentation = PRESENTATION.lock().unwrap();
    Ok(get_presentation_info(&presentation))
}

#[tauri::command]
pub async fn remove_slide_from_presentation(
    index: usize,
) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.remove_slide(index)?;
    Ok(get_presentation_info(&presentation))
}

#[tauri::command]
pub async fn reorder_presentation_slides(
    from: usize,
    to: usize,
) -> AppResult<PresentationInfo> {
    let mut presentation = PRESENTATION.lock().unwrap();
    presentation.reorder_slides(from, to)?;
    Ok(get_presentation_info(&presentation))
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
    use tauri::{WindowBuilder, WindowUrl};

    // If window already exists, just show and focus it
    if let Some(win) = app.get_window("output") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Get monitors via the main window since AppHandle doesn't have these methods directly in v1
    let main_win = app.get_window("main").ok_or("Main window not found")?;
    let monitors = main_win.available_monitors().map_err(|e| e.to_string())?;
    let primary = main_win.primary_monitor().map_err(|e| e.to_string())?;

    // Try to find a non-primary monitor (the projector / TV)
    let target = if monitors.len() > 1 {
        let primary_name = primary.as_ref().and_then(|m| m.name().cloned());
        monitors.into_iter().find(|m| {
            m.name().cloned() != primary_name
        }).or_else(|| main_win.primary_monitor().ok().flatten())
    } else {
        primary
    };

    let (x, y, go_fullscreen) = if let Some(mon) = target {
        let pos = mon.position();
        let mon_name = mon.name().cloned();
        let primary_name = main_win.primary_monitor().ok().flatten().and_then(|p| p.name().cloned());
        let is_secondary = primary_name.is_some() && mon_name.is_some() && primary_name != mon_name;
        (pos.x as f64, pos.y as f64, is_secondary)
    } else {
        (100.0, 100.0, false)
    };

    let win = WindowBuilder::new(&app, "output", WindowUrl::App("output.html".into()))
        .title("Presentation Output")
        .decorations(false)
        .skip_taskbar(true)
        .position(x, y)
        .inner_size(1280.0, 720.0)
        .build()
        .map_err(|e| e.to_string())?;

    if go_fullscreen {
        win.set_fullscreen(true).map_err(|e| e.to_string())?;
    } else {
        win.center().map_err(|e| e.to_string())?;
    }

    win.show().map_err(|e| e.to_string())?;
    Ok(())
}

// Close / hide the presentation output window
#[tauri::command]
pub async fn close_presentation_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_window("output") {
        win.hide().map_err(|e| e.to_string())?;
    }
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
    app.emit_all("slide-changed", &info).ok();

    Ok(info)
}
