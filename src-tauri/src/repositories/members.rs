use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{Member, MemberRole, MemberStatus, CreateMemberRequest, UpdateMemberRequest};

fn compute_ministry(dob: &Option<String>, gender: &Option<String>, current_year: i32) -> Option<String> {
    let birth_year = dob.as_ref().and_then(|d| d.split('-').next()?.parse::<i32>().ok())?;
    let age = current_year - birth_year;
    match gender.as_deref() {
        Some("Male") if age >= 31 => Some("Men Ministry".to_string()),
        Some("Female") if age >= 31 => Some("Women Ministry".to_string()),
        _ if age >= 13 && age <= 30 => Some("Youth Ministry".to_string()),
        _ if age < 13 => Some("Children Service".to_string()),
        _ => None,
    }
}

pub struct MemberRepository;

impl MemberRepository {
    pub fn get_all(conn: &Connection) -> Result<Vec<Member>> {
        let mut stmt = conn.prepare(
            "SELECT id, first_name, last_name, email, phone, address, 
                    dob, gender, hometown, occupation, is_baptized, marital_status, emergency_contact,
                    role, status, ministry, joined_at, created_at, updated_at 
             FROM members ORDER BY last_name, first_name"
        )?;

        let member_iter = stmt.query_map([], |row| {
            Ok(Member {
                id: row.get(0)?,
                first_name: row.get(1)?,
                last_name: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                address: row.get(5)?,
                dob: row.get(6)?,
                gender: row.get(7)?,
                hometown: row.get(8)?,
                occupation: row.get(9)?,
                is_baptized: row.get(10)?,
                marital_status: row.get(11)?,
                emergency_contact: row.get(12)?,
                role: MemberRole::from_string(&row.get::<_, String>(13)?),
                status: MemberStatus::from_string(&row.get::<_, String>(14)?),
                ministry: row.get::<_, Option<String>>(15)?,
                joined_at: row.get::<_, Option<String>>(16)?.map(|s| s.parse().unwrap_or(Utc::now())),
                created_at: row.get::<_, String>(17)?.parse().unwrap_or(Utc::now()),
                updated_at: row.get::<_, String>(18)?.parse().unwrap_or(Utc::now()),
            })
        })?;

        let mut members = Vec::new();
        for member in member_iter {
            members.push(member?);
        }
        Ok(members)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Member> {
        conn.query_row(
            "SELECT id, first_name, last_name, email, phone, address, 
                    dob, gender, hometown, occupation, is_baptized, marital_status, emergency_contact,
                    role, status, ministry, joined_at, created_at, updated_at 
             FROM members WHERE id = ?1",
            params![id],
            |row| {
                Ok(Member {
                    id: row.get(0)?,
                    first_name: row.get(1)?,
                    last_name: row.get(2)?,
                    email: row.get(3)?,
                    phone: row.get(4)?,
                    address: row.get(5)?,
                    dob: row.get(6)?,
                    gender: row.get(7)?,
                    hometown: row.get(8)?,
                    occupation: row.get(9)?,
                    is_baptized: row.get(10)?,
                    marital_status: row.get(11)?,
                    emergency_contact: row.get(12)?,
                    role: MemberRole::from_string(&row.get::<_, String>(13)?),
                    status: MemberStatus::from_string(&row.get::<_, String>(14)?),
                    ministry: row.get::<_, Option<String>>(15)?,
                    joined_at: row.get::<_, Option<String>>(16)?.map(|s| s.parse().unwrap_or(Utc::now())),
                    created_at: row.get::<_, String>(17)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(18)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn create(conn: &Connection, req: CreateMemberRequest) -> Result<Member> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let role = req.role.unwrap_or(MemberRole::Member).to_string();
        let status = MemberStatus::Active.to_string();
        let current_year = Utc::now().format("%Y").to_string().parse::<i32>().unwrap_or(2026);
        let ministry = req.ministry.clone().or_else(|| compute_ministry(&req.dob, &req.gender, current_year));

        conn.execute(
            "INSERT INTO members (
                id, first_name, last_name, email, phone, address, 
                dob, gender, hometown, occupation, is_baptized, marital_status, emergency_contact,
                role, status, ministry, joined_at, created_at, updated_at
            )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            params![
                id,
                req.first_name,
                req.last_name,
                req.email,
                req.phone,
                req.address,
                req.dob,
                req.gender,
                req.hometown,
                req.occupation,
                req.is_baptized.unwrap_or(false),
                req.marital_status,
                req.emergency_contact,
                role,
                status,
                ministry,
                now, // Default joined_at to now
                now,
                now
            ],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn update(conn: &Connection, id: &str, req: UpdateMemberRequest) -> Result<Member> {
        let now = Utc::now().to_rfc3339();
        
        // Build dynamic update query
        let mut query = String::from("UPDATE members SET updated_at = ?1");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
        let mut param_idx = 2;

        if let Some(first_name) = req.first_name {
            query.push_str(&format!(", first_name = ?{}", param_idx));
            params_vec.push(Box::new(first_name));
            param_idx += 1;
        }
        if let Some(last_name) = req.last_name {
            query.push_str(&format!(", last_name = ?{}", param_idx));
            params_vec.push(Box::new(last_name));
            param_idx += 1;
        }
        if let Some(email) = req.email {
            query.push_str(&format!(", email = ?{}", param_idx));
            params_vec.push(Box::new(email));
            param_idx += 1;
        }
        if let Some(phone) = req.phone {
            query.push_str(&format!(", phone = ?{}", param_idx));
            params_vec.push(Box::new(phone));
            param_idx += 1;
        }
        if let Some(address) = req.address {
            query.push_str(&format!(", address = ?{}", param_idx));
            params_vec.push(Box::new(address));
            param_idx += 1;
        }
        if let Some(dob) = req.dob {
            query.push_str(&format!(", dob = ?{}", param_idx));
            params_vec.push(Box::new(dob));
            param_idx += 1;
        }
        if let Some(gender) = req.gender {
            query.push_str(&format!(", gender = ?{}", param_idx));
            params_vec.push(Box::new(gender));
            param_idx += 1;
        }
        if let Some(hometown) = req.hometown {
            query.push_str(&format!(", hometown = ?{}", param_idx));
            params_vec.push(Box::new(hometown));
            param_idx += 1;
        }
        if let Some(occupation) = req.occupation {
            query.push_str(&format!(", occupation = ?{}", param_idx));
            params_vec.push(Box::new(occupation));
            param_idx += 1;
        }
        if let Some(is_baptized) = req.is_baptized {
            query.push_str(&format!(", is_baptized = ?{}", param_idx));
            params_vec.push(Box::new(is_baptized));
            param_idx += 1;
        }
        if let Some(marital_status) = req.marital_status {
            query.push_str(&format!(", marital_status = ?{}", param_idx));
            params_vec.push(Box::new(marital_status));
            param_idx += 1;
        }
        if let Some(emergency_contact) = req.emergency_contact {
            query.push_str(&format!(", emergency_contact = ?{}", param_idx));
            params_vec.push(Box::new(emergency_contact));
            param_idx += 1;
        }
        if let Some(role) = req.role {
            query.push_str(&format!(", role = ?{}", param_idx));
            params_vec.push(Box::new(role.to_string()));
            param_idx += 1;
        }
        if let Some(status) = req.status {
            query.push_str(&format!(", status = ?{}", param_idx));
            params_vec.push(Box::new(status.to_string()));
            param_idx += 1;
        }
        if let Some(ministry) = req.ministry {
            query.push_str(&format!(", ministry = ?{}", param_idx));
            params_vec.push(Box::new(ministry));
            param_idx += 1;
        }

        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        Self::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM members WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn promote(conn: &Connection, id: &str, role: MemberRole) -> Result<Member> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE members SET role = ?1, updated_at = ?2 WHERE id = ?3",
            params![role.to_string(), now, id],
        )?;
        Self::get_by_id(conn, id)
    }

    pub fn suspend(conn: &Connection, id: &str) -> Result<Member> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE members SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![MemberStatus::Suspended.to_string(), now, id],
        )?;
        Self::get_by_id(conn, id)
    }

    pub fn active(conn: &Connection, id: &str) -> Result<Member> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE members SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![MemberStatus::Active.to_string(), now, id],
        )?;
        Self::get_by_id(conn, id)
    }
}
