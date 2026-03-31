use crate::error::AppResult;
use crate::models::{AnalyticsReport, AttendanceTrend, GivingSummary, GrowthMetric};
use rusqlite::Connection;

pub struct ReportsRepository;

impl ReportsRepository {
    pub fn get_analytics_report(conn: &Connection) -> AppResult<AnalyticsReport> {
        // 1. Attendance Trends (Last 6 months)
        let mut stmt = conn.prepare(
            "SELECT strftime('%Y-%m', date) as month, COUNT(*) as count 
             FROM attendance 
             WHERE status = 'Present'
             GROUP BY month 
             ORDER BY month DESC 
             LIMIT 6"
        )?;
        let attendance_trends = stmt.query_map([], |row| {
            Ok(AttendanceTrend {
                month: row.get(0)?,
                count: row.get(1)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 2. Giving Summaries
        let mut stmt = conn.prepare(
            "SELECT type, SUM(amount) as total 
             FROM finance_entries 
             GROUP BY type"
        )?;
        let giving_summaries = stmt.query_map([], |row| {
            Ok(GivingSummary {
                category: row.get(0)?,
                total: row.get(1)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 3. Growth Metrics (Monthly signups)
        let mut stmt = conn.prepare(
            "SELECT strftime('%Y-%m', join_date) as period, COUNT(*) as new_members 
             FROM members 
             GROUP BY period 
             ORDER BY period DESC 
             LIMIT 12"
        )?;
        let growth_metrics = stmt.query_map([], |row| {
            Ok(GrowthMetric {
                period: row.get(0)?,
                new_members: row.get(1)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(AnalyticsReport {
            attendance_trends,
            giving_summaries,
            growth_metrics,
        })
    }
}
