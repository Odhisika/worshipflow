use crate::error::AppResult;
use crate::models::SystemStats;
use rusqlite::Connection;
use chrono::{Utc, Duration, Datelike};

pub struct OverviewRepository;

impl OverviewRepository {
    pub fn get_system_stats(conn: &Connection) -> AppResult<SystemStats> {
        let total_members: i32 = conn.query_row("SELECT COUNT(*) FROM members", [], |row| row.get(0))?;
        
        // Members growth (this month)
        let first_of_month = Utc::now().with_day0(0).unwrap().format("%Y-%m-%d").to_string();
        let members_growth: i32 = conn.query_row(
            "SELECT COUNT(*) FROM members WHERE created_at >= ?1",
            [&first_of_month],
            |row| row.get(0)
        )?;

        // Weekly giving (current week)
        let now = Utc::now();
        let last_7_days = (now - Duration::days(7)).to_rfc3339();
        let current_weekly_giving: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions WHERE created_at >= ?1",
            [&last_7_days],
            |row| row.get(0)
        )?;

        // Previous week giving (for trend)
        let last_14_days = (now - Duration::days(14)).to_rfc3339();
        let previous_weekly_giving: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM contributions WHERE created_at >= ?1 AND created_at < ?2",
            [&last_14_days, &last_7_days],
            |row| row.get(0)
        )?;

        let giving_trend = if previous_weekly_giving > 0.0 {
            ((current_weekly_giving - previous_weekly_giving) / previous_weekly_giving) * 100.0
        } else if current_weekly_giving > 0.0 {
            100.0
        } else {
            0.0
        };

        // Upcoming events
        let upcoming_events: i32 = conn.query_row(
            "SELECT COUNT(*) FROM events WHERE date >= date('now')",
            [],
            |row| row.get(0)
        )?;

        let next_event_title: String = conn.query_row(
            "SELECT title FROM events WHERE date >= date('now') ORDER BY date ASC LIMIT 1",
            [],
            |row| row.get(0)
        ).unwrap_or_else(|_| "No events scheduled".to_string());

        // Active groups
        let active_groups: i32 = conn.query_row("SELECT COUNT(*) FROM groups", [], |row| row.get(0))?;
        
        // Total participants in groups
        let total_participants: i32 = conn.query_row("SELECT COUNT(*) FROM group_members", [], |row| row.get(0))?;

        Ok(SystemStats {
            total_members,
            members_growth,
            weekly_giving: current_weekly_giving,
            giving_trend,
            upcoming_events,
            next_event_title,
            active_groups,
            total_participants,
        })
    }

    pub fn get_recent_activity(conn: &Connection) -> AppResult<Vec<serde_json::Value>> {
        let mut activities = Vec::new();

        // Latest members
        let mut stmt = conn.prepare("SELECT first_name, last_name, created_at FROM members ORDER BY created_at DESC LIMIT 5")?;
        let members = stmt.query_map([], |row| {
            let first_name: String = row.get(0)?;
            let last_name: String = row.get(1)?;
            Ok(serde_json::json!({
                "id": uuid::Uuid::new_v4().to_string(),
                "name": format!("{} {}", first_name, last_name),
                "action": "joined the church",
                "time": row.get::<_, String>(2)?,
                "type": "member"
            }))
        })?;
        for m in members { activities.push(m?); }

        // Latest contributions
        let mut stmt = conn.prepare("SELECT m.first_name, m.last_name, c.amount, c.created_at FROM contributions c JOIN members m ON c.member_id = m.id ORDER BY c.created_at DESC LIMIT 5")?;
        let contributions = stmt.query_map([], |row| {
            let first_name: String = row.get(0)?;
            let last_name: String = row.get(1)?;
            Ok(serde_json::json!({
                "id": uuid::Uuid::new_v4().to_string(),
                "name": format!("{} {}", first_name, last_name),
                "action": format!("contributed Ghc {}", row.get::<_, f64>(2)?),
                "time": row.get::<_, String>(3)?,
                "type": "finance"
            }))
        })?;
        for c in contributions { activities.push(c?); }

        // In a real app, we'd parse dates and sort properly
        // For now, let's just make sure they are somewhat interleaved or just return them
        activities.sort_by(|a, b| {
            let a_time = a["time"].as_str().unwrap_or("");
            let b_time = b["time"].as_str().unwrap_or("");
            b_time.cmp(a_time) // Latest first
        });
        activities.truncate(10);

        Ok(activities)
    }
}
