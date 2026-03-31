use crate::error::{AppError, AppResult};
use crate::models::{Service, CreateServiceRequest};
use rusqlite::Connection;
use chrono::Utc;
use uuid::Uuid;

pub struct ServiceRepository;

impl ServiceRepository {
    pub fn create(conn: &Connection, request: CreateServiceRequest) -> AppResult<Service> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        conn.execute(
            "INSERT INTO services (id, title, date, theme, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                &id,
                &request.title,
                &request.date,
                &request.theme,
                &request.notes,
                &now.to_rfc3339(),
                &now.to_rfc3339(),
            ],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> AppResult<Service> {
        let mut stmt = conn.prepare(
            "SELECT id, title, date, theme, notes, created_at, updated_at 
             FROM services WHERE id = ?1"
        )?;

        let service = stmt.query_row([id], |row| {
            Ok(Service {
                id: row.get(0)?,
                title: row.get(1)?,
                date: row.get(2)?,
                theme: row.get(3)?,
                notes: row.get(4)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        }).map_err(|_| AppError::NotFound(format!("Service with id {} not found", id)))?;

        Ok(service)
    }

    pub fn get_all(conn: &Connection) -> AppResult<Vec<Service>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, date, theme, notes, created_at, updated_at 
             FROM services ORDER BY date DESC"
        )?;

        let services = stmt.query_map([], |row| {
            Ok(Service {
                id: row.get(0)?,
                title: row.get(1)?,
                date: row.get(2)?,
                theme: row.get(3)?,
                notes: row.get(4)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(services)
    }

    pub fn update(conn: &Connection, id: &str, request: CreateServiceRequest) -> AppResult<Service> {
        let now = Utc::now();

        let rows_affected = conn.execute(
            "UPDATE services 
             SET title = ?1, date = ?2, theme = ?3, notes = ?4, updated_at = ?5
             WHERE id = ?6",
            rusqlite::params![
                &request.title,
                &request.date,
                &request.theme,
                &request.notes,
                &now.to_rfc3339(),
                id,
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Service with id {} not found", id)));
        }

        Self::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
        let rows_affected = conn.execute("DELETE FROM services WHERE id = ?1", [id])?;
        
        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Service with id {} not found", id)));
        }

        Ok(())
    }
}
