use crate::error::{AppError, AppResult};
use crate::models::{Collection, CreateCollectionRequest};
use rusqlite::Connection;
use chrono::Utc;
use uuid::Uuid;

pub struct CollectionRepository;

impl CollectionRepository {
    pub fn create(conn: &Connection, request: CreateCollectionRequest) -> AppResult<Collection> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO collections (id, name, description, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![&id, &request.name, &request.description, &now],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> AppResult<Collection> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, created_at FROM collections WHERE id = ?1"
        )?;

        let collection = stmt.query_row([id], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        }).map_err(|_| AppError::NotFound(format!("Collection with id {} not found", id)))?;

        Ok(collection)
    }

    pub fn get_all(conn: &Connection) -> AppResult<Vec<Collection>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, created_at FROM collections ORDER BY name ASC"
        )?;

        let collections = stmt.query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(collections)
    }

    pub fn update(conn: &Connection, id: &str, request: CreateCollectionRequest) -> AppResult<Collection> {
        let rows_affected = conn.execute(
            "UPDATE collections SET name = ?1, description = ?2 WHERE id = ?3",
            rusqlite::params![&request.name, &request.description, id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Collection with id {} not found", id)));
        }

        Self::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
        // Set collection_id to NULL on songs that reference this collection
        conn.execute("UPDATE songs SET collection_id = NULL WHERE collection_id = ?1", [id])?;

        let rows_affected = conn.execute("DELETE FROM collections WHERE id = ?1", [id])?;

        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Collection with id {} not found", id)));
        }

        Ok(())
    }
}
