use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{
    Visitation, CreateVisitationRequest,
    PrayerRequest, CreatePrayerRequestRequest,
    CounsellingSession, CreateCounsellingSessionRequest,
};
use crate::error::AppResult;

pub struct PastoralCareRepository;

impl PastoralCareRepository {
    // --- Visitations ---
    pub fn get_visitations(conn: &Connection) -> Result<Vec<Visitation>> {
        let mut stmt = conn.prepare(
            "SELECT v.id, v.member_id, v.visitor_id, v.visitation_date, v.visitation_type,
                    v.notes, v.conducted_by, v.follow_up_needed, v.follow_up_date, v.created_at,
                    COALESCE(m.first_name || ' ' || m.last_name, vis.first_name || ' ' || vis.last_name, 'N/A') as person_name
             FROM visitations v
             LEFT JOIN members m ON v.member_id = m.id
             LEFT JOIN visitors vis ON v.visitor_id = vis.id
             ORDER BY v.visitation_date DESC"
        )?;
        let iter = stmt.query_map([], |row| {
            Ok(Visitation {
                id: row.get(0)?,
                member_id: row.get(1)?,
                visitor_id: row.get(2)?,
                visitation_date: row.get(3)?,
                visitation_type: row.get(4)?,
                notes: row.get(5)?,
                conducted_by: row.get(6)?,
                follow_up_needed: row.get(7)?,
                follow_up_date: row.get(8)?,
                created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                person_name: row.get(10)?,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_visitation(conn: &Connection, req: CreateVisitationRequest) -> Result<Visitation> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let vtype = req.visitation_type.unwrap_or_else(|| "home".to_string());
        let follow_up = req.follow_up_needed.unwrap_or(false);
        conn.execute(
            "INSERT INTO visitations (id, member_id, visitation_date, visitation_type, notes, conducted_by, follow_up_needed, follow_up_date, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, req.member_id, req.visitation_date, vtype, req.notes, req.conducted_by, follow_up, req.follow_up_date, now],
        )?;
        let mut stmt = conn.prepare(
            "SELECT v.id, v.member_id, v.visitor_id, v.visitation_date, v.visitation_type,
                    v.notes, v.conducted_by, v.follow_up_needed, v.follow_up_date, v.created_at,
                    COALESCE(m.first_name || ' ' || m.last_name, 'N/A') as person_name
             FROM visitations v
             LEFT JOIN members m ON v.member_id = m.id
             WHERE v.id = ?1"
        )?;
        stmt.query_row(params![id], |row| {
            Ok(Visitation {
                id: row.get(0)?,
                member_id: row.get(1)?,
                visitor_id: row.get(2)?,
                visitation_date: row.get(3)?,
                visitation_type: row.get(4)?,
                notes: row.get(5)?,
                conducted_by: row.get(6)?,
                follow_up_needed: row.get(7)?,
                follow_up_date: row.get(8)?,
                created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                person_name: row.get(10)?,
            })
        })
    }

    pub fn delete_visitation(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM visitations WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Prayer Requests ---
    pub fn get_prayer_requests(conn: &Connection) -> Result<Vec<PrayerRequest>> {
        let mut stmt = conn.prepare(
            "SELECT p.id, p.member_id, p.visitor_id, p.request, p.is_anonymous,
                    p.category, p.status, p.prayed_for_date, p.notes, p.created_at, p.updated_at,
                    CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE COALESCE(m.first_name || ' ' || m.last_name, 'N/A') END as requester_name
             FROM prayer_requests p
             LEFT JOIN members m ON p.member_id = m.id
             ORDER BY p.created_at DESC"
        )?;
        let iter = stmt.query_map([], |row| {
            Ok(PrayerRequest {
                id: row.get(0)?,
                member_id: row.get(1)?,
                visitor_id: row.get(2)?,
                request: row.get(3)?,
                is_anonymous: row.get(4)?,
                category: row.get(5)?,
                status: row.get(6)?,
                prayed_for_date: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                updated_at: row.get::<_, String>(10)?.parse().unwrap_or(Utc::now()),
                requester_name: row.get(11)?,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_prayer_request(conn: &Connection, req: CreatePrayerRequestRequest) -> Result<PrayerRequest> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO prayer_requests (id, member_id, request, is_anonymous, category, status, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7, ?7)",
            params![id, req.member_id, req.request, req.is_anonymous.unwrap_or(false), req.category.unwrap_or_else(|| "general".to_string()), req.notes, now],
        )?;
        Self::get_prayer_request_by_id(conn, &id)
    }

    pub fn get_prayer_request_by_id(conn: &Connection, id: &str) -> Result<PrayerRequest> {
        conn.query_row(
            "SELECT p.id, p.member_id, p.visitor_id, p.request, p.is_anonymous,
                    p.category, p.status, p.prayed_for_date, p.notes, p.created_at, p.updated_at,
                    CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE COALESCE(m.first_name || ' ' || m.last_name, 'N/A') END
             FROM prayer_requests p
             LEFT JOIN members m ON p.member_id = m.id
             WHERE p.id = ?1",
            params![id],
            |row| {
                Ok(PrayerRequest {
                    id: row.get(0)?,
                    member_id: row.get(1)?,
                    visitor_id: row.get(2)?,
                    request: row.get(3)?,
                    is_anonymous: row.get(4)?,
                    category: row.get(5)?,
                    status: row.get(6)?,
                    prayed_for_date: row.get(7)?,
                    notes: row.get(8)?,
                    created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(10)?.parse().unwrap_or(Utc::now()),
                    requester_name: row.get(11)?,
                })
            }
        )
    }

    pub fn update_prayer_status(conn: &Connection, id: &str, status: &str) -> Result<PrayerRequest> {
        let now = Utc::now().to_rfc3339();
        let prayed_date = if status == "prayed" { Some(now.clone()) } else { None };
        conn.execute(
            "UPDATE prayer_requests SET status = ?1, prayed_for_date = COALESCE(?2, prayed_for_date), updated_at = ?3 WHERE id = ?4",
            params![status, prayed_date, now, id],
        )?;
        Self::get_prayer_request_by_id(conn, id)
    }

    pub fn delete_prayer_request(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM prayer_requests WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Counselling Sessions ---
    pub fn get_counselling_sessions(conn: &Connection) -> Result<Vec<CounsellingSession>> {
        let mut stmt = conn.prepare(
            "SELECT c.id, c.member_id, c.session_date, c.session_type, c.notes, c.is_confidential,
                    c.conducted_by, c.follow_up_date, c.status, c.created_at, c.updated_at,
                    m.first_name || ' ' || m.last_name as member_name
             FROM counselling_sessions c
             JOIN members m ON c.member_id = m.id
             ORDER BY c.session_date DESC"
        )?;
        let iter = stmt.query_map([], |row| {
            Ok(CounsellingSession {
                id: row.get(0)?,
                member_id: row.get(1)?,
                session_date: row.get(2)?,
                session_type: row.get(3)?,
                notes: row.get(4)?,
                is_confidential: row.get(5)?,
                conducted_by: row.get(6)?,
                follow_up_date: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                updated_at: row.get::<_, String>(10)?.parse().unwrap_or(Utc::now()),
                member_name: row.get(11)?,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_counselling_session(conn: &Connection, req: CreateCounsellingSessionRequest) -> Result<CounsellingSession> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO counselling_sessions (id, member_id, session_date, session_type, notes, is_confidential, conducted_by, follow_up_date, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'completed', ?9, ?9)",
            params![id, req.member_id, req.session_date, req.session_type, req.notes, req.is_confidential.unwrap_or(false), req.conducted_by, req.follow_up_date, now],
        )?;
        conn.query_row(
            "SELECT c.id, c.member_id, c.session_date, c.session_type, c.notes, c.is_confidential,
                    c.conducted_by, c.follow_up_date, c.status, c.created_at, c.updated_at,
                    m.first_name || ' ' || m.last_name as member_name
             FROM counselling_sessions c
             JOIN members m ON c.member_id = m.id
             WHERE c.id = ?1",
            params![id],
            |row| {
                Ok(CounsellingSession {
                    id: row.get(0)?,
                    member_id: row.get(1)?,
                    session_date: row.get(2)?,
                    session_type: row.get(3)?,
                    notes: row.get(4)?,
                    is_confidential: row.get(5)?,
                    conducted_by: row.get(6)?,
                    follow_up_date: row.get(7)?,
                    status: row.get(8)?,
                    created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(10)?.parse().unwrap_or(Utc::now()),
                    member_name: row.get(11)?,
                })
            }
        )
    }

    pub fn delete_counselling_session(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM counselling_sessions WHERE id = ?1", params![id])?;
        Ok(())
    }
}
