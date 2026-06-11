use crate::error::{AppError, AppResult};
use crate::models::{Activity, CreateActivityRequest};
use rusqlite::Connection;
use chrono::Utc;
use uuid::Uuid;

pub struct ActivityRepository;

impl ActivityRepository {
    pub fn create(conn: &Connection, request: CreateActivityRequest) -> AppResult<Activity> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        // Get the next order index for this service
        let order_index: i32 = conn.query_row(
            "SELECT COALESCE(MAX(order_index), -1) + 1 FROM activities WHERE service_id = ?1",
            [&request.service_id],
            |row| row.get(0)
        )?;

        conn.execute(
            "INSERT INTO activities (id, service_id, name, duration_minutes, leader, notes, order_index, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                &id,
                &request.service_id,
                &request.name,
                &request.duration_minutes,
                &request.leader,
                &request.notes,
                &order_index,
                &now.to_rfc3339(),
            ],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> AppResult<Activity> {
        let mut stmt = conn.prepare(
            "SELECT id, service_id, name, duration_minutes, leader, notes, order_index, created_at 
             FROM activities WHERE id = ?1"
        )?;

        let activity = stmt.query_row([id], |row| {
            Ok(Activity {
                id: row.get(0)?,
                service_id: row.get(1)?,
                name: row.get(2)?,
                duration_minutes: row.get(3)?,
                leader: row.get(4)?,
                notes: row.get(5)?,
                order_index: row.get(6)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        }).map_err(|_| AppError::NotFound(format!("Activity with id {} not found", id)))?;

        Ok(activity)
    }

    pub fn get_by_service(conn: &Connection, service_id: &str) -> AppResult<Vec<Activity>> {
        let mut stmt = conn.prepare(
            "SELECT id, service_id, name, duration_minutes, leader, notes, order_index, created_at 
             FROM activities 
             WHERE service_id = ?1 
             ORDER BY order_index ASC"
        )?;

        let activities = stmt.query_map([service_id], |row| {
            Ok(Activity {
                id: row.get(0)?,
                service_id: row.get(1)?,
                name: row.get(2)?,
                duration_minutes: row.get(3)?,
                leader: row.get(4)?,
                notes: row.get(5)?,
                order_index: row.get(6)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(activities)
    }

    pub fn update(conn: &Connection, id: &str, request: CreateActivityRequest) -> AppResult<Activity> {
        let rows_affected = conn.execute(
            "UPDATE activities 
             SET name = ?1, duration_minutes = ?2, leader = ?3, notes = ?4
             WHERE id = ?5",
            rusqlite::params![
                &request.name,
                &request.duration_minutes,
                &request.leader,
                &request.notes,
                id,
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Activity with id {} not found", id)));
        }

        Self::get_by_id(conn, id)
    }

    pub fn reorder(conn: &Connection, service_id: &str, activity_ids: Vec<String>) -> AppResult<()> {
        let tx = conn.unchecked_transaction()?;

        for (index, activity_id) in activity_ids.iter().enumerate() {
            tx.execute(
                "UPDATE activities SET order_index = ?1 WHERE id = ?2 AND service_id = ?3",
                rusqlite::params![index as i32, activity_id, service_id],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
        let rows_affected = conn.execute("DELETE FROM activities WHERE id = ?1", [id])?;
        
        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Activity with id {} not found", id)));
        }

        Ok(())
    }
}
