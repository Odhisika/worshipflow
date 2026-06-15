use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{
    Venue, CreateVenueRequest, UpdateVenueRequest,
    VenueBooking, CreateVenueBookingRequest,
};

pub struct VenueRepository;

impl VenueRepository {
    // --- Venues ---
    pub fn get_venues(conn: &Connection, active_only: bool) -> Result<Vec<Venue>> {
        let mut query = String::from(
            "SELECT id, name, capacity, location, description, facilities, is_active, created_at, updated_at FROM venues"
        );
        if active_only {
            query.push_str(" WHERE is_active = 1");
        }
        query.push_str(" ORDER BY name");
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map([], |row| {
            Ok(Venue {
                id: row.get(0)?,
                name: row.get(1)?,
                capacity: row.get(2)?,
                location: row.get(3)?,
                description: row.get(4)?,
                facilities: row.get(5)?,
                is_active: row.get(6)?,
                created_at: row.get::<_, String>(7)?.parse().unwrap_or(Utc::now()),
                updated_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_venue(conn: &Connection, req: CreateVenueRequest) -> Result<Venue> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO venues (id, name, capacity, location, description, facilities, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7)",
            params![id, req.name, req.capacity, req.location, req.description, req.facilities, now],
        )?;
        conn.query_row(
            "SELECT id, name, capacity, location, description, facilities, is_active, created_at, updated_at FROM venues WHERE id = ?1",
            params![id],
            |row| {
                Ok(Venue {
                    id: row.get(0)?, name: row.get(1)?, capacity: row.get(2)?, location: row.get(3)?,
                    description: row.get(4)?, facilities: row.get(5)?, is_active: row.get(6)?,
                    created_at: row.get::<_, String>(7)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn update_venue(conn: &Connection, id: &str, req: UpdateVenueRequest) -> Result<Venue> {
        let now = Utc::now().to_rfc3339();
        let mut query = String::from("UPDATE venues SET ");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut param_idx = 1;
        let mut updates = Vec::new();

        if let Some(ref name) = req.name { updates.push(format!("name = ?{}", param_idx)); params_vec.push(Box::new(name.clone())); param_idx += 1; }
        if let Some(cap) = req.capacity { updates.push(format!("capacity = ?{}", param_idx)); params_vec.push(Box::new(cap)); param_idx += 1; }
        if let Some(ref loc) = req.location { updates.push(format!("location = ?{}", param_idx)); params_vec.push(Box::new(loc.clone())); param_idx += 1; }
        if let Some(ref desc) = req.description { updates.push(format!("description = ?{}", param_idx)); params_vec.push(Box::new(desc.clone())); param_idx += 1; }
        if let Some(ref fac) = req.facilities { updates.push(format!("facilities = ?{}", param_idx)); params_vec.push(Box::new(fac.clone())); param_idx += 1; }
        if let Some(active) = req.is_active { updates.push(format!("is_active = ?{}", param_idx)); params_vec.push(Box::new(active as i32)); param_idx += 1; }

        updates.push(format!("updated_at = ?{}", param_idx));
        params_vec.push(Box::new(now));
        param_idx += 1;
        query.push_str(&updates.join(", "));
        query.push_str(&format!(" WHERE id = ?{}", param_idx));
        params_vec.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        conn.query_row(
            "SELECT id, name, capacity, location, description, facilities, is_active, created_at, updated_at FROM venues WHERE id = ?1",
            params![id],
            |row| {
                Ok(Venue {
                    id: row.get(0)?, name: row.get(1)?, capacity: row.get(2)?, location: row.get(3)?,
                    description: row.get(4)?, facilities: row.get(5)?, is_active: row.get(6)?,
                    created_at: row.get::<_, String>(7)?.parse().unwrap_or(Utc::now()),
                    updated_at: row.get::<_, String>(8)?.parse().unwrap_or(Utc::now()),
                })
            }
        )
    }

    pub fn delete_venue(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM venues WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Venue Bookings ---
    pub fn get_bookings(conn: &Connection, venue_id: Option<&str>, booking_date: Option<&str>) -> Result<Vec<VenueBooking>> {
        let mut query = String::from(
            "SELECT vb.id, vb.venue_id, vb.event_id, vb.booking_date, vb.start_time, vb.end_time,
                    vb.booked_by, vb.purpose, vb.status, vb.created_at, v.name as venue_name, e.title as event_title
             FROM venue_bookings vb
             JOIN venues v ON vb.venue_id = v.id
             LEFT JOIN events e ON vb.event_id = e.id"
        );
        let mut conditions = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(vid) = venue_id {
            conditions.push(format!("vb.venue_id = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(vid.to_string()));
        }
        if let Some(bd) = booking_date {
            conditions.push(format!("vb.booking_date = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(bd.to_string()));
        }
        if !conditions.is_empty() {
            query.push_str(&format!(" WHERE {}", conditions.join(" AND ")));
        }
        query.push_str(" ORDER BY vb.booking_date, vb.start_time");

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&query)?;
        let iter = stmt.query_map(&params_refs[..], |row| {
            Ok(VenueBooking {
                id: row.get(0)?,
                venue_id: row.get(1)?,
                event_id: row.get(2)?,
                booking_date: row.get(3)?,
                start_time: row.get(4)?,
                end_time: row.get(5)?,
                booked_by: row.get(6)?,
                purpose: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                venue_name: row.get(10)?,
                event_title: row.get(11)?,
            })
        })?;
        let mut items = Vec::new();
        for i in iter { items.push(i?); }
        Ok(items)
    }

    pub fn create_booking(conn: &Connection, req: CreateVenueBookingRequest) -> Result<VenueBooking> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO venue_bookings (id, venue_id, event_id, booking_date, start_time, end_time, booked_by, purpose, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'confirmed', ?9)",
            params![id, req.venue_id, req.event_id, req.booking_date, req.start_time, req.end_time, req.booked_by, req.purpose, now],
        )?;
        conn.query_row(
            "SELECT vb.id, vb.venue_id, vb.event_id, vb.booking_date, vb.start_time, vb.end_time,
                    vb.booked_by, vb.purpose, vb.status, vb.created_at, v.name, e.title
             FROM venue_bookings vb
             JOIN venues v ON vb.venue_id = v.id
             LEFT JOIN events e ON vb.event_id = e.id
             WHERE vb.id = ?1",
            params![id],
            |row| {
                Ok(VenueBooking {
                    id: row.get(0)?, venue_id: row.get(1)?, event_id: row.get(2)?,
                    booking_date: row.get(3)?, start_time: row.get(4)?, end_time: row.get(5)?,
                    booked_by: row.get(6)?, purpose: row.get(7)?, status: row.get(8)?,
                    created_at: row.get::<_, String>(9)?.parse().unwrap_or(Utc::now()),
                    venue_name: row.get(10)?, event_title: row.get(11)?,
                })
            }
        )
    }

    pub fn update_booking_status(conn: &Connection, id: &str, status: &str) -> Result<()> {
        conn.execute("UPDATE venue_bookings SET status = ?1 WHERE id = ?2", params![status, id])?;
        Ok(())
    }

    pub fn delete_booking(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM venue_bookings WHERE id = ?1", params![id])?;
        Ok(())
    }
}
