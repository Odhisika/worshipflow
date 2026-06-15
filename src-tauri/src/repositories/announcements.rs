use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{Announcement, CreateAnnouncementRequest, UpdateAnnouncementRequest};

pub struct AnnouncementRepository;

impl AnnouncementRepository {
    pub fn get_announcements(conn: &Connection, active_only: bool) -> Result<Vec<Announcement>> {
        let mut query = String::from(
            "SELECT id, title, content, category, priority, start_date, end_date, is_active, created_by, created_at, updated_at FROM announcements"
        );
        if active_only {
            query.push_str(" WHERE is_active = 1 AND date(start_date) <= date('now') AND (end_date IS NULL OR date(end_date) >= date('now'))");
        }
        query.push_str(" ORDER BY priority DESC, start_date DESC");
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map([], |row| {
            Ok(Announcement {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                category: row.get(3)?,
                priority: row.get(4)?,
                start_date: row.get(5)?,
                end_date: row.get(6)?,
                is_active: row.get(7)?,
                created_by: row.get(8)?,
                created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                updated_at: row.get::<_, String>(10)?.parse().unwrap_or(Utc::now()),
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_announcement(conn: &Connection, req: CreateAnnouncementRequest) -> Result<Announcement> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO announcements (id, title, content, category, priority, start_date, end_date, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)",
            params![id, req.title, req.content, req.category, req.priority, req.start_date, req.end_date, now],
        )?;
        conn.query_row(
            "SELECT id, title, content, category, priority, start_date, end_date, is_active, created_by, created_at, updated_at FROM announcements WHERE id = ?1",
            params![id],
            |row| {
                Ok(Announcement {
                    id: row.get(0)?, title: row.get(1)?, content: row.get(2)?, category: row.get(3)?,
                    priority: row.get(4)?, start_date: row.get(5)?, end_date: row.get(6)?,
                    is_active: row.get(7)?, created_by: row.get(8)?,
                    created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(10)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn update_announcement(conn: &Connection, id: &str, req: UpdateAnnouncementRequest) -> Result<Announcement> {
        let now = Utc::now().to_rfc3339();
        let mut query = String::from("UPDATE announcements SET ");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;
        let mut updates = Vec::new();

        if let Some(ref title) = req.title { updates.push(format!("title = ?{}", param_idx)); params_vec.push(Box::new(title.clone())); param_idx += 1; }
        if let Some(ref content) = req.content { updates.push(format!("content = ?{}", param_idx)); params_vec.push(Box::new(content.clone())); param_idx += 1; }
        if let Some(ref cat) = req.category { updates.push(format!("category = ?{}", param_idx)); params_vec.push(Box::new(cat.clone())); param_idx += 1; }
        if let Some(ref pri) = req.priority { updates.push(format!("priority = ?{}", param_idx)); params_vec.push(Box::new(pri.clone())); param_idx += 1; }
        if let Some(ref sd) = req.start_date { updates.push(format!("start_date = ?{}", param_idx)); params_vec.push(Box::new(sd.clone())); param_idx += 1; }
        if let Some(ref ed) = req.end_date { updates.push(format!("end_date = ?{}", param_idx)); params_vec.push(Box::new(ed.clone())); param_idx += 1; }
        if let Some(active) = req.is_active { updates.push(format!("is_active = ?{}", param_idx)); params_vec.push(Box::new(active as i32)); param_idx += 1; }

        updates.push(format!("updated_at = ?{}", param_idx));
        params_vec.push(Box::new(now));
        param_idx += 1;

        query.push_str(&updates.join(", "));
        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        conn.query_row(
            "SELECT id, title, content, category, priority, start_date, end_date, is_active, created_by, created_at, updated_at FROM announcements WHERE id = ?1",
            params![id],
            |row| {
                Ok(Announcement {
                    id: row.get(0)?, title: row.get(1)?, content: row.get(2)?, category: row.get(3)?,
                    priority: row.get(4)?, start_date: row.get(5)?, end_date: row.get(6)?,
                    is_active: row.get(7)?, created_by: row.get(8)?,
                    created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(10)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn delete_announcement(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM announcements WHERE id = ?1", params![id])?;
        Ok(())
    }
}
