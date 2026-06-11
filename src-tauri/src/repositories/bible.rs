use crate::error::{AppError, AppResult};
use crate::models::BibleVerse;
use rusqlite::Connection;

pub struct BibleRepository;

impl BibleRepository {
    pub fn initialize_books(conn: &Connection) -> AppResult<()> {
        // Initialize Bible books list
        let books = vec![
            ("Genesis", "OT", 50),
            ("Exodus", "OT", 40),
            ("Leviticus", "OT", 27),
            ("Numbers", "OT", 36),
            ("Deuteronomy", "OT", 34),
            ("Joshua", "OT", 24),
            ("Judges", "OT", 21),
            ("Ruth", "OT", 4),
            ("1 Samuel", "OT", 31),
            ("2 Samuel", "OT", 24),
            ("1 Kings", "OT", 22),
            ("2 Kings", "OT", 25),
            ("1 Chronicles", "OT", 29),
            ("2 Chronicles", "OT", 36),
            ("Ezra", "OT", 10),
            ("Nehemiah", "OT", 13),
            ("Esther", "OT", 10),
            ("Job", "OT", 42),
            ("Psalms", "OT", 150),
            ("Proverbs", "OT", 31),
            ("Ecclesiastes", "OT", 12),
            ("Song of Solomon", "OT", 8),
            ("Isaiah", "OT", 66),
            ("Jeremiah", "OT", 52),
            ("Lamentations", "OT", 5),
            ("Ezekiel", "OT", 48),
            ("Daniel", "OT", 12),
            ("Hosea", "OT", 14),
            ("Joel", "OT", 3),
            ("Amos", "OT", 9),
            ("Obadiah", "OT", 1),
            ("Jonah", "OT", 4),
            ("Micah", "OT", 7),
            ("Nahum", "OT", 3),
            ("Habakkuk", "OT", 3),
            ("Zephaniah", "OT", 3),
            ("Haggai", "OT", 2),
            ("Zechariah", "OT", 14),
            ("Malachi", "OT", 4),
            ("Matthew", "NT", 28),
            ("Mark", "NT", 16),
            ("Luke", "NT", 24),
            ("John", "NT", 21),
            ("Acts", "NT", 28),
            ("Romans", "NT", 16),
            ("1 Corinthians", "NT", 16),
            ("2 Corinthians", "NT", 13),
            ("Galatians", "NT", 6),
            ("Ephesians", "NT", 6),
            ("Philippians", "NT", 4),
            ("Colossians", "NT", 4),
            ("1 Thessalonians", "NT", 5),
            ("2 Thessalonians", "NT", 3),
            ("1 Timothy", "NT", 6),
            ("2 Timothy", "NT", 4),
            ("Titus", "NT", 3),
            ("Philemon", "NT", 1),
            ("Hebrews", "NT", 13),
            ("James", "NT", 5),
            ("1 Peter", "NT", 5),
            ("2 Peter", "NT", 3),
            ("1 John", "NT", 5),
            ("2 John", "NT", 1),
            ("3 John", "NT", 1),
            ("Jude", "NT", 1),
            ("Revelation", "NT", 22),
        ];

        for (idx, (name, testament, chapters)) in books.iter().enumerate() {
            conn.execute(
                "INSERT OR IGNORE INTO bible_books (id, name, testament, chapters) 
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![idx + 1, name, testament, chapters],
            )?;
        }

        Ok(())
    }

    pub fn add_verse(
        conn: &Connection,
        book: &str,
        chapter: i32,
        verse: i32,
        text: &str,
        version: &str,
    ) -> AppResult<BibleVerse> {
        conn.execute(
            "INSERT INTO bible_verses (book, chapter, verse, text, version)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![book, chapter, verse, text, version],
        )?;

        let id = conn.last_insert_rowid() as i32;
        Self::get_verse_by_id(conn, id)
    }

    pub fn get_verse_by_id(conn: &Connection, id: i32) -> AppResult<BibleVerse> {
        let mut stmt = conn.prepare(
            "SELECT id, book, chapter, verse, text, version 
             FROM bible_verses WHERE id = ?1"
        )?;

        let verse = stmt.query_row([id], |row| {
            Ok(BibleVerse {
                id: row.get(0)?,
                book: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
                version: row.get(5)?,
            })
        }).map_err(|_| AppError::NotFound(format!("Verse with id {} not found", id)))?;

        Ok(verse)
    }

    pub fn get_verses(
        conn: &Connection,
        book: &str,
        chapter: i32,
        start_verse: i32,
        end_verse: Option<i32>,
        version: Option<&str>,
    ) -> AppResult<Vec<BibleVerse>> {
        let end = end_verse.unwrap_or(9999);

        let (sql, params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match version {
            Some(v) => (
                "SELECT id, book, chapter, verse, text, version 
                 FROM bible_verses 
                 WHERE book = ?1 AND chapter = ?2 AND verse >= ?3 AND verse <= ?4 AND version = ?5
                 ORDER BY verse ASC".to_string(),
                vec![
                    Box::new(book.to_string()),
                    Box::new(chapter),
                    Box::new(start_verse),
                    Box::new(end),
                    Box::new(v.to_string()),
                ],
            ),
            None => (
                "SELECT id, book, chapter, verse, text, version 
                 FROM bible_verses 
                 WHERE book = ?1 AND chapter = ?2 AND verse >= ?3 AND verse <= ?4
                 ORDER BY verse ASC".to_string(),
                vec![
                    Box::new(book.to_string()),
                    Box::new(chapter),
                    Box::new(start_verse),
                    Box::new(end),
                ],
            ),
        };

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let verses = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(BibleVerse {
                id: row.get(0)?,
                book: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
                version: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(verses)
    }

    /// Returns every verse in a given chapter (no verse range needed)
    pub fn get_chapter_verses(
        conn: &Connection,
        book: &str,
        chapter: i32,
        version: Option<&str>,
    ) -> AppResult<Vec<BibleVerse>> {
        let (sql, params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match version {
            Some(v) => (
                "SELECT id, book, chapter, verse, text, version 
                 FROM bible_verses 
                 WHERE book = ?1 AND chapter = ?2 AND version = ?3
                 ORDER BY verse ASC".to_string(),
                vec![
                    Box::new(book.to_string()),
                    Box::new(chapter),
                    Box::new(v.to_string()),
                ],
            ),
            None => (
                "SELECT id, book, chapter, verse, text, version 
                 FROM bible_verses 
                 WHERE book = ?1 AND chapter = ?2
                 ORDER BY verse ASC".to_string(),
                vec![
                    Box::new(book.to_string()),
                    Box::new(chapter),
                ],
            ),
        };

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let verses = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(BibleVerse {
                id: row.get(0)?,
                book: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
                version: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(verses)
    }

    pub fn search_verses(
        conn: &Connection,
        query: &str,
        version: Option<&str>,
    ) -> AppResult<Vec<BibleVerse>> {
        let search_pattern = format!("%{}%", query);

        let (sql, params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match version {
            Some(v) => (
                "SELECT id, book, chapter, verse, text, version 
                 FROM bible_verses 
                 WHERE text LIKE ?1 AND version = ?2
                 ORDER BY book, chapter, verse
                 LIMIT 50".to_string(),
                vec![
                    Box::new(search_pattern),
                    Box::new(v.to_string()),
                ],
            ),
            None => (
                "SELECT id, book, chapter, verse, text, version 
                 FROM bible_verses 
                 WHERE text LIKE ?1
                 ORDER BY book, chapter, verse
                 LIMIT 50".to_string(),
                vec![
                    Box::new(search_pattern),
                ],
            ),
        };

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let verses = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(BibleVerse {
                id: row.get(0)?,
                book: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
                version: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(verses)
    }

    pub fn get_available_versions(conn: &Connection) -> AppResult<Vec<String>> {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT version FROM bible_verses ORDER BY version"
        )?;
        let versions = stmt.query_map([], |row| row.get(0))?
            .collect::<rusqlite::Result<Vec<String>>>()?;
        Ok(versions)
    }

    pub fn get_verse_count_for_version(conn: &Connection, version: &str) -> AppResult<i64> {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bible_verses WHERE version = ?1",
            rusqlite::params![version],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    pub fn get_books(conn: &Connection) -> AppResult<Vec<(String, String, i32)>> {
        let mut stmt = conn.prepare(
            "SELECT name, testament, chapters FROM bible_books ORDER BY id"
        )?;

        let books = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(books)
    }

    pub fn get_books_for_version(conn: &Connection, version: &str) -> AppResult<Vec<(String, String, i32)>> {
        // Get distinct books from bible_verses for this version, ordered by first occurrence
        let mut stmt = conn.prepare(
            "SELECT book, MAX(chapter) as chapters, MIN(id) as ordering
             FROM bible_verses
             WHERE version = ?1
             GROUP BY book
             ORDER BY ordering"
        )?;

        let rows: Vec<(String, i32, i32)> = stmt.query_map(rusqlite::params![version], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

        // Determine testament: first 39 books are OT, rest are NT (standard canon)
        let books: Vec<(String, String, i32)> = rows.into_iter().enumerate().map(|(idx, (name, chapters, _))| {
            let testament = if idx < 39 { "OT" } else { "NT" };
            (name, testament.to_string(), chapters)
        }).collect();

        Ok(books)
    }

    pub fn bulk_import_verses(
        conn: &Connection,
        verses: Vec<(String, i32, i32, String, String)>, // (book, chapter, verse, text, version)
    ) -> AppResult<usize> {
        let tx = conn.unchecked_transaction()?;
        
        let mut count = 0;
        for (book, chapter, verse, text, version) in verses {
            tx.execute(
                "INSERT OR REPLACE INTO bible_verses (book, chapter, verse, text, version)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![book, chapter, verse, text, version],
            )?;
            count += 1;
        }
        
        tx.commit()?;
        Ok(count)
    }

    pub fn get_verse_count(conn: &Connection) -> AppResult<i64> {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bible_verses",
            [],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    pub fn delete_version(conn: &Connection, version: &str) -> AppResult<usize> {
        let count = conn.execute(
            "DELETE FROM bible_verses WHERE version = ?1",
            rusqlite::params![version],
        )?;
        Ok(count)
    }

    pub fn get_version_stats(conn: &Connection) -> AppResult<Vec<(String, i64)>> {
        let mut stmt = conn.prepare(
            "SELECT version, COUNT(*) as cnt FROM bible_verses GROUP BY version ORDER BY version"
        )?;
        let stats = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(stats)
    }
}
