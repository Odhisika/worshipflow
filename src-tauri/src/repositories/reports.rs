use crate::error::AppResult;
use crate::models::{AnalyticsReport, AttendanceTrend, GivingSummary, GrowthMetric};
use rusqlite::Connection;

pub struct ReportsRepository;

impl ReportsRepository {
    pub fn get_analytics_report(conn: &Connection) -> AppResult<AnalyticsReport> {
        let attendance_trends = Self::get_attendance_trends(conn)?;
        let giving_summaries = Self::get_giving_summaries(conn)?;
        let growth_metrics = Self::get_growth_metrics(conn)?;

        Ok(AnalyticsReport {
            attendance_trends,
            giving_summaries,
            growth_metrics,
        })
    }

    fn get_attendance_trends(conn: &Connection) -> AppResult<Vec<AttendanceTrend>> {
        let mut stmt = conn.prepare(
            "SELECT strftime('%Y-%m', s.date) as month, COUNT(a.id) as count
             FROM services s
             LEFT JOIN attendance a ON a.service_id = s.id AND a.status = 'present'
             GROUP BY month
             ORDER BY month DESC
             LIMIT 12"
        )?;
        let trends = stmt.query_map([], |row| {
            Ok(AttendanceTrend {
                month: row.get(0)?,
                count: row.get(1)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(trends)
    }

    fn get_giving_summaries(conn: &Connection) -> AppResult<Vec<GivingSummary>> {
        let mut stmt = conn.prepare(
            "SELECT COALESCE(gt.name, 'Other') as category, SUM(c.amount) as total
             FROM contributions c
             LEFT JOIN giving_types gt ON c.type_id = gt.id
             GROUP BY c.type_id
             ORDER BY total DESC"
        )?;
        let summaries = stmt.query_map([], |row| {
            Ok(GivingSummary {
                category: row.get(0)?,
                total: row.get(1)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(summaries)
    }

    fn get_growth_metrics(conn: &Connection) -> AppResult<Vec<GrowthMetric>> {
        let mut stmt = conn.prepare(
            "SELECT strftime('%Y-%m', joined_at) as period, COUNT(*) as new_members
             FROM members
             WHERE joined_at IS NOT NULL
             GROUP BY period
             ORDER BY period DESC
             LIMIT 12"
        )?;
        let metrics = stmt.query_map([], |row| {
            Ok(GrowthMetric {
                period: row.get(0)?,
                new_members: row.get(1)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(metrics)
    }
}
