use crate::error::{AppError, AppResult};
use crate::models::{Song, CreateSongRequest};
use rusqlite::Connection;
use chrono::Utc;
use uuid::Uuid;

pub struct SongRepository;

impl SongRepository {
    pub fn create(conn: &Connection, request: CreateSongRequest) -> AppResult<Song> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let tags_json = serde_json::to_string(&request.tags.unwrap_or_default())?;

        conn.execute(
            "INSERT INTO songs (id, title, lyrics, key, tempo, tags, chords, show_chords, arrangement, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                &id,
                &request.title,
                &request.lyrics,
                &request.key,
                &request.tempo,
                &tags_json,
                &request.chords,
                &request.show_chords.unwrap_or(false),
                &request.arrangement,
                &now.to_rfc3339(),
                &now.to_rfc3339(),
            ],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> AppResult<Song> {
        let mut stmt = conn.prepare(
            "SELECT id, title, lyrics, key, tempo, tags, chords, show_chords, arrangement, created_at, updated_at 
             FROM songs WHERE id = ?1"
        )?;

        let song = stmt.query_row([id], |row| {
            let tags_json: String = row.get(5)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            Ok(Song {
                id: row.get(0)?,
                title: row.get(1)?,
                lyrics: row.get(2)?,
                key: row.get(3)?,
                tempo: row.get(4)?,
                tags,
                chords: row.get(6)?,
                show_chords: row.get::<_, i32>(7)? != 0,
                arrangement: row.get(8)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        }).map_err(|_| AppError::NotFound(format!("Song with id {} not found", id)))?;

        Ok(song)
    }

    pub fn get_all(conn: &Connection) -> AppResult<Vec<Song>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, lyrics, key, tempo, tags, chords, show_chords, arrangement, created_at, updated_at 
             FROM songs ORDER BY title ASC"
        )?;

        let songs = stmt.query_map([], |row| {
            let tags_json: String = row.get(5)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            Ok(Song {
                id: row.get(0)?,
                title: row.get(1)?,
                lyrics: row.get(2)?,
                key: row.get(3)?,
                tempo: row.get(4)?,
                tags,
                chords: row.get(6)?,
                show_chords: row.get::<_, i32>(7)? != 0,
                arrangement: row.get(8)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(songs)
    }

    pub fn search(conn: &Connection, query: &str) -> AppResult<Vec<Song>> {
        let search_pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, title, lyrics, key, tempo, tags, chords, show_chords, arrangement, created_at, updated_at 
             FROM songs 
             WHERE title LIKE ?1 OR lyrics LIKE ?1 
             ORDER BY title ASC"
        )?;
    
        let songs = stmt.query_map([&search_pattern], |row| {
            let tags_json: String = row.get(5)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
                
            Ok(Song {
                id: row.get(0)?,
                title: row.get(1)?,
                lyrics: row.get(2)?,
                key: row.get(3)?,
                tempo: row.get(4)?,
                tags,
                chords: row.get(6)?,
                show_chords: row.get::<_, i32>(7)? != 0,
                arrangement: row.get(8)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    
        Ok(songs)
    }

    pub fn update(conn: &Connection, id: &str, request: CreateSongRequest) -> AppResult<Song> {
        let now = Utc::now();
        let tags_json = serde_json::to_string(&request.tags.unwrap_or_default())?;

        let rows_affected = conn.execute(
            "UPDATE songs 
             SET title = ?1, lyrics = ?2, key = ?3, tempo = ?4, tags = ?5, chords = ?6, show_chords = ?7, arrangement = ?8, updated_at = ?9
             WHERE id = ?10",
            rusqlite::params![
                &request.title,
                &request.lyrics,
                &request.key,
                &request.tempo,
                &tags_json,
                &request.chords,
                &request.show_chords.unwrap_or(false),
                &request.arrangement,
                &now.to_rfc3339(),
                id,
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Song with id {} not found", id)));
        }

        Self::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
        let rows_affected = conn.execute("DELETE FROM songs WHERE id = ?1", [id])?;
        
        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Song with id {} not found", id)));
        }

        Ok(())
    }
}
