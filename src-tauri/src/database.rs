use rusqlite::{Connection, Result};
use std::path::Path;

pub fn initialize_database(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    
    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    
    create_tables(&conn)?;
    seed_default_admin(&conn)?;
    seed_default_giving_types(&conn)?;
    seed_default_groups(&conn)?;
    
    Ok(conn)
}

fn seed_default_admin(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM admins", [], |row| row.get(0))?;
    if count == 0 {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // MVP: Storing plain text password for the default admin as requested for rapid prototyping
        conn.execute(
            "INSERT INTO admins (id, email, password_hash, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![id, "admin@church.com", "admin123", now],
        )?;
        log::info!("Seeded default admin user: admin@church.com");
    }
    Ok(())
}

fn seed_default_giving_types(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM giving_types", [], |row| row.get(0))?;
    if count == 0 {
        let now = chrono::Utc::now().to_rfc3339();
        let default_types = vec![
            ("tithe", "Tithe", "10% of income dedicated to the church", true),
            ("pledge", "Pledge", "Committed giving towards specific causes", true),
            ("first_offering", "First Offering", "General church offering", false),
            ("second_offering", "Second Offering", "Secondary general offering", false),
            ("building_fund", "Building Fund", "Contributions for church building initiatives", false),
        ];

        for (id, name, desc, is_system) in default_types {
            conn.execute(
                "INSERT INTO giving_types (id, name, description, is_system, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![id, name, desc, is_system, now],
            )?;
        }
        log::info!("Seeded default giving types");
    }
    Ok(())
}

fn seed_default_groups(conn: &Connection) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    let default_groups = vec![
        ("Women Ministry", "Women's fellowship and ministry activities"),
        ("Men Ministry", "Men's fellowship and ministry activities"),
        ("Youth Ministry", "Youth programs and activities for ages 13-30"),
        ("Children Service", "Children's church and Sunday school"),
    ];

    for (name, description) in &default_groups {
        let exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM groups WHERE name = ?1",
            rusqlite::params![name],
            |row| row.get(0),
        ).unwrap_or(0);
        if exists == 0 {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO groups (id, name, description, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![id, name, description, now, now],
            )?;
            log::info!("Seeded default group: {}", name);
        }
    }
    Ok(())
}

fn create_tables(conn: &Connection) -> Result<()> {
    // Songs table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS songs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            lyrics TEXT NOT NULL,
            key TEXT,
            tempo INTEGER,
            tags TEXT,
            chords TEXT,
            show_chords INTEGER DEFAULT 0,
            arrangement TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Services table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            theme TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Activities table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY,
            service_id TEXT NOT NULL,
            name TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            leader TEXT,
            notes TEXT,
            order_index INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Slides table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS slides (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            media_path TEXT,
            background_path TEXT,
            order_index INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Service items table (links activities to content)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS service_items (
            id TEXT PRIMARY KEY,
            service_id TEXT NOT NULL,
            activity_id TEXT,
            item_type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL
        )",
        [],
    )?;

    // Bible verses table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS bible_verses (
            id INTEGER PRIMARY KEY,
            book TEXT NOT NULL,
            chapter INTEGER NOT NULL,
            verse INTEGER NOT NULL,
            text TEXT NOT NULL,
            version TEXT NOT NULL DEFAULT 'KJV',
            UNIQUE(book, chapter, verse, version)
        )",
        [],
    )?;

    // Bible books table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS bible_books (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            testament TEXT NOT NULL,
            chapters INTEGER NOT NULL
        )",
        [],
    )?;

    // Bookmarks table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            book TEXT NOT NULL,
            chapter INTEGER NOT NULL,
            verse INTEGER NOT NULL,
            label TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Media library table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS media (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            file_path TEXT NOT NULL,
            thumbnail_path TEXT,
            tags TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Create indexes for better performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_activities_service 
         ON activities(service_id, order_index)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_bible_lookup 
         ON bible_verses(book, chapter, verse)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_bible_chapter 
         ON bible_verses(book, chapter)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_service_items 
         ON service_items(service_id, order_index)",
        [],
    )?;

    // Admins table for Church Management
    conn.execute(
        "CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Members table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS members (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            dob TEXT,
            gender TEXT,
            hometown TEXT,
            occupation TEXT,
            is_baptized BOOLEAN NOT NULL DEFAULT 0,
            marital_status TEXT,
            emergency_contact TEXT,
            role TEXT NOT NULL DEFAULT 'member',
            status TEXT NOT NULL DEFAULT 'active',
            joined_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Migrations for members table
    let columns = vec![
        ("dob", "TEXT"),
        ("gender", "TEXT"),
        ("hometown", "TEXT"),
        ("occupation", "TEXT"),
        ("is_baptized", "BOOLEAN NOT NULL DEFAULT 0"),
        ("marital_status", "TEXT"),
        ("emergency_contact", "TEXT"),
        ("ministry", "TEXT"),
    ];

    for (name, col_type) in columns {
        let check_col = format!("SELECT COUNT(*) FROM pragma_table_info('members') WHERE name='{}'", name);
        let count: i32 = conn.query_row(&check_col, [], |row| row.get(0)).unwrap_or(0);
        if count == 0 {
            let alter_query = format!("ALTER TABLE members ADD COLUMN {} {}", name, col_type);
            conn.execute(&alter_query, [])?;
            log::info!("Added column {} to members table", name);
        }
    }

    // Finance - Giving Types
    conn.execute(
        "CREATE TABLE IF NOT EXISTS giving_types (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_system BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Finance - Contributions
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contributions (
            id TEXT PRIMARY KEY,
            type_id TEXT NOT NULL,
            member_id TEXT,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            payment_method TEXT DEFAULT 'Cash',
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (type_id) REFERENCES giving_types(id),
            FOREIGN KEY (member_id) REFERENCES members(id)
        )",
        [],
    )?;

    // Migration: add payment_method column if missing
    let check_pm = "SELECT COUNT(*) FROM pragma_table_info('contributions') WHERE name='payment_method'";
    let pm_count: i32 = conn.query_row(check_pm, [], |row| row.get(0)).unwrap_or(0);
    if pm_count == 0 {
        conn.execute("ALTER TABLE contributions ADD COLUMN payment_method TEXT DEFAULT 'Cash'", [])?;
        log::info!("Added payment_method column to contributions table");
    }

    // Finance - Pledges
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pledges (
            id TEXT PRIMARY KEY,
            member_id TEXT NOT NULL,
            category TEXT NOT NULL,
            amount_promised REAL NOT NULL,
            amount_paid REAL NOT NULL DEFAULT 0,
            due_date TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (member_id) REFERENCES members(id)
        )",
        [],
    )?;

    // Small Groups / Ministries
    conn.execute(
        "CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            meeting_day TEXT,
            meeting_time TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS group_members (
            id TEXT PRIMARY KEY,
            group_id TEXT NOT NULL,
            member_id TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Member',
            joined_at TEXT NOT NULL,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Attendance table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            service_id TEXT NOT NULL,
            member_id TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
            UNIQUE(service_id, member_id)
        )",
        [],
    )?;

    // Events table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            time TEXT,
            location TEXT,
            category TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Subscribers table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS subscribers (
            id TEXT PRIMARY KEY,
            member_id TEXT UNIQUE,
            email_enabled BOOLEAN NOT NULL DEFAULT 1,
            sms_enabled BOOLEAN NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Campaigns table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            recipient_count INTEGER DEFAULT 0,
            open_rate REAL DEFAULT 0,
            click_rate REAL DEFAULT 0,
            status TEXT NOT NULL,
            scheduled_at TEXT,
            sent_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Volunteer Roles
    conn.execute(
        "CREATE TABLE IF NOT EXISTS volunteer_roles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            required_count INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Volunteer Schedules
    conn.execute(
        "CREATE TABLE IF NOT EXISTS volunteer_schedules (
            id TEXT PRIMARY KEY,
            role_id TEXT NOT NULL,
            member_id TEXT NOT NULL,
            service_id TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (role_id) REFERENCES volunteer_roles(id),
            FOREIGN KEY (member_id) REFERENCES members(id),
            FOREIGN KEY (service_id) REFERENCES services(id)
        )",
        [],
    )?;

    // Member Relationships (for Child Check-In)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS member_relationships (
            id TEXT PRIMARY KEY,
            child_id TEXT NOT NULL,
            guardian_id TEXT NOT NULL,
            relationship_type TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (child_id) REFERENCES members(id) ON DELETE CASCADE,
            FOREIGN KEY (guardian_id) REFERENCES members(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Check-In Sessions
    conn.execute(
        "CREATE TABLE IF NOT EXISTS check_ins (
            id TEXT PRIMARY KEY,
            member_id TEXT NOT NULL,
            service_id TEXT,
            event_id TEXT,
            location TEXT,
            check_in_time TEXT NOT NULL,
            check_out_time TEXT,
            security_code TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
        )",
        [],
    )?;

    // --- NEW FEATURE TABLES ---

    // Migration: Add new columns to members table
    let new_member_columns = vec![
        ("baptism_date", "TEXT"),
        ("confirmation_date", "TEXT"),
        ("wedding_date", "TEXT"),
        ("membership_status", "TEXT DEFAULT 'active'"),
    ];

    for (name, col_type) in new_member_columns {
        let check_col = format!("SELECT COUNT(*) FROM pragma_table_info('members') WHERE name='{}'", name);
        let count: i32 = conn.query_row(&check_col, [], |row| row.get(0)).unwrap_or(0);
        if count == 0 {
            let alter_query = format!("ALTER TABLE members ADD COLUMN {} {}", name, col_type);
            conn.execute(&alter_query, [])?;
            log::info!("Added column {} to members table", name);
        }
    }

    // Migration: Add recurring columns to events table
    let new_event_columns = vec![
        ("is_recurring", "BOOLEAN NOT NULL DEFAULT 0"),
        ("recurrence_rule", "TEXT"),
        ("recurrence_end", "TEXT"),
    ];

    for (name, col_type) in new_event_columns {
        let check_col = format!("SELECT COUNT(*) FROM pragma_table_info('events') WHERE name='{}'", name);
        let count: i32 = conn.query_row(&check_col, [], |row| row.get(0)).unwrap_or(0);
        if count == 0 {
            let alter_query = format!("ALTER TABLE events ADD COLUMN {} {}", name, col_type);
            conn.execute(&alter_query, [])?;
            log::info!("Added column {} to events table", name);
        }
    }

    // Budget Categories
    conn.execute(
        "CREATE TABLE IF NOT EXISTS budget_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Budgets
    conn.execute(
        "CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL,
            fiscal_year TEXT NOT NULL,
            allocated_amount REAL NOT NULL,
            spent_amount REAL NOT NULL DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES budget_categories(id)
        )",
        [],
    )?;

    // Expense Categories
    conn.execute(
        "CREATE TABLE IF NOT EXISTS expense_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Expenses
    conn.execute(
        "CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            payee TEXT,
            payment_method TEXT DEFAULT 'Cash',
            notes TEXT,
            receipt_path TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES expense_categories(id)
        )",
        [],
    )?;

    // Visitors
    conn.execute(
        "CREATE TABLE IF NOT EXISTS visitors (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            gender TEXT,
            age_group TEXT,
            visited_date TEXT NOT NULL,
            service_id TEXT,
            heard_from TEXT,
            prayer_need TEXT,
            interest TEXT,
            status TEXT NOT NULL DEFAULT 'new',
            converted_member_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(id),
            FOREIGN KEY (converted_member_id) REFERENCES members(id)
        )",
        [],
    )?;

    // Visitor Follow-ups
    conn.execute(
        "CREATE TABLE IF NOT EXISTS visitor_followups (
            id TEXT PRIMARY KEY,
            visitor_id TEXT NOT NULL,
            followup_date TEXT NOT NULL,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            assigned_to TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Event Attendance
    conn.execute(
        "CREATE TABLE IF NOT EXISTS event_attendance (
            id TEXT PRIMARY KEY,
            event_id TEXT NOT NULL,
            member_id TEXT,
            visitor_id TEXT,
            status TEXT NOT NULL DEFAULT 'present',
            check_in_time TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (member_id) REFERENCES members(id),
            FOREIGN KEY (visitor_id) REFERENCES visitors(id)
        )",
        [],
    )?;

    // Pastoral Care - Visitations
    conn.execute(
        "CREATE TABLE IF NOT EXISTS visitations (
            id TEXT PRIMARY KEY,
            member_id TEXT,
            visitor_id TEXT,
            visitation_date TEXT NOT NULL,
            visitation_type TEXT NOT NULL DEFAULT 'home',
            notes TEXT,
            conducted_by TEXT,
            follow_up_needed BOOLEAN NOT NULL DEFAULT 0,
            follow_up_date TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (member_id) REFERENCES members(id),
            FOREIGN KEY (visitor_id) REFERENCES visitors(id)
        )",
        [],
    )?;

    // Pastoral Care - Prayer Requests
    conn.execute(
        "CREATE TABLE IF NOT EXISTS prayer_requests (
            id TEXT PRIMARY KEY,
            member_id TEXT,
            visitor_id TEXT,
            request TEXT NOT NULL,
            is_anonymous BOOLEAN NOT NULL DEFAULT 0,
            category TEXT DEFAULT 'general',
            status TEXT NOT NULL DEFAULT 'active',
            prayed_for_date TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (member_id) REFERENCES members(id),
            FOREIGN KEY (visitor_id) REFERENCES visitors(id)
        )",
        [],
    )?;

    // Pastoral Care - Counselling Sessions
    conn.execute(
        "CREATE TABLE IF NOT EXISTS counselling_sessions (
            id TEXT PRIMARY KEY,
            member_id TEXT NOT NULL,
            session_date TEXT NOT NULL,
            session_type TEXT NOT NULL,
            notes TEXT,
            is_confidential BOOLEAN NOT NULL DEFAULT 0,
            conducted_by TEXT,
            follow_up_date TEXT,
            status TEXT NOT NULL DEFAULT 'completed',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (member_id) REFERENCES members(id)
        )",
        [],
    )?;

    // Announcements
    conn.execute(
        "CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            priority TEXT DEFAULT 'normal',
            start_date TEXT NOT NULL,
            end_date TEXT,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Reminders / Notifications
    conn.execute(
        "CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            reminder_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            reference_type TEXT,
            reference_id TEXT,
            scheduled_date TEXT NOT NULL,
            is_sent BOOLEAN NOT NULL DEFAULT 0,
            sent_at TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Receipts
    conn.execute(
        "CREATE TABLE IF NOT EXISTS receipts (
            id TEXT PRIMARY KEY,
            receipt_number TEXT NOT NULL,
            contribution_id TEXT,
            member_id TEXT,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            notes TEXT,
            generated_at TEXT NOT NULL,
            FOREIGN KEY (contribution_id) REFERENCES contributions(id),
            FOREIGN KEY (member_id) REFERENCES members(id)
        )",
        [],
    )?;

    // Venues / Rooms
    conn.execute(
        "CREATE TABLE IF NOT EXISTS venues (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            capacity INTEGER,
            location TEXT,
            description TEXT,
            facilities TEXT,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Venue Bookings
    conn.execute(
        "CREATE TABLE IF NOT EXISTS venue_bookings (
            id TEXT PRIMARY KEY,
            venue_id TEXT NOT NULL,
            event_id TEXT,
            booking_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            booked_by TEXT,
            purpose TEXT,
            status TEXT NOT NULL DEFAULT 'confirmed',
            created_at TEXT NOT NULL,
            FOREIGN KEY (venue_id) REFERENCES venues(id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        )",
        [],
    )?;

    // Audit Logs
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            old_values TEXT,
            new_values TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Admin Roles (RBAC)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS admin_roles (
            id TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            permissions TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Seed default budget categories
    {
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM budget_categories", [], |row| row.get(0))?;
        if count == 0 {
            let now = chrono::Utc::now().to_rfc3339();
            let cats = vec![
                ("Worship & Music", "Music instruments, worship resources"),
                ("Outreach & Missions", "Evangelism and mission trips"),
                ("Building & Facilities", "Building maintenance and utilities"),
                ("Administration", "Office supplies and admin costs"),
                ("Youth & Children", "Youth and children ministry programs"),
                ("Pastoral Care", "Pastoral ministry resources"),
                ("Benevolence", "Helping those in need"),
            ];
            for (name, desc) in cats {
                let id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO budget_categories (id, name, description, created_at) VALUES (?1, ?2, ?3, ?4)",
                    rusqlite::params![id, name, desc, now],
                )?;
            }
            log::info!("Seeded default budget categories");
        }
    }

    // Seed default expense categories
    {
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM expense_categories", [], |row| row.get(0))?;
        if count == 0 {
            let now = chrono::Utc::now().to_rfc3339();
            let cats = vec![
                ("Utilities", "Electricity, water, internet"),
                ("Salaries & Wages", "Staff salaries and wages"),
                ("Maintenance", "Building and equipment maintenance"),
                ("Transport", "Fuel and transport costs"),
                ("Food & Catering", "Food and refreshments"),
                ("Office Supplies", "Stationery and office materials"),
                ("Equipment", "Purchase of equipment and tools"),
                ("Missions & Outreach", "Mission and outreach expenses"),
            ];
            for (name, desc) in cats {
                let id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO expense_categories (id, name, description, created_at) VALUES (?1, ?2, ?3, ?4)",
                    rusqlite::params![id, name, desc, now],
                )?;
            }
            log::info!("Seeded default expense categories");
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_database_creation() {
        let test_db = "test_worship.db";
        let result = initialize_database(Path::new(test_db));
        assert!(result.is_ok());
        fs::remove_file(test_db).ok();
    }
}
