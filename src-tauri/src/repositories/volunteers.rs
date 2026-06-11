use crate::error::AppResult;
use crate::models::{VolunteerRole, VolunteerAssignment};
use rusqlite::{params, Connection};
use chrono::Utc;
use uuid::Uuid;

pub struct VolunteerRepository;

impl VolunteerRepository {
    pub fn get_roles(conn: &Connection) -> AppResult<Vec<VolunteerRole>> {
        let mut stmt = conn.prepare("SELECT id, name, description, required_count, created_at FROM volunteer_roles")?;
        let roles = stmt.query_map([], |row| {
            Ok(VolunteerRole {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                required_count: row.get(3)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<usize, String>(4)?).unwrap().with_timezone(&Utc),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(roles)
    }

    pub fn get_assignments(conn: &Connection, service_id: &str) -> AppResult<Vec<VolunteerAssignment>> {
        let mut stmt = conn.prepare(
            "SELECT va.id, va.role_id, vr.name, va.member_id, m.first_name || ' ' || m.last_name, va.service_id, va.status 
             FROM volunteer_schedules va
             JOIN volunteer_roles vr ON va.role_id = vr.id
             JOIN members m ON va.member_id = m.id
             WHERE va.service_id = ?1"
        )?;

        let assignments = stmt.query_map([service_id], |row| {
            Ok(VolunteerAssignment {
                id: row.get(0)?,
                role_id: row.get(1)?,
                role_name: row.get(2)?,
                member_id: row.get(3)?,
                member_name: row.get(4)?,
                service_id: row.get(5)?,
                status: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(assignments)
    }

    pub fn create_role(conn: &Connection, name: &str, description: Option<&str>, required_count: i32) -> AppResult<VolunteerRole> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let now_str = now.to_rfc3339();
        
        conn.execute(
            "INSERT INTO volunteer_roles (id, name, description, required_count, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, description, required_count, now_str],
        )?;

        Ok(VolunteerRole {
            id,
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            required_count,
            created_at: now,
        })
    }

    pub fn assign_volunteer(conn: &Connection, role_id: &str, member_id: &str, service_id: &str) -> AppResult<()> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO volunteer_schedules (id, role_id, member_id, service_id, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, role_id, member_id, service_id, "Pending", now],
        )?;
        Ok(())
    }
}
