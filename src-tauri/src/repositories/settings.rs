use crate::error::AppResult;
use crate::models::{SettingItem, AppConfig};
use rusqlite::{params, Connection};
use chrono::Utc;

pub struct SettingsRepository;

impl SettingsRepository {
    pub fn get_all(conn: &Connection) -> AppResult<Vec<SettingItem>> {
        let mut stmt = conn.prepare("SELECT key, value, updated_at FROM settings")?;
        let items = stmt.query_map([], |row| {
            Ok(SettingItem {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<usize, String>(2)?).unwrap().with_timezone(&Utc),
            })
        })?.collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_key(conn: &Connection, key: &str) -> AppResult<Option<String>> {
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let value = stmt.query_row(params![key], |row| row.get(0)).ok();
        Ok(value)
    }

    pub fn set_key(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, value, now],
        )?;
        Ok(())
    }

    pub fn get_app_config(conn: &Connection) -> AppResult<AppConfig> {
        let settings = Self::get_all(conn)?;
        let mut config = AppConfig::default();
        
        // Provide some defaults if settings don't exist
        config.currency = "Ghc".to_string();
        config.language = "English".to_string();
        config.theme = "dark".to_string();

        for item in settings {
            match item.key.as_str() {
                "church_name" => config.church_name = item.value,
                "church_address" => config.church_address = Some(item.value),
                "church_phone" => config.church_phone = Some(item.value),
                "church_email" => config.church_email = Some(item.value),
                "church_logo" => config.church_logo = Some(item.value),
                "currency" => config.currency = item.value,
                "language" => config.language = item.value,
                "theme" => config.theme = item.value,
                "checkin_proximity_enabled" => config.checkin_proximity_enabled = item.value == "true",
                _ => {}
            }
        }
        Ok(config)
    }
}
