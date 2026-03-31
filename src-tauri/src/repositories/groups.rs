use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{Group, GroupMember, CreateGroupRequest, UpdateGroupRequest, AddMemberToGroupRequest};

pub struct GroupRepository;

impl GroupRepository {
    pub fn get_all(conn: &Connection) -> Result<Vec<Group>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, meeting_day, meeting_time, created_at, updated_at FROM groups ORDER BY name"
        )?;

        let group_iter = stmt.query_map([], |row| {
            Ok(Group {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                meeting_day: row.get(3)?,
                meeting_time: row.get(4)?,
                created_at: row.get::<_, String>(5)?.parse().unwrap_or(Utc::now()),
                updated_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
            })
        })?;

        let mut groups = Vec::new();
        for group in group_iter {
            groups.push(group?);
        }
        Ok(groups)
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Group> {
        conn.query_row(
            "SELECT id, name, description, meeting_day, meeting_time, created_at, updated_at FROM groups WHERE id = ?1",
            params![id],
            |row| {
                Ok(Group {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    meeting_day: row.get(3)?,
                    meeting_time: row.get(4)?,
                    created_at: row.get::<_, String>(5)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(6)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn create(conn: &Connection, req: CreateGroupRequest) -> Result<Group> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO groups (id, name, description, meeting_day, meeting_time, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, req.name, req.description, req.meeting_day, req.meeting_time, now, now],
        )?;

        Self::get_by_id(conn, &id)
    }

    pub fn update(conn: &Connection, id: &str, req: UpdateGroupRequest) -> Result<Group> {
        let now = Utc::now().to_rfc3339();
        let mut query = String::from("UPDATE groups SET updated_at = ?1");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
        let mut param_idx = 2;

        if let Some(name) = req.name {
            query.push_str(&format!(", name = ?{}", param_idx));
            params_vec.push(Box::new(name));
            param_idx += 1;
        }
        if let Some(description) = req.description {
            query.push_str(&format!(", description = ?{}", param_idx));
            params_vec.push(Box::new(description));
            param_idx += 1;
        }
        if let Some(meeting_day) = req.meeting_day {
            query.push_str(&format!(", meeting_day = ?{}", param_idx));
            params_vec.push(Box::new(meeting_day));
            param_idx += 1;
        }
        if let Some(meeting_time) = req.meeting_time {
            query.push_str(&format!(", meeting_time = ?{}", param_idx));
            params_vec.push(Box::new(meeting_time));
            param_idx += 1;
        }

        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        Self::get_by_id(conn, id)
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM groups WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Member Assignments ---

    pub fn add_member(conn: &Connection, req: AddMemberToGroupRequest) -> Result<GroupMember> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO group_members (id, group_id, member_id, role, joined_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, req.group_id, req.member_id, req.role, now],
        )?;

        Self::get_group_member(conn, &id)
    }

    pub fn remove_member(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM group_members WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_group_member(conn: &Connection, id: &str) -> Result<GroupMember> {
        conn.query_row(
            "SELECT gm.id, gm.group_id, gm.member_id, gm.role, gm.joined_at,
                    m.first_name || ' ' || m.last_name as member_name,
                    g.name as group_name
             FROM group_members gm
             JOIN members m ON gm.member_id = m.id
             JOIN groups g ON gm.group_id = g.id
             WHERE gm.id = ?1",
            params![id],
            |row| {
                Ok(GroupMember {
                    id: row.get(0)?,
                    group_id: row.get(1)?,
                    member_id: row.get(2)?,
                    role: row.get(3)?,
                    joined_at: row.get::<_, String>(4)?.parse().unwrap_or(Utc::now()),
                    member_name: Some(row.get(5)?),
                    group_name: Some(row.get(6)?),
                })
            }
        )
    }

    pub fn get_group_members(conn: &Connection, group_id: &str) -> Result<Vec<GroupMember>> {
        let mut stmt = conn.prepare(
            "SELECT gm.id, gm.group_id, gm.member_id, gm.role, gm.joined_at,
                    m.first_name || ' ' || m.last_name as member_name,
                    g.name as group_name
             FROM group_members gm
             JOIN members m ON gm.member_id = m.id
             JOIN groups g ON gm.group_id = g.id
             WHERE gm.group_id = ?1
             ORDER BY gm.role DESC, m.last_name, m.first_name"
        )?;

        let iter = stmt.query_map(params![group_id], |row| {
            Ok(GroupMember {
                id: row.get(0)?,
                group_id: row.get(1)?,
                member_id: row.get(2)?,
                role: row.get(3)?,
                joined_at: row.get::<_, String>(4)?.parse().unwrap_or(Utc::now()),
                member_name: Some(row.get(5)?),
                group_name: Some(row.get(6)?),
            })
        })?;

        let mut members = Vec::new();
        for m in iter {
            members.push(m?);
        }
        Ok(members)
    }
}
