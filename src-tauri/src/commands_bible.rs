use crate::error::{AppError, AppResult};
use crate::models::BibleVerse;
use crate::repositories::bible::BibleRepository;
use crate::AppState;
use serde::Deserialize;
use tauri::State;
use std::fs::File;
use std::io::BufReader;

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
) -> AppResult<Vec<(String, String, i32)>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::get_books(&conn)
}

#[tauri::command]
pub async fn get_bible_verses(
    state: State<'_, AppState>,
    book: String,
    chapter: i32,
    start_verse: i32,
    end_verse: Option<i32>,
) -> AppResult<Vec<BibleVerse>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::get_verses(&conn, &book, chapter, start_verse, end_verse)
}

#[tauri::command]
pub async fn get_chapter_verses(
    state: State<'_, AppState>,
    book: String,
    chapter: i32,
) -> AppResult<Vec<BibleVerse>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::get_chapter_verses(&conn, &book, chapter)
}

#[tauri::command]
pub async fn search_bible(
    state: State<'_, AppState>,
    query: String,
) -> AppResult<Vec<BibleVerse>> {
    let conn = state.db.lock().unwrap();
    BibleRepository::search_verses(&conn, &query)
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
    log::info!("Starting full KJV Bible import...");
    println!("DEBUG: Starting full KJV Bible import...");

    // Try multiple possible locations for the resource to be more resilient
    let resource_path = app_handle
        .path_resolver()
        .resolve_resource("resources/kjv_bible.json")
        .filter(|p| p.exists()) // Only use if it actually exists
        .or_else(|| {
            // Fallback 1: Try finding it relative to the current working directory (useful during cargo run from root)
            let current_dir = std::env::current_dir().ok()?;
            let paths = vec![
                current_dir.join("src-tauri").join("resources").join("kjv_bible.json"),
                current_dir.join("resources").join("kjv_bible.json"),
                current_dir.join("target").join("debug").join("resources").join("kjv_bible.json"),
                current_dir.join("src-tauri").join("target").join("debug").join("resources").join("kjv_bible.json"),
            ];
            
            for path in paths {
                if path.exists() {
                    println!("DEBUG: Found Bible JSON at fallback path: {:?}", path);
                    return Some(path);
                }
            }
            None
        })
        .or_else(|| {
            // Fallback 2: Using app_data_dir for deployed apps
            let app_dir = app_handle.path_resolver().app_data_dir()?;
            let path = app_dir.join("resources").join("kjv_bible.json");
            if path.exists() { Some(path) } else { None }
        })
        .ok_or_else(|| {
            println!("DEBUG ERROR: Could not resolve kjv_bible.json resource path");
            AppError::Unknown(
                "Could not resolve kjv_bible.json resource path. Ensure the file exists in src-tauri/resources/".to_string(),
            )
        })?;

    println!("DEBUG: Resolved Bible resource path: {:?}", resource_path);

    // Open the file with a buffered reader for efficiency
    let file = File::open(&resource_path)
        .map_err(|e| {
            println!("DEBUG ERROR: Failed to open Bible JSON file at {:?}: {}", resource_path, e);
            AppError::Unknown(format!("Failed to open Bible JSON: {}", e))
        })?;
    let reader = BufReader::new(file);

    // Parse the JSON directly from the reader
    let bible_data: BibleDataJson = serde_json::from_reader(reader)
        .map_err(|e| {
            log::error!("Failed to parse Bible JSON: {}", e);
            AppError::Unknown(format!("Failed to parse Bible JSON: {}", e))
        })?;

    log::info!("Successfully parsed Bible JSON. Starting database insertion...");

    // Convert to flat verse tuples
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

    let count = verses.len();
    log::info!("Flattened {} verses. Beginning transaction...", count);

    let conn = state.db.lock().unwrap();

    // Initialize the canonical book list first
    BibleRepository::initialize_books(&conn)?;

    // Bulk import all verses
    BibleRepository::bulk_import_verses(&conn, verses)?;

    log::info!("Successfully imported {} verses into the database.", count);
    Ok(count)
}

#[tauri::command]
pub async fn import_full_kjv_bible(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> AppResult<usize> {
    perform_bible_import(&app_handle, &state)
}
