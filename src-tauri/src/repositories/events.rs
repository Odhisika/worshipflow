use crate::error::AppResult;
use crate::models::{Event, CreateEventRequest, UpdateEventRequest};
use rusqlite::{params, Connection};
use chrono::Utc;
use uuid::Uuid;

pub struct EventRepository;

impl EventRepository {
    pub fn create(conn: &Connection, request: CreateEventRequest) -> AppResult<Event> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        conn.execute(
            "INSERT INTO events (id, title, description, date, time, location, category, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                request.title,
                request.description,
                request.date,
                request.time,
                request.location,
                request.category,
                now_str,
                now_str,
            ],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn get_all(conn: &Connection) -> AppResult<Vec<Event>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, description, date, time, location, category, created_at, updated_at 
             FROM events ORDER BY date ASC"
        )?;

        let events = stmt.query_map([], |row| {
            Ok(Event {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                date: row.get(3)?,
                time: row.get(4)?,
                location: row.get(5)?,
                category: row.get(6)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(events)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> AppResult<Event> {
        conn.query_row(
            "SELECT id, title, description, date, time, location, category, created_at, updated_at 
             FROM events WHERE id = ?1",
            [id],
            |row| {
                Ok(Event {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    date: row.get(3)?,
                    time: row.get(4)?,
                    location: row.get(5)?,
                    category: row.get(6)?,
                    created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                        .unwrap_or_else(|_| Utc::now().into())
                        .with_timezone(&Utc),
                    updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                        .unwrap_or_else(|_| Utc::now().into())
                        .with_timezone(&Utc),
                })
            },
        ).map_err(Into::into)
    }

    pub fn update(conn: &Connection, id: &str, request: UpdateEventRequest) -> AppResult<Event> {
        let now = Utc::now().to_rfc3339();

        if let Some(title) = request.title {
            conn.execute("UPDATE events SET title = ?1, updated_at = ?2 WHERE id = ?3", params![title, now, id])?;
        }
        if let Some(description) = request.description {
            conn.execute("UPDATE events SET description = ?1, updated_at = ?2 WHERE id = ?3", params![description, now, id])?;
        }
        if let Some(date) = request.date {
            conn.execute("UPDATE events SET date = ?1, updated_at = ?2 WHERE id = ?3", params![date, now, id])?;
        }
        if let Some(time) = request.time {
            conn.execute("UPDATE events SET time = ?1, updated_at = ?2 WHERE id = ?3", params![time, now, id])?;
        }
        if let Some(location) = request.location {
            conn.execute("UPDATE events SET location = ?1, updated_at = ?2 WHERE id = ?3", params![location, now, id])?;
        }
        if let Some(category) = request.category {
            conn.execute("UPDATE events SET category = ?1, updated_at = ?2 WHERE id = ?3", params![category, now, id])?;
        }

        Self::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
        conn.execute("DELETE FROM events WHERE id = ?1", [id])?;
        Ok(())
    }
}
