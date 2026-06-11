
use crate::models::{AdminLoginRequest, AdminUser, ChangePasswordRequest, ChangeEmailRequest};
use crate::AppState;
use rusqlite::OptionalExtension;

fn verify_admin(conn: &rusqlite::Connection, email: &str, password: &str) -> Result<AdminUser, String> {
    let mut stmt = conn
        .prepare("SELECT id, email, password_hash, created_at FROM admins WHERE email = ?1")
        .map_err(|e| format!("Database error: {}", e))?;

    let user_result: Option<AdminUser> = stmt
        .query_row([email], |row| {
            let id: String = row.get(0)?;
            let email: String = row.get(1)?;
            let password_hash: String = row.get(2)?;
            let created_at: String = row.get(3)?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at)
                .unwrap_or_else(|_| chrono::Utc::now().into())
                .with_timezone(&chrono::Utc);
            Ok(AdminUser { id, email, password_hash, created_at })
        })
        .optional()
        .map_err(|e| format!("Database error: {}", e))?;

    match user_result {
        Some(user) if user.password_hash == password => Ok(user),
        _ => Err("Invalid email or password".to_string()),
    }
}

#[tauri::command]
pub async fn login_admin(
    state: tauri::State<'_, AppState>,
    request: AdminLoginRequest,
) -> Result<AdminUser, String> {
    let conn = state.db.lock().unwrap();
    match verify_admin(&conn, &request.email, &request.password) {
        Ok(user) => {
            log::info!("Admin login successful for {}", request.email);
            Ok(user)
        }
        Err(e) => {
            log::warn!("Failed login attempt for {}", request.email);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn change_admin_password(
    state: tauri::State<'_, AppState>,
    request: ChangePasswordRequest,
) -> Result<String, String> {
    let conn = state.db.lock().unwrap();

    // Find the admin (use first admin since we only support single admin currently)
    let admin: AdminUser = {
        let mut stmt = conn
            .prepare("SELECT id, email, password_hash, created_at FROM admins LIMIT 1")
            .map_err(|e| format!("Database error: {}", e))?;
        stmt.query_row([], |row| {
            let id: String = row.get(0)?;
            let email: String = row.get(1)?;
            let password_hash: String = row.get(2)?;
            let created_at: String = row.get(3)?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at)
                .unwrap_or_else(|_| chrono::Utc::now().into())
                .with_timezone(&chrono::Utc);
            Ok(AdminUser { id, email, password_hash, created_at })
        })
        .map_err(|_| "No admin user found".to_string())?
    };

    // Verify current password
    if admin.password_hash != request.current_password {
        return Err("Current password is incorrect".to_string());
    }

    if request.new_password.trim().is_empty() {
        return Err("New password cannot be empty".to_string());
    }

    if request.new_password.len() < 6 {
        return Err("New password must be at least 6 characters".to_string());
    }

    conn.execute(
        "UPDATE admins SET password_hash = ?1 WHERE id = ?2",
        rusqlite::params![request.new_password, admin.id],
    )
    .map_err(|e| format!("Failed to update password: {}", e))?;

    log::info!("Admin password changed successfully for {}", admin.email);
    Ok("Password updated successfully".to_string())
}

#[tauri::command]
pub async fn change_admin_email(
    state: tauri::State<'_, AppState>,
    request: ChangeEmailRequest,
) -> Result<String, String> {
    let conn = state.db.lock().unwrap();

    // Find the admin
    let admin: AdminUser = {
        let mut stmt = conn
            .prepare("SELECT id, email, password_hash, created_at FROM admins LIMIT 1")
            .map_err(|e| format!("Database error: {}", e))?;
        stmt.query_row([], |row| {
            let id: String = row.get(0)?;
            let email: String = row.get(1)?;
            let password_hash: String = row.get(2)?;
            let created_at: String = row.get(3)?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at)
                .unwrap_or_else(|_| chrono::Utc::now().into())
                .with_timezone(&chrono::Utc);
            Ok(AdminUser { id, email, password_hash, created_at })
        })
        .map_err(|_| "No admin user found".to_string())?
    };

    // Verify password
    if admin.password_hash != request.password {
        return Err("Password is incorrect".to_string());
    }

    if request.new_email.trim().is_empty() || !request.new_email.contains('@') {
        return Err("Invalid email address".to_string());
    }

    // Check if email already taken
    let existing: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM admins WHERE email = ?1 AND id != ?2",
            rusqlite::params![request.new_email, admin.id],
            |row| row.get::<_, i64>(0),
        )
        .map(|count| count > 0)
        .unwrap_or(false);

    if existing {
        return Err("Email is already in use".to_string());
    }

    conn.execute(
        "UPDATE admins SET email = ?1 WHERE id = ?2",
        rusqlite::params![request.new_email, admin.id],
    )
    .map_err(|e| format!("Failed to update email: {}", e))?;

    log::info!("Admin email changed from {} to {}", admin.email, request.new_email);
    Ok("Email updated successfully".to_string())
}
