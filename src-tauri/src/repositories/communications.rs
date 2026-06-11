use crate::error::AppResult;
use crate::models::{Campaign, CreateCampaignRequest, SubscriberStats};
use rusqlite::{params, Connection};
use chrono::Utc;
use uuid::Uuid;

pub struct CommunicationsRepository;

impl CommunicationsRepository {
    pub fn create_campaign(conn: &Connection, request: CreateCampaignRequest) -> AppResult<Campaign> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let now_str = now.to_rfc3339();
        
        let status = if request.scheduled_at.is_some() { "Scheduled" } else { "Draft" };

        conn.execute(
            "INSERT INTO campaigns (id, name, type, content, status, scheduled_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                request.name,
                request.campaign_type,
                request.content,
                status,
                request.scheduled_at,
                now_str,
                now_str,
            ],
        )?;

        Self::get_campaign_by_id(conn, &id)
    }

    pub fn get_campaigns(conn: &Connection) -> AppResult<Vec<Campaign>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, type, content, recipient_count, open_rate, click_rate, status, scheduled_at, sent_at, created_at, updated_at 
             FROM campaigns ORDER BY created_at DESC"
        )?;

        let campaigns = stmt.query_map([], |row| {
            Ok(Campaign {
                id: row.get(0)?,
                name: row.get(1)?,
                campaign_type: row.get(2)?,
                content: row.get(3)?,
                recipient_count: row.get(4)?,
                open_rate: row.get(5)?,
                click_rate: row.get(6)?,
                status: row.get(7)?,
                scheduled_at: row.get::<_, Option<String>>(8)?.map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
                sent_at: row.get::<_, Option<String>>(9)?.map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<usize, String>(10)?).unwrap().with_timezone(&Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<usize, String>(11)?).unwrap().with_timezone(&Utc),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(campaigns)
    }

    pub fn get_campaign_by_id(conn: &Connection, id: &str) -> AppResult<Campaign> {
        conn.query_row(
            "SELECT id, name, type, content, recipient_count, open_rate, click_rate, status, scheduled_at, sent_at, created_at, updated_at 
             FROM campaigns WHERE id = ?1",
            [id],
            |row| {
                Ok(Campaign {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    campaign_type: row.get(2)?,
                    content: row.get(3)?,
                    recipient_count: row.get(4)?,
                    open_rate: row.get(5)?,
                    click_rate: row.get(6)?,
                    status: row.get(7)?,
                    scheduled_at: row.get::<_, Option<String>>(8)?.map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
                    sent_at: row.get::<_, Option<String>>(9)?.map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
                    created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<usize, String>(10)?).unwrap().with_timezone(&Utc),
                    updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<usize, String>(11)?).unwrap().with_timezone(&Utc),
                })
            },
        ).map_err(Into::into)
    }

    pub fn get_subscriber_stats(conn: &Connection) -> AppResult<SubscriberStats> {
        // For simplicity, everyone is a subscriber unless opt-out (opt-out not yet implemented)
        let email_count: i32 = conn.query_row("SELECT COUNT(*) FROM members WHERE email IS NOT NULL AND status = 'active'", [], |row| row.get(0))?;
        let sms_count: i32 = conn.query_row("SELECT COUNT(*) FROM members WHERE phone IS NOT NULL AND status = 'active'", [], |row| row.get(0))?;
        
        let avg_open: f64 = conn.query_row(
            "SELECT COALESCE(AVG(open_rate), 0) FROM campaigns WHERE status = 'Sent'",
            [],
            |row| row.get(0)
        )?;

        Ok(SubscriberStats {
            email_subscribers: email_count,
            sms_subscribers: sms_count,
            avg_open_rate: avg_open,
        })
    }

    pub fn delete_campaign(conn: &Connection, id: &str) -> AppResult<()> {
        conn.execute("DELETE FROM campaigns WHERE id = ?1", [id])?;
        Ok(())
    }
}
