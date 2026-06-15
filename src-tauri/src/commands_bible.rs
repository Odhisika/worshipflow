use crate::bible_importer;
use crate::error::{AppError, AppResult};
use crate::models::BibleVerse;
use crate::repositories::bible::BibleRepository;
use crate::repositories::settings::SettingsRepository;
use crate::AppState;
use serde::Deserialize;
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

const ACTIVE_BIBLE_VERSION_KEY: &str = "active_bible_version";

#[derive(Deserialize)]
struct BibleVerseJson {
    verse: String,
    text: String,
}

#[derive(Deserialize)]
struct BibleChapterJson {
    chapter: String,
    verses: Vec<BibleVerseJson>,
}

#[derive(Deserialize)]
struct BibleBookJson {
    book: String,
    chapters: Vec<BibleChapterJson>,
}

#[derive(Deserialize)]
struct BibleDataJson {
    version: String,
    books: Vec<BibleBookJson>,
    #[allow(dead_code)]
    total_verses: Option<u32>,
}

#[tauri::command]
pub async fn get_bible_books(
    state: State<'_, AppState>,
    version: Option<String>,
) -> AppResult<Vec<(String, String, i32)>> {
    let conn = state.db.lock().unwrap();
    match version {
        Some(v) => BibleRepository::get_books_for_version(&conn, &v),
        None => BibleRepository::get_books(&conn),
    }
}

#[tauri::command]
pub async fn get_bible_verses(
    state: State<'_, AppState>,
    book: String,
    chapter: i32,
    start_verse: i32,
    end_verse: Option<i32>,
    version: Option<String>,
) -> AppResult<Vec<BibleVerse>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::get_verses(&conn, &book, chapter, start_verse, end_verse, version.as_deref())
}

#[tauri::command]
pub async fn get_chapter_verses(
    state: State<'_, AppState>,
    book: String,
    chapter: i32,
    version: Option<String>,
) -> AppResult<Vec<BibleVerse>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::get_chapter_verses(&conn, &book, chapter, version.as_deref())
}

#[tauri::command]
pub async fn search_bible(
    state: State<'_, AppState>,
    query: String,
    version: Option<String>,
) -> AppResult<Vec<BibleVerse>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::search_verses(&conn, &query, version.as_deref())
}

#[tauri::command]
pub async fn add_bible_verse(
    state: State<'_, AppState>,
    book: String,
    chapter: i32,
    verse: i32,
    text: String,
    version: String,
) -> AppResult<BibleVerse> {
    let conn = state.db.lock().unwrap();
    BibleRepository::add_verse(&conn, &book, chapter, verse, &text, &version)
}

#[tauri::command]
pub async fn initialize_bible_books(
    state: State<'_, AppState>,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    BibleRepository::initialize_books(&conn)
}

#[tauri::command]
pub async fn bulk_import_bible_verses(
    state: State<'_, AppState>,
    verses: Vec<(String, i32, i32, String, String)>,
) -> AppResult<usize> {
    let conn = state.db.lock().unwrap();
    BibleRepository::bulk_import_verses(&conn, verses)
}

#[tauri::command]
pub async fn get_bible_verse_count(
    state: State<'_, AppState>,
) -> AppResult<i64> {
    let conn = state.db.lock().unwrap();
    BibleRepository::get_verse_count(&conn)
}

pub fn perform_bible_import(
    app_handle: &tauri::AppHandle,
    state: &AppState,
) -> AppResult<usize> {
    perform_bible_import_from_file(app_handle, state, "kjv_bible.json", None)
}

pub fn perform_bible_import_from_file(
    app_handle: &tauri::AppHandle,
    state: &AppState,
    filename: &str,
    version_override: Option<&str>,
) -> AppResult<usize> {
    log::info!("Starting Bible import from {}...", filename);
    println!("DEBUG: Starting Bible import from {}...", filename);

    let resource_path = app_handle
        .path()
        .resolve(format!("resources/{}", filename), tauri::path::BaseDirectory::Resource)
        .ok()
        .filter(|p| p.exists())
        .or_else(|| {
            let current_dir = std::env::current_dir().ok()?;
            let paths = vec![
                current_dir.join("src-tauri").join("resources").join(filename),
                current_dir.join("resources").join(filename),
                current_dir.join("target").join("debug").join("resources").join(filename),
                current_dir.join("src-tauri").join("target").join("debug").join("resources").join(filename),
            ];
            for path in paths {
                if path.exists() {
                    println!("DEBUG: Found Bible file at fallback path: {:?}", path);
                    return Some(path);
                }
            }
            None
        })
        .or_else(|| {
            let app_dir = app_handle.path().app_data_dir().ok()?;
            let path = app_dir.join("resources").join(filename);
            if path.exists() { Some(path) } else { None }
        })
        .ok_or_else(|| {
            println!("DEBUG ERROR: Could not resolve {} resource path", filename);
            AppError::Unknown(format!(
                "Could not resolve {} resource path. Ensure the file exists in src-tauri/resources/",
                filename
            ))
        })?;

    println!("DEBUG: Resolved Bible resource path: {:?}", resource_path);

    let ext = resource_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let (version_name, verses) = if ext == "json" {
        // Parse native WorshipFlow JSON format
        let file = File::open(&resource_path)
            .map_err(|e| {
                println!("DEBUG ERROR: Failed to open Bible file at {:?}: {}", resource_path, e);
                AppError::Unknown(format!("Failed to open Bible file: {}", e))
            })?;
        let reader = BufReader::new(file);
        let bible_data: BibleDataJson = serde_json::from_reader(reader)
            .map_err(|e| {
                log::error!("Failed to parse Bible JSON: {}", e);
                AppError::Unknown(format!("Failed to parse Bible JSON: {}", e))
            })?;

        let mut verses: Vec<(String, i32, i32, String, String)> = Vec::new();
        let version = bible_data.version.clone();
        for book in &bible_data.books {
            for chapter in &book.chapters {
                let chapter_num: i32 = chapter.chapter.parse().unwrap_or(0);
                for verse in &chapter.verses {
                    let verse_num: i32 = verse.verse.parse().unwrap_or(0);
                    verses.push((
                        book.book.clone(),
                        chapter_num,
                        verse_num,
                        verse.text.clone(),
                        version.clone(),
                    ));
                }
            }
        }
        (version, verses)
    } else {
        // Use bible_importer for XML (Zefania, OSIS, Biblica, USFX) etc.
        let (mut xml_version, mut verses) = bible_importer::import_bible_file(&resource_path)?;
        // Override version name if provided (used for bundled files with simple names)
        if let Some(override_name) = version_override {
            xml_version = override_name.to_string();
            for v in &mut verses {
                v.4 = override_name.to_string();
            }
        }
        (xml_version, verses)
    };

    let count = verses.len();
    log::info!("Parsed {} verses for '{}'. Beginning transaction...", count, version_name);

    let conn = state.db.lock().unwrap();
    BibleRepository::initialize_books(&conn)?;
    BibleRepository::bulk_import_verses(&conn, verses)?;

    log::info!("Successfully imported {} verses for '{}' into the database.", count, version_name);
    Ok(count)
}

#[tauri::command]
pub async fn import_full_kjv_bible(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> AppResult<usize> {
    perform_bible_import(&app_handle, &state)
}

#[tauri::command]
pub async fn import_bible_version_file(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    filename: String,
) -> AppResult<usize> {
    perform_bible_import_from_file(&app_handle, &state, &filename, None)
}

#[tauri::command]
pub async fn get_bible_versions(
    state: State<'_, AppState>,
) -> AppResult<Vec<String>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::get_available_versions(&conn)
}

#[tauri::command]
pub async fn get_active_bible_version(
    state: State<'_, AppState>,
) -> AppResult<Option<String>> {
    let conn = state.db.lock().unwrap();
    SettingsRepository::get_key(&conn, ACTIVE_BIBLE_VERSION_KEY)
}

#[tauri::command]
pub async fn set_active_bible_version(
    state: State<'_, AppState>,
    version: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    SettingsRepository::set_key(&conn, ACTIVE_BIBLE_VERSION_KEY, &version)
}

#[tauri::command]
pub async fn import_bible_from_user_file(
    state: State<'_, AppState>,
    path: String,
) -> AppResult<(String, usize)> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(AppError::Unknown(format!("File not found: {}", path)));
    }

    let (version_name, verses) = bible_importer::import_bible_file(file_path)?;

    let conn = state.db.lock().unwrap();
    BibleRepository::initialize_books(&conn)?;
    let count = BibleRepository::bulk_import_verses(&conn, verses)?;

    log::info!(
        "Imported {} verses for version '{}' from {:?}",
        count,
        version_name,
        file_path.file_name().unwrap_or_default()
    );

    Ok((version_name, count))
}

#[tauri::command]
pub async fn delete_bible_version(
    state: State<'_, AppState>,
    version: String,
) -> AppResult<usize> {
    let conn = state.db.lock().unwrap();
    let count = BibleRepository::delete_version(&conn, &version)?;
    log::info!("Deleted {} verses for version '{}'", count, version);

    // Clear the active version setting if it was the deleted version
    if count > 0 {
        if let Ok(Some(active)) = SettingsRepository::get_key(&conn, ACTIVE_BIBLE_VERSION_KEY) {
            if active == version {
                let _ = SettingsRepository::set_key(&conn, ACTIVE_BIBLE_VERSION_KEY, "");
            }
        }
    }

    Ok(count)
}

#[tauri::command]
pub async fn get_bible_version_info(
    state: State<'_, AppState>,
) -> AppResult<Vec<(String, i64)>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::get_version_stats(&conn)
}

#[tauri::command]
pub async fn open_bible_file_dialog(app: tauri::AppHandle) -> AppResult<Option<String>> {
    let path = app
        .dialog()
        .file()
        .set_title("Select a Bible file to import")
        .add_filter("Bible Files", &["xml", "osis", "json"])
        .add_filter("XML Files (Zefania/OSIS)", &["xml", "osis"])
        .add_filter("WorshipFlow JSON", &["json"])
        .blocking_pick_file();

    Ok(path.map(|p| p.to_string()))
}
