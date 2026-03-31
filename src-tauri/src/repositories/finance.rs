use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{
    GivingType, Contribution, CreateGivingTypeRequest, UpdateGivingTypeRequest,
    CreateContributionRequest, FinanceDashboardStats, MemberTitheSummary,
};
use crate::error::{AppResult, AppError};

pub struct FinanceRepository;

impl FinanceRepository {
    // --- Giving Types ---
    pub fn get_giving_types(conn: &Connection) -> Result<Vec<GivingType>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, is_system, created_at FROM giving_types ORDER BY name"
        )?;
        
        let types_iter = stmt.query_map([], |row| {
            Ok(GivingType {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_system: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap_or(Utc::now()),
            })
        })?;

        let mut types = Vec::new();
        for t in types_iter {
            types.push(t?);
        }
        Ok(types)
    }

    pub fn get_giving_type_by_id(conn: &Connection, id: &str) -> Result<GivingType> {
        conn.query_row(
            "SELECT id, name, description, is_system, created_at FROM giving_types WHERE id = ?1",
            params![id],
            |row| {
                Ok(GivingType {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    is_system: row.get(3)?,
                    created_at: row.get::<_, String>(4)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn create_giving_type(conn: &Connection, req: CreateGivingTypeRequest) -> Result<GivingType> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO giving_types (id, name, description, is_system, created_at)
             VALUES (?1, ?2, ?3, 0, ?4)",
            params![id, req.name, req.description, now],
        )?;

        Self::get_giving_type_by_id(conn, &id)
    }

    pub fn update_giving_type(conn: &Connection, id: &str, req: UpdateGivingTypeRequest) -> Result<GivingType> {
        let mut query = String::from("UPDATE giving_types SET ");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;
        let mut updates = Vec::new();

        if let Some(name) = req.name {
            updates.push(format!("name = ?{}", param_idx));
            params_vec.push(Box::new(name));
            param_idx += 1;
        }
        if let Some(description) = req.description {
            updates.push(format!("description = ?{}", param_idx));
            params_vec.push(Box::new(description));
            param_idx += 1;
        }

        if updates.is_empty() {
            return Self::get_giving_type_by_id(conn, id);
        }

        query.push_str(&updates.join(", "));
        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        Self::get_giving_type_by_id(conn, id)
    }

    pub fn delete_giving_type(conn: &Connection, id: &str) -> AppResult<()> {
        // Ensure that system types and types with contributions cannot be easily deleted,
        // or just let SQLite handle the foreign key constraint for contributions.
        let is_system: bool = conn.query_row(
            "SELECT is_system FROM giving_types WHERE id = ?1",
            params![id],
            |row| row.get(0)
        )?;

        if is_system {
            return Err(AppError::InvalidInput("Cannot delete system giving type".to_string()));
        }

        conn.execute("DELETE FROM giving_types WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Contributions ---
    pub fn get_contributions(conn: &Connection, limit: i32, offset: i32) -> Result<Vec<Contribution>> {
        let mut stmt = conn.prepare(
            "SELECT c.id, c.type_id, c.member_id, c.amount, c.date, c.notes, c.created_at,
                    gt.name as type_name, 
                    m.first_name || ' ' || m.last_name as member_name
             FROM contributions c
             JOIN giving_types gt ON c.type_id = gt.id
             LEFT JOIN members m ON c.member_id = m.id
             ORDER BY c.date DESC, c.created_at DESC
             LIMIT ?1 OFFSET ?2"
        )?;

        let iter = stmt.query_map(params![limit, offset], |row| {
            Ok(Contribution {
                id: row.get(0)?,
                type_id: row.get(1)?,
                member_id: row.get(2)?,
                amount: row.get(3)?,
                date: row.get(4)?,
                notes: row.get(5)?,
                created_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                type_name: row.get(7)?,
                member_name: row.get(8)?,
            })
        })?;

        let mut contributions = Vec::new();
        for c in iter {
            contributions.push(c?);
        }
        Ok(contributions)
    }

    pub fn add_contribution(conn: &Connection, req: CreateContributionRequest) -> Result<Contribution> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO contributions (id, type_id, member_id, amount, date, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, req.type_id, req.member_id, req.amount, req.date, req.notes, now],
        )?;

        conn.query_row(
            "SELECT c.id, c.type_id, c.member_id, c.amount, c.date, c.notes, c.created_at,
                    gt.name as type_name, 
                    m.first_name || ' ' || m.last_name as member_name
             FROM contributions c
             JOIN giving_types gt ON c.type_id = gt.id
             LEFT JOIN members m ON c.member_id = m.id
             WHERE c.id = ?1",
            params![id],
            |row| {
                Ok(Contribution {
                    id: row.get(0)?,
                    type_id: row.get(1)?,
                    member_id: row.get(2)?,
                    amount: row.get(3)?,
                    date: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                    type_name: row.get(7)?,
                    member_name: row.get(8)?,
                })
            }
        )
    }

    pub fn delete_contribution(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM contributions WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Summaries & Dashboard ---

    pub fn get_dashboard_stats(conn: &Connection, year_month_prefix: &str) -> Result<FinanceDashboardStats> {
        // year_month_prefix format: "YYYY-MM" (e.g. "2024-03")
        
        // Sum tithes
        let total_tithes: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions 
             WHERE type_id = 'tithe' AND date LIKE ?1",
            params![format!("{}%", year_month_prefix)],
            |row| row.get(0)
        )?;

        // Sum pledges
        let total_pledges: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions 
             WHERE type_id = 'pledge' AND date LIKE ?1",
            params![format!("{}%", year_month_prefix)],
            |row| row.get(0)
        )?;

        // Sum all offerings (anything else)
        let total_offerings: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions 
             WHERE type_id NOT IN ('tithe', 'pledge') AND date LIKE ?1",
            params![format!("{}%", year_month_prefix)],
            |row| row.get(0)
        )?;

        Ok(FinanceDashboardStats {
            total_offerings,
            total_tithes,
            total_pledges,
        })
    }

    pub fn get_member_tithe_summary(conn: &Connection, year_month_prefix: &str) -> Result<Vec<MemberTitheSummary>> {
        // Groups tithes by member
        let mut stmt = conn.prepare(
            "SELECT c.member_id, m.first_name || ' ' || m.last_name as member_name, COALESCE(SUM(c.amount), 0)
             FROM contributions c
             JOIN members m ON c.member_id = m.id
             WHERE c.type_id = 'tithe' AND c.date LIKE ?1
             GROUP BY c.member_id, member_name
             ORDER BY member_name"
        )?;

        let iter = stmt.query_map(params![format!("{}%", year_month_prefix)], |row| {
            Ok(MemberTitheSummary {
                member_id: row.get(0)?,
                member_name: row.get(1)?,
                total_amount: row.get(2)?,
                month: year_month_prefix.to_string(),
            })
        })?;

        let mut summaries = Vec::new();
        for s in iter {
            summaries.push(s?);
        }
        Ok(summaries)
    }
}
