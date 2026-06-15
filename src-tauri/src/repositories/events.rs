use crate::error::AppResult;
use crate::models::{Event, CreateEventRequest, UpdateEventRequest, EventAttendance, MarkEventAttendanceRequest};
use rusqlite::{params, Connection};
use chrono::Utc;
use uuid::Uuid;

pub struct EventRepository;

impl EventRepository {
    fn row_to_event(row: &rusqlite::Row) -> rusqlite::Result<Event> {
        Ok(Event {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            date: row.get(3)?,
            time: row.get(4)?,
            location: row.get(5)?,
            category: row.get(6)?,
            is_recurring: row.get(7)?,
            recurrence_rule: row.get(8)?,
            recurrence_end: row.get(9)?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
        })
    }

    const SELECT: &'static str =
        "SELECT id, title, description, date, time, location, category, is_recurring, recurrence_rule, recurrence_end, created_at, updated_at FROM events";

    pub fn create(conn: &Connection, request: CreateEventRequest) -> AppResult<Event> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        conn.execute(
            "INSERT INTO events (id, title, description, date, time, location, category, is_recurring, recurrence_rule, recurrence_end, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                id,
                request.title,
                request.description,
                request.date,
                request.time,
                request.location,
                request.category,
                request.is_recurring.unwrap_or(false),
                request.recurrence_rule,
                request.recurrence_end,
                now_str,
                now_str,
            ],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn get_all(conn: &Connection) -> AppResult<Vec<Event>> {
        let mut stmt = conn.prepare(&format!("{} ORDER BY date ASC", Self::SELECT))?;
        let events = stmt.query_map([], Self::row_to_event)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(events)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> AppResult<Event> {
        let query = format!("{} WHERE id = ?1", Self::SELECT);
        conn.query_row(&query, params![id], Self::row_to_event).map_err(Into::into)
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
        if let Some(recurring) = request.is_recurring {
            conn.execute("UPDATE events SET is_recurring = ?1, updated_at = ?2 WHERE id = ?3", params![recurring, now, id])?;
        }
        if let Some(rule) = request.recurrence_rule {
            conn.execute("UPDATE events SET recurrence_rule = ?1, updated_at = ?2 WHERE id = ?3", params![rule, now, id])?;
        }
        if let Some(end) = request.recurrence_end {
            conn.execute("UPDATE events SET recurrence_end = ?1, updated_at = ?2 WHERE id = ?3", params![end, now, id])?;
        }

        Self::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
        conn.execute("DELETE FROM events WHERE id = ?1", [id])?;
        Ok(())
    }

    // --- Event Attendance ---
    pub fn get_event_attendance(conn: &Connection, event_id: &str) -> AppResult<Vec<EventAttendance>> {
        let mut stmt = conn.prepare(
            "SELECT ea.id, ea.event_id, ea.member_id, ea.visitor_id, ea.status, ea.check_in_time, ea.created_at,
                    COALESCE(m.first_name || ' ' || m.last_name, v.first_name || ' ' || v.last_name, 'N/A') as attendee_name
             FROM event_attendance ea
             LEFT JOIN members m ON ea.member_id = m.id
             LEFT JOIN visitors v ON ea.visitor_id = v.id
             WHERE ea.event_id = ?1
             ORDER BY ea.created_at DESC"
        )?;
        let iter = stmt.query_map(params![event_id], |row| {
            Ok(EventAttendance {
                id: row.get(0)?,
                event_id: row.get(1)?,
                member_id: row.get(2)?,
                visitor_id: row.get(3)?,
                status: row.get(4)?,
                check_in_time: row.get(5)?,
                created_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                attendee_name: row.get(7)?,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn mark_event_attendance(conn: &Connection, req: MarkEventAttendanceRequest) -> AppResult<EventAttendance> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO event_attendance (id, event_id, member_id, visitor_id, status, check_in_time, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, req.event_id, req.member_id, req.visitor_id, req.status, now, now],
        )?;
        conn.query_row(
            "SELECT ea.id, ea.event_id, ea.member_id, ea.visitor_id, ea.status, ea.check_in_time, ea.created_at,
                    COALESCE(m.first_name || ' ' || m.last_name, v.first_name || ' ' || v.last_name, 'N/A')
             FROM event_attendance ea
             LEFT JOIN members m ON ea.member_id = m.id
             LEFT JOIN visitors v ON ea.visitor_id = v.id
             WHERE ea.id = ?1",
            params![id],
            |row| {
                Ok(EventAttendance {
                    id: row.get(0)?, event_id: row.get(1)?, member_id: row.get(2)?,
                    visitor_id: row.get(3)?, status: row.get(4)?, check_in_time: row.get(5)?,
                    created_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                    attendee_name: row.get(7)?,
                })
            }
        ).map_err(Into::into)
    }

    pub fn delete_event_attendance(conn: &Connection, id: &str) -> AppResult<()> {
        conn.execute("DELETE FROM event_attendance WHERE id = ?1", params![id])?;
        Ok(())
    }
}
