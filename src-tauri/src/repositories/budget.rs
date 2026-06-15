use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{
    BudgetCategory, CreateBudgetCategoryRequest,
    Budget, CreateBudgetRequest, UpdateBudgetRequest,
    ExpenseCategory, CreateExpenseCategoryRequest,
    Expense, CreateExpenseRequest, UpdateExpenseRequest,
    BudgetDashboardStats, ExpenseSummary,
};

pub struct BudgetRepository;

impl BudgetRepository {
    // --- Budget Categories ---
    pub fn get_budget_categories(conn: &Connection) -> Result<Vec<BudgetCategory>> {
        let mut stmt = conn.prepare("SELECT id, name, description, created_at FROM budget_categories ORDER BY name")?;
        let iter = stmt.query_map([], |row| {
            Ok(BudgetCategory {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get::<_, String>(3)?.parse().unwrap_or(Utc::now()),
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_budget_category(conn: &Connection, req: CreateBudgetCategoryRequest) -> Result<BudgetCategory> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO budget_categories (id, name, description, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, req.name, req.description, now],
        )?;
        conn.query_row("SELECT id, name, description, created_at FROM budget_categories WHERE id = ?1", params![id], |row| {
            Ok(BudgetCategory {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get::<_, String>(3)?.parse().unwrap_or(Utc::now()),
            })
        })
    }

    pub fn delete_budget_category(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM budget_categories WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Budgets ---
    pub fn get_budgets(conn: &Connection, fiscal_year: Option<&str>) -> Result<Vec<Budget>> {
        let mut query = String::from(
            "SELECT b.id, b.category_id, b.fiscal_year, b.allocated_amount, b.spent_amount,
                    b.notes, b.created_at, b.updated_at, bc.name as category_name
             FROM budgets b
             JOIN budget_categories bc ON b.category_id = bc.id"
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        if let Some(year) = fiscal_year {
            query.push_str(&format!(" WHERE b.fiscal_year = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(year.to_string()));
        }
        query.push_str(" ORDER BY bc.name");

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map(&params_refs[..], |row| {
            Ok(Budget {
                id: row.get(0)?,
                category_id: row.get(1)?,
                fiscal_year: row.get(2)?,
                allocated_amount: row.get(3)?,
                spent_amount: row.get(4)?,
                notes: row.get(5)?,
                created_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                updated_at: row.get::<_, String>(7)?.parse().unwrap_or(Utc::now()),
                category_name: row.get(8)?,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_budget(conn: &Connection, req: CreateBudgetRequest) -> Result<Budget> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO budgets (id, category_id, fiscal_year, allocated_amount, spent_amount, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?6)",
            params![id, req.category_id, req.fiscal_year, req.allocated_amount, req.notes, now],
        )?;
        Self::get_budget_by_id(conn, &id)
    }

    fn get_budget_by_id(conn: &Connection, id: &str) -> Result<Budget> {
        conn.query_row(
            "SELECT b.id, b.category_id, b.fiscal_year, b.allocated_amount, b.spent_amount,
                    b.notes, b.created_at, b.updated_at, bc.name
             FROM budgets b JOIN budget_categories bc ON b.category_id = bc.id WHERE b.id = ?1",
            params![id],
            |row| {
                Ok(Budget {
                    id: row.get(0)?,
                    category_id: row.get(1)?,
                    fiscal_year: row.get(2)?,
                    allocated_amount: row.get(3)?,
                    spent_amount: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(7)?.parse().unwrap_or(Utc::now()),
                    category_name: row.get(8)?,
                })
            }
        )
    }

    pub fn update_budget(conn: &Connection, id: &str, req: UpdateBudgetRequest) -> Result<Budget> {
        let now = Utc::now().to_rfc3339();
        let mut query = String::from("UPDATE budgets SET ");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;
        let mut updates = Vec::new();

        if let Some(amount) = req.allocated_amount {
            updates.push(format!("allocated_amount = ?{}", param_idx));
            params_vec.push(Box::new(amount));
            param_idx += 1;
        }
        if let Some(ref notes) = req.notes {
            updates.push(format!("notes = ?{}", param_idx));
            params_vec.push(Box::new(notes.clone()));
            param_idx += 1;
        }
        updates.push(format!("updated_at = ?{}", param_idx));
        params_vec.push(Box::new(now));
        param_idx += 1;

        query.push_str(&updates.join(", "));
        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;
        Self::get_budget_by_id(conn, id)
    }

    pub fn delete_budget(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM budgets WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_budget_dashboard(conn: &Connection, fiscal_year: &str) -> Result<BudgetDashboardStats> {
        let total_budget: f64 = conn.query_row(
            "SELECT COALESCE(SUM(allocated_amount), 0) FROM budgets WHERE fiscal_year = ?1",
            params![fiscal_year], |row| row.get(0)
        )?;
        let total_spent: f64 = conn.query_row(
            "SELECT COALESCE(SUM(spent_amount), 0) FROM budgets WHERE fiscal_year = ?1",
            params![fiscal_year], |row| row.get(0)
        )?;
        Ok(BudgetDashboardStats {
            total_budget,
            total_spent,
            remaining: total_budget - total_spent,
        })
    }

    // --- Expense Categories ---
    pub fn get_expense_categories(conn: &Connection) -> Result<Vec<ExpenseCategory>> {
        let mut stmt = conn.prepare("SELECT id, name, description, created_at FROM expense_categories ORDER BY name")?;
        let iter = stmt.query_map([], |row| {
            Ok(ExpenseCategory {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get::<_, String>(3)?.parse().unwrap_or(Utc::now()),
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_expense_category(conn: &Connection, req: CreateExpenseCategoryRequest) -> Result<ExpenseCategory> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute("INSERT INTO expense_categories (id, name, description, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, req.name, req.description, now])?;
        conn.query_row("SELECT id, name, description, created_at FROM expense_categories WHERE id = ?1", params![id], |row| {
            Ok(ExpenseCategory { id: row.get(0)?, name: row.get(1)?, description: row.get(2)?, created_at: row.get::<_, String>(3)?.parse().unwrap_or(Utc::now()) })
        })
    }

    pub fn delete_expense_category(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM expense_categories WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Expenses ---
    const EXPENSE_SELECT: &'static str =
        "SELECT e.id, e.category_id, e.amount, e.date, e.payee, e.payment_method, e.notes, e.receipt_path, e.created_at, ec.name
         FROM expenses e JOIN expense_categories ec ON e.category_id = ec.id";

    pub fn get_expenses(conn: &Connection, date_from: Option<&str>, date_to: Option<&str>) -> Result<Vec<Expense>> {
        let mut query = String::from(Self::EXPENSE_SELECT);
        let mut conditions = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(from) = date_from {
            conditions.push(format!("e.date >= ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(from.to_string()));
        }
        if let Some(to) = date_to {
            conditions.push(format!("e.date <= ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(to.to_string()));
        }
        if !conditions.is_empty() {
            query.push_str(&format!(" WHERE {}", conditions.join(" AND ")));
        }
        query.push_str(" ORDER BY e.date DESC, e.created_at DESC");

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map(&params_refs[..], |row| {
            Ok(Expense {
                id: row.get(0)?,
                category_id: row.get(1)?,
                amount: row.get(2)?,
                date: row.get(3)?,
                payee: row.get(4)?,
                payment_method: row.get(5)?,
                notes: row.get(6)?,
                receipt_path: row.get(7)?,
                created_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
                category_name: row.get(9)?,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_expense(conn: &Connection, req: CreateExpenseRequest) -> Result<Expense> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO expenses (id, category_id, amount, date, payee, payment_method, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, req.category_id, req.amount, req.date, req.payee, req.payment_method, req.notes, now],
        )?;
        // Update budget spent_amount
        conn.execute(
            "UPDATE budgets SET spent_amount = COALESCE((SELECT SUM(amount) FROM expenses WHERE category_id = ?1 AND strftime('%Y', date) = ?2), 0)
             WHERE category_id = ?1 AND fiscal_year = ?2",
            params![req.category_id, &req.date[..4]],
        )?;
        let query = format!("{} WHERE e.id = ?1", Self::EXPENSE_SELECT);
        conn.query_row(&query, params![id], |row| {
            Ok(Expense {
                id: row.get(0)?,
                category_id: row.get(1)?,
                amount: row.get(2)?,
                date: row.get(3)?,
                payee: row.get(4)?,
                payment_method: row.get(5)?,
                notes: row.get(6)?,
                receipt_path: row.get(7)?,
                created_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
                category_name: row.get(9)?,
            })
        })
    }

    pub fn update_expense(conn: &Connection, id: &str, req: UpdateExpenseRequest) -> Result<Expense> {
        let mut query = String::from("UPDATE expenses SET ");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;
        let mut updates = Vec::new();

        if let Some(ref cat_id) = req.category_id {
            updates.push(format!("category_id = ?{}", param_idx));
            params_vec.push(Box::new(cat_id.clone()));
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
        if let Some(ref payee) = req.payee {
            updates.push(format!("payee = ?{}", param_idx));
            params_vec.push(Box::new(payee.clone()));
            param_idx += 1;
        }
        if let Some(ref pm) = req.payment_method {
            updates.push(format!("payment_method = ?{}", param_idx));
            params_vec.push(Box::new(pm.clone()));
            param_idx += 1;
        }
        if let Some(ref notes) = req.notes {
            updates.push(format!("notes = ?{}", param_idx));
            params_vec.push(Box::new(notes.clone()));
            param_idx += 1;
        }

        if updates.is_empty() {
            let query = format!("{} WHERE e.id = ?1", Self::EXPENSE_SELECT);
            return conn.query_row(&query, params![id], |row| {
                Ok(Expense {
                    id: row.get(0)?, category_id: row.get(1)?, amount: row.get(2)?, date: row.get(3)?,
                    payee: row.get(4)?, payment_method: row.get(5)?, notes: row.get(6)?,
                    receipt_path: row.get(7)?, created_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
                    category_name: row.get(9)?,
                })
            });
        }

        query.push_str(&updates.join(", "));
        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        let query = format!("{} WHERE e.id = ?1", Self::EXPENSE_SELECT);
        conn.query_row(&query, params![id], |row| {
            Ok(Expense {
                id: row.get(0)?, category_id: row.get(1)?, amount: row.get(2)?, date: row.get(3)?,
                payee: row.get(4)?, payment_method: row.get(5)?, notes: row.get(6)?,
                receipt_path: row.get(7)?, created_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
                category_name: row.get(9)?,
            })
        })
    }

    pub fn delete_expense(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_expense_summaries(conn: &Connection, year: &str) -> Result<Vec<ExpenseSummary>> {
        let mut stmt = conn.prepare(
            "SELECT ec.name, COALESCE(SUM(e.amount), 0) FROM expenses e
             JOIN expense_categories ec ON e.category_id = ec.id
             WHERE strftime('%Y', e.date) = ?1
             GROUP BY ec.name ORDER BY ec.name"
        )?;
        let iter = stmt.query_map(params![year], |row| {
            Ok(ExpenseSummary { category_name: row.get(0)?, total: row.get(1)? })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }
}
