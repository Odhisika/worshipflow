use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::AuditLog;

pub struct AuditRepository;

impl AuditRepository {
    pub fn get_audit_logs(conn: &Connection, limit: i32, entity_type: Option<&str>) -> Result<Vec<AuditLog>> {
        let mut query = String::from(
            "SELECT id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at FROM audit_logs"
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        if let Some(et) = entity_type {
            query.push_str(&format!(" WHERE entity_type = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(et.to_string()));
        }
        query.push_str(" ORDER BY created_at DESC");
        query.push_str(&format!(" LIMIT ?{}", params_vec.len() + 1));
        params_vec.push(Box::new(limit));

        let mut params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map(&params_refs[..], |row| {
            Ok(AuditLog {
                id: row.get(0)?,
                user_id: row.get(1)?,
                action: row.get(2)?,
                entity_type: row.get(3)?,
                entity_id: row.get(4)?,
                old_values: row.get(5)?,
                new_values: row.get(6)?,
                ip_address: row.get(7)?,
                created_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn log_action(conn: &Connection, user_id: Option<&str>, action: &str, entity_type: &str,
                      entity_id: Option<&str>, old_values: Option<&str>, new_values: Option<&str>) -> Result<()> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, user_id, action, entity_type, entity_id, old_values, new_values, now],
        )?;
        Ok(())
    }

    pub fn clear_audit_logs(conn: &Connection, before_date: Option<&str>) -> Result<()> {
        if let Some(date) = before_date {
            conn.execute("DELETE FROM audit_logs WHERE created_at < ?1", params![date])?;
        } else {
            conn.execute("DELETE FROM audit_logs", [])?;
        }
        Ok(())
    }
}
