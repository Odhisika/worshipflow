use tauri::State;
use crate::AppState;
use crate::models::{Reminder, UpcomingBirthday, UpcomingAnniversary};
use crate::repositories::ReminderRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_reminders(
    state: State<'_, AppState>,
    reminder_type: Option<String>,
) -> AppResult<Vec<Reminder>> {
    let conn = state.db.lock().unwrap();
    ReminderRepository::get_reminders(&conn, reminder_type.as_deref()).map_err(Into::into)
}

#[tauri::command]
pub async fn create_reminder(
    state: State<'_, AppState>,
    reminder_type: String,
    title: String,
    description: Option<String>,
    reference_type: Option<String>,
    reference_id: Option<String>,
    scheduled_date: String,
) -> AppResult<Reminder> {
    let conn = state.db.lock().unwrap();
    ReminderRepository::create_reminder(&conn, &reminder_type, &title, description.as_deref(),
        reference_type.as_deref(), reference_id.as_deref(), &scheduled_date).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_reminder(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    ReminderRepository::delete_reminder(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn get_upcoming_birthdays(
    state: State<'_, AppState>,
    days_ahead: i32,
) -> AppResult<Vec<UpcomingBirthday>> {
    let conn = state.db.lock().unwrap();
    ReminderRepository::get_upcoming_birthdays(&conn, days_ahead).map_err(Into::into)
}

#[tauri::command]
pub async fn get_upcoming_anniversaries(
    state: State<'_, AppState>,
    days_ahead: i32,
) -> AppResult<Vec<UpcomingAnniversary>> {
    let conn = state.db.lock().unwrap();
    ReminderRepository::get_upcoming_anniversaries(&conn, days_ahead).map_err(Into::into)
}
