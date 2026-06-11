use crate::error::{AppError, AppResult};
use crate::models::{AttendanceRecord, MarkAttendanceRequest, MemberAttendanceRecord, ServiceAttendanceSummary};
use rusqlite::{params, Connection};
use chrono::Utc;
use uuid::Uuid;

pub struct AttendanceRepository;

impl AttendanceRepository {
    pub fn mark_attendance(conn: &Connection, request: MarkAttendanceRequest) -> AppResult<AttendanceRecord> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        conn.execute(
            "INSERT INTO attendance (id, service_id, member_id, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(service_id, member_id) DO UPDATE SET
             status = excluded.status",
            params![&id, &request.service_id, &request.member_id, &request.status, &now.to_rfc3339()],
        )?;

        Ok(AttendanceRecord {
            id,
            service_id: request.service_id,
            member_id: request.member_id,
            status: request.status,
            created_at: now,
            member_name: None,
        })
    }

    pub fn get_service_attendance(conn: &Connection, service_id: &str) -> AppResult<Vec<AttendanceRecord>> {
        let mut stmt = conn.prepare(
            "SELECT a.id, a.service_id, a.member_id, a.status, a.created_at,
                    m.first_name || ' ' || m.last_name as member_name
             FROM attendance a
             JOIN members m ON a.member_id = m.id
             WHERE a.service_id = ?1"
        )?;

        let records = stmt.query_map([service_id], |row| {
            Ok(AttendanceRecord {
                id: row.get(0)?, service_id: row.get(1)?, member_id: row.get(2)?,
                status: row.get(3)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .unwrap_or_else(|_| Utc::now().into()).with_timezone(&Utc),
                member_name: Some(row.get(5)?),
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(records)
    }

    pub fn get_all_member_attendance_for_service(conn: &Connection, service_id: &str) -> AppResult<Vec<MemberAttendanceRecord>> {
        let mut stmt = conn.prepare(
            "SELECT m.id, m.first_name || ' ' || m.last_name as member_name, a.status, m.role
             FROM members m
             LEFT JOIN attendance a ON a.member_id = m.id AND a.service_id = ?1
             WHERE m.status = 'active'
             ORDER BY m.first_name ASC"
        )?;

        let records = stmt.query_map([service_id], |row| {
            Ok(MemberAttendanceRecord {
                member_id: row.get(0)?,
                member_name: row.get(1)?,
                status: row.get(2)?,
                role: row.get(3)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(records)
    }

    pub fn get_attendance_summary(conn: &Connection, service_id: &str) -> AppResult<ServiceAttendanceSummary> {
        let mut stmt = conn.prepare(
            "SELECT s.id, s.title, s.date,
                    (SELECT COUNT(*) FROM attendance WHERE service_id = s.id AND status = 'present') as present,
                    (SELECT COUNT(*) FROM attendance WHERE service_id = s.id AND status = 'absent') as absent,
                    (SELECT COUNT(*) FROM attendance WHERE service_id = s.id AND status = 'excused') as excused,
                    (SELECT COUNT(*) FROM members WHERE status = 'active') as total
             FROM services s
             WHERE s.id = ?1"
        )?;

        let summary = stmt.query_row([service_id], |row| {
            Ok(ServiceAttendanceSummary {
                service_id: row.get(0)?,
                service_title: row.get(1)?,
                service_date: row.get(2)?,
                total_present: row.get(3)?,
                total_absent: row.get(4)?,
                total_excused: row.get(5)?,
                total_members: row.get(6)?,
            })
        }).map_err(|_| AppError::NotFound(format!("Service with id {} not found", service_id)))?;

        Ok(summary)
    }
}
