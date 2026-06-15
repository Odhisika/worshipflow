use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{
    Visitor, CreateVisitorRequest, UpdateVisitorRequest,
    VisitorFollowup, CreateVisitorFollowupRequest,
};

pub struct VisitorRepository;

impl VisitorRepository {
    const VISITOR_SELECT: &'static str =
        "SELECT id, first_name, last_name, email, phone, address, gender, age_group,
                visited_date, service_id, heard_from, prayer_need, interest, status,
                converted_member_id, created_at, updated_at FROM visitors";

    fn row_to_visitor(row: &rusqlite::Row) -> Result<Visitor> {
        Ok(Visitor {
            id: row.get(0)?,
            first_name: row.get(1)?,
            last_name: row.get(2)?,
            email: row.get(3)?,
            phone: row.get(4)?,
            address: row.get(5)?,
            gender: row.get(6)?,
            age_group: row.get(7)?,
            visited_date: row.get(8)?,
            service_id: row.get(9)?,
            heard_from: row.get(10)?,
            prayer_need: row.get(11)?,
            interest: row.get(12)?,
            status: row.get(13)?,
            converted_member_id: row.get(14)?,
            created_at: row.get::<_, String>(15)?.parse().unwrap_or(Utc::now()),
            updated_at: row.get::<_, String>(16)?.parse().unwrap_or(Utc::now()),
        })
    }

    pub fn get_visitors(conn: &Connection) -> Result<Vec<Visitor>> {
        let mut stmt = conn.prepare(&format!("{} ORDER BY visited_date DESC", Self::VISITOR_SELECT))?;
        let iter = stmt.query_map([], Self::row_to_visitor)?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn get_visitor_by_id(conn: &Connection, id: &str) -> Result<Visitor> {
        let query = format!("{} WHERE id = ?1", Self::VISITOR_SELECT);
        conn.query_row(&query, params![id], Self::row_to_visitor)
    }

    pub fn create_visitor(conn: &Connection, req: CreateVisitorRequest) -> Result<Visitor> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO visitors (id, first_name, last_name, email, phone, address, gender, age_group,
             visited_date, service_id, heard_from, prayer_need, interest, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'new', ?14, ?14)",
            params![id, req.first_name, req.last_name, req.email, req.phone, req.address,
                    req.gender, req.age_group, req.visited_date, req.service_id,
                    req.heard_from, req.prayer_need, req.interest, now],
        )?;
        Self::get_visitor_by_id(conn, &id)
    }

    pub fn update_visitor(conn: &Connection, id: &str, req: UpdateVisitorRequest) -> Result<Visitor> {
        let now = Utc::now().to_rfc3339();
        let mut query = String::from("UPDATE visitors SET ");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;
        let mut updates = Vec::new();

        if let Some(ref status) = req.status {
            updates.push(format!("status = ?{}", param_idx));
            params_vec.push(Box::new(status.clone()));
            param_idx += 1;
        }
        if let Some(ref mid) = req.converted_member_id {
            updates.push(format!("converted_member_id = ?{}", param_idx));
            params_vec.push(Box::new(mid.clone()));
            param_idx += 1;
        }
        if let Some(ref email) = req.email {
            updates.push(format!("email = ?{}", param_idx));
            params_vec.push(Box::new(email.clone()));
            param_idx += 1;
        }
        if let Some(ref phone) = req.phone {
            updates.push(format!("phone = ?{}", param_idx));
            params_vec.push(Box::new(phone.clone()));
            param_idx += 1;
        }
        if let Some(ref interest) = req.interest {
            updates.push(format!("interest = ?{}", param_idx));
            params_vec.push(Box::new(interest.clone()));
            param_idx += 1;
        }

        updates.push(format!("updated_at = ?{}", param_idx));
        params_vec.push(Box::new(now));
        param_idx += 1;

        if updates.is_empty() {
            return Self::get_visitor_by_id(conn, id);
        }

        query.push_str(&updates.join(", "));
        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;
        Self::get_visitor_by_id(conn, id)
    }

    pub fn delete_visitor(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM visitors WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Follow-ups ---
    pub fn get_followups(conn: &Connection, visitor_id: &str) -> Result<Vec<VisitorFollowup>> {
        let mut stmt = conn.prepare(
            "SELECT f.id, f.visitor_id, f.followup_date, f.notes, f.status, f.assigned_to, f.created_at,
                    v.first_name || ' ' || v.last_name as visitor_name
             FROM visitor_followups f
             JOIN visitors v ON f.visitor_id = v.id
             WHERE f.visitor_id = ?1
             ORDER BY f.followup_date DESC"
        )?;
        let iter = stmt.query_map(params![visitor_id], |row| {
            Ok(VisitorFollowup {
                id: row.get(0)?,
                visitor_id: row.get(1)?,
                followup_date: row.get(2)?,
                notes: row.get(3)?,
                status: row.get(4)?,
                assigned_to: row.get(5)?,
                created_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                visitor_name: row.get(7)?,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_followup(conn: &Connection, req: CreateVisitorFollowupRequest) -> Result<VisitorFollowup> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO visitor_followups (id, visitor_id, followup_date, notes, status, assigned_to, created_at)
             VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6)",
            params![id, req.visitor_id, req.followup_date, req.notes, req.assigned_to, now],
        )?;
        conn.query_row(
            "SELECT f.id, f.visitor_id, f.followup_date, f.notes, f.status, f.assigned_to, f.created_at,
                    v.first_name || ' ' || v.last_name FROM visitor_followups f JOIN visitors v ON f.visitor_id = v.id WHERE f.id = ?1",
            params![id],
            |row| {
                Ok(VisitorFollowup {
                    id: row.get(0)?,
                    visitor_id: row.get(1)?,
                    followup_date: row.get(2)?,
                    notes: row.get(3)?,
                    status: row.get(4)?,
                    assigned_to: row.get(5)?,
                    created_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                    visitor_name: row.get(7)?,
                })
            }
        )
    }

    pub fn update_followup_status(conn: &Connection, id: &str, status: &str) -> Result<()> {
        conn.execute("UPDATE visitor_followups SET status = ?1 WHERE id = ?2", params![status, id])?;
        Ok(())
    }

    pub fn delete_followup(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM visitor_followups WHERE id = ?1", params![id])?;
        Ok(())
    }
}
