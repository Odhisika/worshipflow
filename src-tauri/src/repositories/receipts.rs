use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{Receipt, GenerateReceiptRequest};

pub struct ReceiptRepository;

impl ReceiptRepository {
    pub fn get_receipts(conn: &Connection, member_id: Option<&str>) -> Result<Vec<Receipt>> {
        let mut query = String::from(
            "SELECT r.id, r.receipt_number, r.contribution_id, r.member_id,
                    m.first_name || ' ' || m.last_name as member_name,
                    r.amount, r.date, r.type, r.notes, r.generated_at
             FROM receipts r
             LEFT JOIN members m ON r.member_id = m.id"
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        if let Some(mid) = member_id {
            query.push_str(&format!(" WHERE r.member_id = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(mid.to_string()));
        }
        query.push_str(" ORDER BY r.generated_at DESC");

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map(&params_refs[..], |row| {
            Ok(Receipt {
                id: row.get(0)?,
                receipt_number: row.get(1)?,
                contribution_id: row.get(2)?,
                member_id: row.get(3)?,
                member_name: row.get(4)?,
                amount: row.get(5)?,
                date: row.get(6)?,
                receipt_type: row.get(7)?,
                notes: row.get(8)?,
                generated_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn generate_receipt(conn: &Connection, req: GenerateReceiptRequest) -> Result<Receipt> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Get contribution details
        let (amount, contribution_date, member_id, type_name): (f64, String, Option<String>, String) = conn.query_row(
            "SELECT c.amount, c.date, c.member_id, COALESCE(gt.name, 'Contribution')
             FROM contributions c JOIN giving_types gt ON c.type_id = gt.id WHERE c.id = ?1",
            params![req.contribution_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )?;

        // Generate receipt number
        let receipt_number = req.receipt_number.unwrap_or_else(|| {
            let count: i64 = conn.query_row("SELECT COUNT(*) FROM receipts", [], |row| row.get(0)).unwrap_or(0);
            format!("RCP-{}-{:05}", Utc::now().format("%Y%m%d"), count + 1)
        });

        // Look up member name
        let member_name: Option<String> = member_id.as_ref().and_then(|mid| {
            conn.query_row(
                "SELECT first_name || ' ' || last_name FROM members WHERE id = ?1",
                params![mid],
                |row| row.get(0),
            ).ok()
        });

        conn.execute(
            "INSERT INTO receipts (id, receipt_number, contribution_id, member_id, amount, date, type, notes, generated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, receipt_number, req.contribution_id, member_id, amount, contribution_date, type_name, None::<String>, now],
        )?;

        Ok(Receipt {
            id,
            receipt_number,
            contribution_id: Some(req.contribution_id),
            member_id,
            member_name,
            amount,
            date: contribution_date,
            receipt_type: type_name,
            notes: None,
            generated_at: now.parse().unwrap_or(Utc::now()),
        })
    }

    pub fn delete_receipt(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM receipts WHERE id = ?1", params![id])?;
        Ok(())
    }
}
