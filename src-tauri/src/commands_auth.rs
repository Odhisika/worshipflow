
use crate::models::{AdminLoginRequest, AdminUser};
use crate::AppState;
use rusqlite::OptionalExtension;

#[tauri::command]
pub async fn login_admin(
    state: tauri::State<'_, AppState>,
    request: AdminLoginRequest,
) -> Result<AdminUser, String> {
    let conn = state.db.lock().unwrap();

    // Query the database for the admin user
    let mut stmt = conn
        .prepare("SELECT id, email, password_hash, created_at FROM admins WHERE email = ?1")
        .map_err(|e| format!("Database error: {}", e))?;

    let user_result: Option<AdminUser> = stmt
        .query_row([&request.email], |row| {
            let id: String = row.get(0)?;
            let email: String = row.get(1)?;
            let password_hash: String = row.get(2)?;
            let created_at: String = row.get(3)?;
            
            // Parse datetime
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at)
                .unwrap_or_else(|_| chrono::Utc::now().into())
                .with_timezone(&chrono::Utc);

            Ok(AdminUser {
                id,
                email,
                password_hash,
                created_at,
            })
        })
        .optional()
        .map_err(|e| format!("Database error: {}", e))?;

    if let Some(user) = user_result {
        // MVP: Simple text comparison since we requested "default admin for me for now"
        // In a real production app, this should use argon2 or bcrypt to verify a hash.
        if user.password_hash == request.password {
            log::info!("Admin login successful for {}", request.email);
            Ok(user)
        } else {
            log::warn!("Invalid password attempt for {}", request.email);
            Err("Invalid email or password".to_string())
        }
    } else {
        log::warn!("Login attempt for non-existent admin: {}", request.email);
        Err("Invalid email or password".to_string())
    }
}
