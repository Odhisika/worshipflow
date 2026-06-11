use rusqlite::{Connection, Result, params};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{CheckIn, CheckInRequest, CheckInStatus, MemberRelationship, CreateRelationshipRequest};
use rand::Rng;

pub struct CheckInRepository;

impl CheckInRepository {
    pub fn get_active(conn: &Connection) -> Result<Vec<CheckIn>> {
        let mut stmt = conn.prepare(
            "SELECT c.id, c.member_id, c.service_id, c.event_id, c.location, 
                    c.check_in_time, c.check_out_time, c.security_code, c.status, c.created_at,
                    m.first_name || ' ' || m.last_name as member_name,
                    s.title as service_title
             FROM check_ins c
             JOIN members m ON c.member_id = m.id
             LEFT JOIN services s ON c.service_id = s.id
             WHERE c.status = 'active'
             ORDER BY c.check_in_time DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(CheckIn {
                id: row.get(0)?,
                member_id: row.get(1)?,
                service_id: row.get(2)?,
                event_id: row.get(3)?,
                location: row.get(4)?,
                check_in_time: row.get::<_, String>(5)?.parse().unwrap_or(Utc::now()),
                check_out_time: row.get::<_, Option<String>>(6)?.map(|s| s.parse().unwrap_or(Utc::now())),
                security_code: row.get(7)?,
                status: CheckInStatus::from_string(&row.get::<_, String>(8)?),
                created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                member_name: row.get(10)?,
                service_title: row.get(11)?,
            })
        })?;

        let mut checkins = Vec::new();
        for checkin in rows {
            checkins.push(checkin?);
        }
        Ok(checkins)
    }

    pub fn check_in(conn: &Connection, req: CheckInRequest) -> Result<CheckIn> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let now_str = now.to_rfc3339();
        
        // Generate a 4-digit security code
        let mut rng = rand::thread_rng();
        let security_code: String = (0..4).map(|_| rng.gen_range(0..10).to_string()).collect();

        conn.execute(
            "INSERT INTO check_ins (id, member_id, service_id, event_id, location, 
                                   check_in_time, security_code, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                req.member_id,
                req.service_id,
                req.event_id,
                req.location,
                now_str,
                security_code,
                "active",
                now_str
            ],
        )?;

        Ok(CheckIn {
            id,
            member_id: req.member_id,
            service_id: req.service_id,
            event_id: req.event_id,
            location: req.location,
            check_in_time: now,
            check_out_time: None,
            security_code,
            status: CheckInStatus::Active,
            created_at: now,
            member_name: None,
            service_title: None,
        })
    }

    pub fn check_out(conn: &Connection, id: &str, code: &str) -> Result<bool> {
        let now = Utc::now().to_rfc3339();
        
        // Verify security code
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM check_ins WHERE id = ?1 AND security_code = ?2 AND status = 'active'",
            params![id, code],
            |row| row.get(0),
        )?;

        if count == 0 {
            return Ok(false);
        }

        conn.execute(
            "UPDATE check_ins SET status = 'completed', check_out_time = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        Ok(true)
    }

    pub fn create_relationship(conn: &Connection, req: CreateRelationshipRequest) -> Result<MemberRelationship> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        conn.execute(
            "INSERT INTO member_relationships (id, child_id, guardian_id, relationship_type, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, req.child_id, req.guardian_id, req.relationship_type, now_str],
        )?;

        Ok(MemberRelationship {
            id,
            child_id: req.child_id,
            guardian_id: req.guardian_id,
            relationship_type: req.relationship_type,
            created_at: now,
            child_name: None,
            guardian_name: None,
        })
    }

    pub fn get_relationships_for_member(conn: &Connection, member_id: &str) -> Result<Vec<MemberRelationship>> {
        let mut stmt = conn.prepare(
            "SELECT r.id, r.child_id, r.guardian_id, r.relationship_type, r.created_at,
                    c.first_name || ' ' || c.last_name as child_name,
                    g.first_name || ' ' || g.last_name as guardian_name
             FROM member_relationships r
             JOIN members c ON r.child_id = c.id
             JOIN members g ON r.guardian_id = g.id
             WHERE r.child_id = ?1 OR r.guardian_id = ?1"
        )?;

        let rows = stmt.query_map(params![member_id], |row| {
            Ok(MemberRelationship {
                id: row.get(0)?,
                child_id: row.get(1)?,
                guardian_id: row.get(2)?,
                relationship_type: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap_or(Utc::now()),
                child_name: row.get(5)?,
                guardian_name: row.get(6)?,
            })
        })?;

        let mut relationships = Vec::new();
        for r in rows {
            relationships.push(r?);
        }
        Ok(relationships)
    }
}
