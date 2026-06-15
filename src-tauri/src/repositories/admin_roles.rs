use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{AdminRole, UpdateAdminRoleRequest};

pub struct AdminRoleRepository;

impl AdminRoleRepository {
    pub fn get_admin_roles(conn: &Connection) -> Result<Vec<AdminRole>> {
        let mut stmt = conn.prepare(
            "SELECT id, admin_id, role, permissions, created_at FROM admin_roles ORDER BY role"
        )?;
        let iter = stmt.query_map([], |row| {
            Ok(AdminRole {
                id: row.get(0)?,
                admin_id: row.get(1)?,
                role: row.get(2)?,
                permissions: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap_or(Utc::now()),
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn get_admin_role(conn: &Connection, admin_id: &str) -> Result<AdminRole> {
        conn.query_row(
            "SELECT id, admin_id, role, permissions, created_at FROM admin_roles WHERE admin_id = ?1",
            params![admin_id],
            |row| {
                Ok(AdminRole {
                    id: row.get(0)?,
                    admin_id: row.get(1)?,
                    role: row.get(2)?,
                    permissions: row.get(3)?,
                    created_at: row.get::<_, String>(4)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn set_admin_role(conn: &Connection, req: UpdateAdminRoleRequest) -> Result<AdminRole> {
        let now = Utc::now().to_rfc3339();
        // Check if role exists
        let existing: Option<String> = conn.query_row(
            "SELECT id FROM admin_roles WHERE admin_id = ?1",
            params![req.admin_id],
            |row| row.get(0),
        ).ok();

        if let Some(rid) = existing {
            conn.execute(
                "UPDATE admin_roles SET role = ?1, permissions = ?2, created_at = ?3 WHERE id = ?4",
                params![req.role, req.permissions, now, rid],
            )?;
        } else {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO admin_roles (id, admin_id, role, permissions, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, req.admin_id, req.role, req.permissions, now],
            )?;
        }

        Self::get_admin_role(conn, &req.admin_id)
    }

    pub fn delete_admin_role(conn: &Connection, admin_id: &str) -> Result<()> {
        conn.execute("DELETE FROM admin_roles WHERE admin_id = ?1", params![admin_id])?;
        Ok(())
    }
}
