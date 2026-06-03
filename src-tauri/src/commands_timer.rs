use crate::error::AppResult;
use crate::models::TimerState;
use crate::repositories::ActivityRepository;
use crate::timer::TIMER;
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerInfo {
    pub current_timer: Option<TimerState>,
    pub upcoming_count: usize,
    pub completed_count: usize,
    pub total_elapsed: i64,
    pub total_remaining: i64,
}

#[tauri::command]
pub async fn load_service_to_timer(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    service_id: String,
) -> AppResult<TimerInfo> {
    let conn = state.db.lock().unwrap();
    let activities = ActivityRepository::get_by_service(&conn, &service_id)?;
    drop(conn);

    let mut timer = TIMER.lock().unwrap();
    timer.load_service(service_id, activities);
    
    let info = get_timer_info(&timer);
    drop(timer);
    
    app.emit("timer-loaded", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn start_next_activity(app: tauri::AppHandle) -> AppResult<TimerInfo> {
    let mut timer = TIMER.lock().unwrap();
    timer.start_next_activity()?;
    
    let info = get_timer_info(&timer);
    drop(timer);
    
    app.emit("timer-started", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn set_timer_activity(activity_id: String) -> AppResult<()> {
    let mut timer = TIMER.lock().unwrap();
    timer.set_activity(&activity_id)
}

#[tauri::command]
pub async fn start_current_timer_activity(app: tauri::AppHandle) -> AppResult<TimerInfo> {
    // This perfectly mirrors start_next_activity, because set_activity shifts the
    // selected activity to index 0. So we can just reuse start_next_activity internally
    // or call it out directly. For ease, we just duplicate the emit wrapper logic.
    let mut timer = TIMER.lock().unwrap();
    timer.start_next_activity()?;
    
    let info = get_timer_info(&timer);
    drop(timer);
    
    app.emit("timer-started", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn pause_timer(app: tauri::AppHandle) -> AppResult<TimerInfo> {
    let mut timer = TIMER.lock().unwrap();
    timer.pause_timer()?;
    
    let info = get_timer_info(&timer);
    drop(timer);
    
    app.emit("timer-paused", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn resume_timer(app: tauri::AppHandle) -> AppResult<TimerInfo> {
    let mut timer = TIMER.lock().unwrap();
    timer.resume_timer()?;
    
    let info = get_timer_info(&timer);
    drop(timer);
    
    app.emit("timer-resumed", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn add_timer_time(
    app: tauri::AppHandle,
    seconds: i64,
) -> AppResult<TimerInfo> {
    let mut timer = TIMER.lock().unwrap();
    timer.add_time(seconds)?;
    
    let info = get_timer_info(&timer);
    drop(timer);
    
    app.emit("timer-updated", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn stop_timer(app: tauri::AppHandle) -> AppResult<TimerInfo> {
    let mut timer = TIMER.lock().unwrap();
    timer.stop_timer();
    
    let info = get_timer_info(&timer);
    drop(timer);
    
    app.emit("timer-stopped", &info).ok();
    
    Ok(info)
}

#[tauri::command]
pub async fn get_timer_state() -> AppResult<TimerInfo> {
    let timer = TIMER.lock().unwrap();
    Ok(get_timer_info(&timer))
}

#[tauri::command]
pub async fn clear_timer() -> AppResult<TimerInfo> {
    let mut timer = TIMER.lock().unwrap();
    timer.clear();
    Ok(get_timer_info(&timer))
}

fn get_timer_info(timer: &crate::timer::TimerManager) -> TimerInfo {
    TimerInfo {
        current_timer: timer.get_current_state(),
        upcoming_count: timer.upcoming_activities.len(),
        completed_count: timer.completed_activities.len(),
        total_elapsed: timer.get_total_elapsed(),
        total_remaining: timer.get_total_remaining(),
    }
}
