use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::{Utc, Datelike};
use crate::models::{
    GivingType, Contribution, CreateGivingTypeRequest, UpdateGivingTypeRequest,
    CreateContributionRequest, UpdateContributionRequest,
    Pledge, CreatePledgeRequest, UpdatePledgeRequest,
    FinanceDashboardStats, MemberTitheSummary, MonthlyGivingTrend, YearComparison,
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
    fn row_to_contribution(row: &rusqlite::Row) -> Result<Contribution> {
        Ok(Contribution {
            id: row.get(0)?,
            type_id: row.get(1)?,
            member_id: row.get(2)?,
            amount: row.get(3)?,
            date: row.get(4)?,
            payment_method: row.get(5)?,
            notes: row.get(6)?,
            created_at: row.get::<_, String>(7)?.parse().unwrap_or(Utc::now()),
            type_name: row.get(8)?,
            member_name: row.get(9)?,
        })
    }

    const CONTRIBUTION_SELECT: &'static str =
        "SELECT c.id, c.type_id, c.member_id, c.amount, c.date, c.payment_method, c.notes, c.created_at,
                gt.name as type_name,
                m.first_name || ' ' || m.last_name as member_name
         FROM contributions c
         JOIN giving_types gt ON c.type_id = gt.id
         LEFT JOIN members m ON c.member_id = m.id";

    pub fn get_contributions(
        conn: &Connection,
        limit: i32,
        offset: i32,
        date_from: Option<String>,
        date_to: Option<String>,
    ) -> Result<Vec<Contribution>> {
        let mut query = String::from(Self::CONTRIBUTION_SELECT);
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut conditions = Vec::new();

        if let Some(from) = date_from {
            conditions.push(format!("?{}", params_vec.len() + 1));
            params_vec.push(Box::new(from));
        }
        if let Some(to) = date_to {
            conditions.push(format!("?{}", params_vec.len() + 1));
            params_vec.push(Box::new(to));
        }

        if conditions.len() == 2 {
            query.push_str(&format!(" WHERE c.date >= {} AND c.date <= {}", conditions[0], conditions[1]));
        } else if conditions.len() == 1 {
            query.push_str(&format!(" WHERE c.date >= {}", conditions[0]));
        }

        query.push_str(" ORDER BY c.date DESC, c.created_at DESC");

        query.push_str(&format!(" LIMIT ?{}", params_vec.len() + 1));
        params_vec.push(Box::new(limit));
        query.push_str(&format!(" OFFSET ?{}", params_vec.len() + 1));
        params_vec.push(Box::new(offset));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map(&params_refs[..], Self::row_to_contribution)?;

        let mut contributions = Vec::new();
        for c in iter {
            contributions.push(c?);
        }
        Ok(contributions)
    }

    pub fn get_contribution_by_id(conn: &Connection, id: &str) -> Result<Contribution> {
        let query = format!("{} WHERE c.id = ?1", Self::CONTRIBUTION_SELECT);
        conn.query_row(&query, params![id], Self::row_to_contribution)
    }

    pub fn add_contribution(conn: &Connection, req: CreateContributionRequest) -> Result<Contribution> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO contributions (id, type_id, member_id, amount, date, payment_method, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, req.type_id, req.member_id, req.amount, req.date, req.payment_method, req.notes, now],
        )?;

        Self::get_contribution_by_id(conn, &id)
    }

    pub fn update_contribution(conn: &Connection, id: &str, req: UpdateContributionRequest) -> Result<Contribution> {
        let mut query = String::from("UPDATE contributions SET ");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;
        let mut updates = Vec::new();

        if let Some(type_id) = req.type_id {
            updates.push(format!("type_id = ?{}", param_idx));
            params_vec.push(Box::new(type_id));
            param_idx += 1;
        }
        if let Some(ref member_id) = req.member_id {
            updates.push(format!("member_id = ?{}", param_idx));
            params_vec.push(Box::new(member_id.clone()));
            param_idx += 1;
        }
        if let Some(amount) = req.amount {
            updates.push(format!("amount = ?{}", param_idx));
            params_vec.push(Box::new(amount));
            param_idx += 1;
        }
        if let Some(ref date) = req.date {
            updates.push(format!("date = ?{}", param_idx));
            params_vec.push(Box::new(date.clone()));
            param_idx += 1;
        }
        if let Some(ref payment_method) = req.payment_method {
            updates.push(format!("payment_method = ?{}", param_idx));
            params_vec.push(Box::new(payment_method.clone()));
            param_idx += 1;
        }
        if let Some(ref notes) = req.notes {
            updates.push(format!("notes = ?{}", param_idx));
            params_vec.push(Box::new(notes.clone()));
            param_idx += 1;
        }

        if updates.is_empty() {
            return Self::get_contribution_by_id(conn, id);
        }

        query.push_str(&updates.join(", "));
        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        Self::get_contribution_by_id(conn, id)
    }

    pub fn delete_contribution(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM contributions WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Pledges ---
    const PLEDGE_SELECT: &'static str =
        "SELECT p.id, p.member_id, p.category, p.amount_promised, p.amount_paid,
                p.due_date, p.status, p.notes, p.created_at, p.updated_at,
                m.first_name || ' ' || m.last_name as member_name
         FROM pledges p
         JOIN members m ON p.member_id = m.id";

    fn row_to_pledge(row: &rusqlite::Row) -> Result<Pledge> {
        Ok(Pledge {
            id: row.get(0)?,
            member_id: row.get(1)?,
            category: row.get(2)?,
            amount_promised: row.get(3)?,
            amount_paid: row.get(4)?,
            due_date: row.get(5)?,
            status: row.get(6)?,
            notes: row.get(7)?,
            created_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
            updated_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
            member_name: row.get(10)?,
        })
    }

    pub fn get_pledges(conn: &Connection) -> Result<Vec<Pledge>> {
        let mut stmt = conn.prepare(
            &format!("{} ORDER BY p.created_at DESC", Self::PLEDGE_SELECT)
        )?;
        let iter = stmt.query_map([], Self::row_to_pledge)?;
        let mut pledges = Vec::new();
        for p in iter {
            pledges.push(p?);
        }
        Ok(pledges)
    }

    pub fn get_pledge_by_id(conn: &Connection, id: &str) -> Result<Pledge> {
        let query = format!("{} WHERE p.id = ?1", Self::PLEDGE_SELECT);
        conn.query_row(&query, params![id], Self::row_to_pledge)
    }

    pub fn create_pledge(conn: &Connection, req: CreatePledgeRequest) -> Result<Pledge> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO pledges (id, member_id, category, amount_promised, amount_paid, due_date, status, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 0, ?5, 'pending', ?6, ?7, ?7)",
            params![id, req.member_id, req.category, req.amount_promised, req.due_date, req.notes, now],
        )?;

        Self::get_pledge_by_id(conn, &id)
    }

    pub fn update_pledge(conn: &Connection, id: &str, req: UpdatePledgeRequest) -> Result<Pledge> {
        let mut query = String::from("UPDATE pledges SET ");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;
        let mut updates = Vec::new();

        if let Some(amount) = req.amount_promised {
            updates.push(format!("amount_promised = ?{}", param_idx));
            params_vec.push(Box::new(amount));
            param_idx += 1;
        }
        if let Some(amount) = req.amount_paid {
            updates.push(format!("amount_paid = ?{}", param_idx));
            params_vec.push(Box::new(amount));
            param_idx += 1;
        }
        if let Some(ref date) = req.due_date {
            updates.push(format!("due_date = ?{}", param_idx));
            params_vec.push(Box::new(date.clone()));
            param_idx += 1;
        }
        if let Some(ref status) = req.status {
            updates.push(format!("status = ?{}", param_idx));
            params_vec.push(Box::new(status.clone()));
            param_idx += 1;
        }
        if let Some(ref notes) = req.notes {
            updates.push(format!("notes = ?{}", param_idx));
            params_vec.push(Box::new(notes.clone()));
            param_idx += 1;
        }

        updates.push(format!("updated_at = ?{}", param_idx));
        params_vec.push(Box::new(Utc::now().to_rfc3339()));
        param_idx += 1;

        if updates.is_empty() {
            return Self::get_pledge_by_id(conn, id);
        }

        query.push_str(&updates.join(", "));
        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        // Auto-update status based on amounts
        conn.execute(
            "UPDATE pledges SET status = CASE
                WHEN amount_paid >= amount_promised THEN 'fulfilled'
                WHEN amount_paid > 0 THEN 'partial'
                ELSE status
             END WHERE id = ?1",
            params![id],
        )?;

        Self::get_pledge_by_id(conn, id)
    }

    pub fn add_pledge_payment(conn: &Connection, id: &str, amount: f64) -> Result<Pledge> {
        conn.execute(
            "UPDATE pledges SET amount_paid = amount_paid + ?1, status = CASE
                WHEN amount_paid + ?1 >= amount_promised THEN 'fulfilled'
                WHEN amount_paid + ?1 > 0 THEN 'partial'
                ELSE 'pending'
             END, updated_at = ?2 WHERE id = ?3",
            params![amount, Utc::now().to_rfc3339(), id],
        )?;
        Self::get_pledge_by_id(conn, id)
    }

    pub fn delete_pledge(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM pledges WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Summaries & Dashboard ---

    pub fn get_dashboard_stats(conn: &Connection, year_month_prefix: &str) -> Result<FinanceDashboardStats> {
        let total_tithes: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions 
             WHERE type_id = 'tithe' AND date LIKE ?1",
            params![format!("{}%", year_month_prefix)],
            |row| row.get(0)
        )?;

        let total_pledges: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions 
             WHERE type_id = 'pledge' AND date LIKE ?1",
            params![format!("{}%", year_month_prefix)],
            |row| row.get(0)
        )?;

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

    pub fn get_monthly_giving_trends(conn: &Connection, months: i32) -> Result<Vec<MonthlyGivingTrend>> {
        let mut stmt = conn.prepare(
            "SELECT substr(c.date, 1, 7) as month,
                    COALESCE(SUM(CASE WHEN c.type_id = 'tithe' THEN c.amount ELSE 0 END), 0) as tithes,
                    COALESCE(SUM(CASE WHEN c.type_id NOT IN ('tithe', 'pledge') THEN c.amount ELSE 0 END), 0) as offerings,
                    COALESCE(SUM(CASE WHEN c.type_id = 'pledge' THEN c.amount ELSE 0 END), 0) as pledges
             FROM contributions c
             WHERE c.date >= date('now', ?1)
             GROUP BY substr(c.date, 1, 7)
             ORDER BY month ASC"
        )?;

        let lookback = format!("-{} months", months);
        let iter = stmt.query_map(params![lookback], |row| {
            Ok(MonthlyGivingTrend {
                month: row.get(0)?,
                tithes: row.get(1)?,
                offerings: row.get(2)?,
                pledges: row.get(3)?,
            })
        })?;

        let mut trends = Vec::new();
        for t in iter {
            trends.push(t?);
        }
        Ok(trends)
    }

    pub fn get_year_comparison(conn: &Connection) -> Result<YearComparison> {
        let current_year = Utc::now().format("%Y").to_string();
        let prev_year = (Utc::now().year() - 1).to_string();

        let current_total: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions WHERE date LIKE ?1",
            params![format!("{}%", current_year)],
            |row| row.get(0)
        )?;

        let previous_total: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions WHERE date LIKE ?1",
            params![format!("{}%", prev_year)],
            |row| row.get(0)
        )?;

        let change_pct = if previous_total > 0.0 {
            ((current_total - previous_total) / previous_total) * 100.0
        } else {
            0.0
        };

        Ok(YearComparison {
            current_year,
            previous_year: prev_year,
            current_total,
            previous_total,
            change_pct,
        })
    }

    pub fn get_contributions_for_member_statement(
        conn: &Connection,
        member_id: &str,
        year: &str,
    ) -> Result<Vec<Contribution>> {
        let query = format!(
            "{} WHERE c.member_id = ?1 AND c.date LIKE ?2 ORDER BY c.date ASC",
            Self::CONTRIBUTION_SELECT
        );
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map(
            params![member_id, format!("{}%", year)],
            Self::row_to_contribution,
        )?;
        let mut contributions = Vec::new();
        for c in iter {
            contributions.push(c?);
        }
        Ok(contributions)
    }
}
