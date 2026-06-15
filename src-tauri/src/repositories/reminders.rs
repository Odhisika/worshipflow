use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{Reminder, UpcomingBirthday, UpcomingAnniversary};

pub struct ReminderRepository;

impl ReminderRepository {
    pub fn get_reminders(conn: &Connection, reminder_type: Option<&str>) -> Result<Vec<Reminder>> {
        let mut query = String::from(
            "SELECT id, reminder_type, title, description, reference_type, reference_id, scheduled_date, is_sent, sent_at, created_at FROM reminders"
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        if let Some(rt) = reminder_type {
            query.push_str(&format!(" WHERE reminder_type = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(rt.to_string()));
        }
        query.push_str(" ORDER BY scheduled_date ASC");

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map(&params_refs[..], |row| {
            Ok(Reminder {
                id: row.get(0)?,
                reminder_type: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                reference_type: row.get(4)?,
                reference_id: row.get(5)?,
                scheduled_date: row.get(6)?,
                is_sent: row.get(7)?,
                sent_at: row.get(8)?,
                created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_reminder(conn: &Connection, reminder_type: &str, title: &str, description: Option<&str>,
                            reference_type: Option<&str>, reference_id: Option<&str>, scheduled_date: &str) -> Result<Reminder> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO reminders (id, reminder_type, title, description, reference_type, reference_id, scheduled_date, is_sent, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8)",
            params![id, reminder_type, title, description, reference_type, reference_id, scheduled_date, now],
        )?;
        conn.query_row(
            "SELECT id, reminder_type, title, description, reference_type, reference_id, scheduled_date, is_sent, sent_at, created_at FROM reminders WHERE id = ?1",
            params![id],
            |row| {
                Ok(Reminder {
                    id: row.get(0)?, reminder_type: row.get(1)?, title: row.get(2)?,
                    description: row.get(3)?, reference_type: row.get(4)?, reference_id: row.get(5)?,
                    scheduled_date: row.get(6)?, is_sent: row.get(7)?, sent_at: row.get(8)?,
                    created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn mark_as_sent(conn: &Connection, id: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        conn.execute("UPDATE reminders SET is_sent = 1, sent_at = ?1 WHERE id = ?2", params![now, id])?;
        Ok(())
    }

    pub fn delete_reminder(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM reminders WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_upcoming_birthdays(conn: &Connection, days_ahead: i32) -> Result<Vec<UpcomingBirthday>> {
        let mut stmt = conn.prepare(
            "SELECT id, first_name || ' ' || last_name, dob,
                    CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', dob) AS INTEGER) as age,
                    CASE
                        WHEN strftime('%m-%d', dob) >= strftime('%m-%d', 'now')
                        THEN julianday(strftime('%Y', 'now') || '-' || strftime('%m-%d', dob)) - julianday('now')
                        ELSE julianday(strftime('%Y', 'now') + 1 || '-' || strftime('%m-%d', dob)) - julianday('now')
                    END as days_until
             FROM members
             WHERE dob IS NOT NULL AND status = 'active'
             HAVING days_until >= 0 AND days_until <= ?1
             ORDER BY days_until"
        )?;
        let iter = stmt.query_map(params![days_ahead], |row| {
            Ok(UpcomingBirthday {
                member_id: row.get(0)?,
                member_name: row.get(1)?,
                dob: row.get(2)?,
                age: row.get(3)?,
                days_until: row.get::<_, f64>(4)? as i32,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn get_upcoming_anniversaries(conn: &Connection, days_ahead: i32) -> Result<Vec<UpcomingAnniversary>> {
        let mut stmt = conn.prepare(
            "SELECT id, first_name || ' ' || last_name, joined_at,
                    CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', joined_at) AS INTEGER) as years,
                    CASE
                        WHEN strftime('%m-%d', joined_at) >= strftime('%m-%d', 'now')
                        THEN julianday(strftime('%Y', 'now') || '-' || strftime('%m-%d', joined_at)) - julianday('now')
                        ELSE julianday(strftime('%Y', 'now') + 1 || '-' || strftime('%m-%d', joined_at)) - julianday('now')
                    END as days_until
             FROM members
             WHERE joined_at IS NOT NULL AND status = 'active'
             HAVING days_until >= 0 AND days_until <= ?1
             ORDER BY days_until"
        )?;
        let iter = stmt.query_map(params![days_ahead], |row| {
            Ok(UpcomingAnniversary {
                member_id: row.get(0)?,
                member_name: row.get(1)?,
                joined_at: row.get(2)?,
                years: row.get(3)?,
                days_until: row.get::<_, f64>(4)? as i32,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }
}
