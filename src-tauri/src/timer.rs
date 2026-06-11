use crate::error::{AppError, AppResult};
use crate::models::{Activity, TimerState};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveTimer {
    pub activity: Activity,
    pub start_time: DateTime<Utc>,
    pub duration_seconds: i64,
    pub is_running: bool,
    pub is_paused: bool,
    pub pause_time: Option<DateTime<Utc>>,
    pub elapsed_at_pause: i64,
}

impl ActiveTimer {
    pub fn new(activity: Activity) -> Self {
        let duration_seconds = (activity.duration_minutes as i64) * 60;
        
        Self {
            activity,
            start_time: Utc::now(),
            duration_seconds,
            is_running: true,
            is_paused: false,
            pause_time: None,
            elapsed_at_pause: 0,
        }
    }

    pub fn elapsed_seconds(&self) -> i64 {
        if self.is_paused {
            self.elapsed_at_pause
        } else {
            let elapsed = Utc::now().signed_duration_since(self.start_time);
            elapsed.num_seconds() + self.elapsed_at_pause
        }
    }

    pub fn remaining_seconds(&self) -> i64 {
        (self.duration_seconds - self.elapsed_seconds()).max(0)
    }

    pub fn is_overrun(&self) -> bool {
        self.elapsed_seconds() > self.duration_seconds
    }

    #[expect(dead_code)]
    pub fn overrun_seconds(&self) -> i64 {
        if self.is_overrun() {
            self.elapsed_seconds() - self.duration_seconds
        } else {
            0
        }
    }

    pub fn pause(&mut self) {
        if self.is_running && !self.is_paused {
            self.is_paused = true;
            self.pause_time = Some(Utc::now());
            self.elapsed_at_pause = self.elapsed_seconds();
        }
    }

    pub fn resume(&mut self) {
        if self.is_paused {
            self.is_paused = false;
            self.start_time = Utc::now();
            self.pause_time = None;
        }
    }

    pub fn add_time(&mut self, seconds: i64) {
        self.duration_seconds += seconds;
    }

    pub fn to_timer_state(&self) -> TimerState {
        TimerState {
            activity_id: self.activity.id.clone(),
            activity_name: self.activity.name.clone(),
            duration_seconds: self.duration_seconds,
            elapsed_seconds: self.elapsed_seconds(),
            is_running: self.is_running && !self.is_paused,
            is_overrun: self.is_overrun(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerManager {
    pub current_timer: Option<ActiveTimer>,
    pub upcoming_activities: Vec<Activity>,
    pub completed_activities: Vec<Activity>,
    pub service_id: Option<String>,
}

impl Default for TimerManager {
    fn default() -> Self {
        Self {
            current_timer: None,
            upcoming_activities: Vec::new(),
            completed_activities: Vec::new(),
            service_id: None,
        }
    }
}

impl TimerManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn load_service(&mut self, service_id: String, activities: Vec<Activity>) {
        self.service_id = Some(service_id);
        self.upcoming_activities = activities;
        self.completed_activities.clear();
        self.current_timer = None;
    }

    pub fn start_next_activity(&mut self) -> AppResult<TimerState> {
        if let Some(activity) = self.upcoming_activities.first() {
            let activity = activity.clone();
            self.upcoming_activities.remove(0);
            
            if let Some(current) = &self.current_timer {
                self.completed_activities.push(current.activity.clone());
            }
            
            let timer = ActiveTimer::new(activity);
            let state = timer.to_timer_state();
            self.current_timer = Some(timer);
            
            Ok(state)
        } else {
            Err(AppError::InvalidInput("No more activities".to_string()))
        }
    }

    pub fn set_activity(&mut self, activity_id: &str) -> AppResult<()> {
        // Find the activity in the upcoming list
        if let Some(index) = self.upcoming_activities.iter().position(|a| a.id == activity_id) {
            let activity = self.upcoming_activities.remove(index);
            // Put it at the very front of the list so start_next_activity grabs it immediately
            self.upcoming_activities.insert(0, activity);
            Ok(())
        } else {
            Err(AppError::InvalidInput("Activity not found".to_string()))
        }
    }

    pub fn pause_timer(&mut self) -> AppResult<TimerState> {
        if let Some(timer) = &mut self.current_timer {
            timer.pause();
            Ok(timer.to_timer_state())
        } else {
            Err(AppError::InvalidInput("No active timer".to_string()))
        }
    }

    pub fn resume_timer(&mut self) -> AppResult<TimerState> {
        if let Some(timer) = &mut self.current_timer {
            timer.resume();
            Ok(timer.to_timer_state())
        } else {
            Err(AppError::InvalidInput("No active timer".to_string()))
        }
    }

    pub fn add_time(&mut self, seconds: i64) -> AppResult<TimerState> {
        if let Some(timer) = &mut self.current_timer {
            timer.add_time(seconds);
            Ok(timer.to_timer_state())
        } else {
            Err(AppError::InvalidInput("No active timer".to_string()))
        }
    }

    pub fn get_current_state(&self) -> Option<TimerState> {
        self.current_timer.as_ref().map(|t| t.to_timer_state())
    }

    pub fn stop_timer(&mut self) {
        if let Some(timer) = self.current_timer.take() {
            self.completed_activities.push(timer.activity);
        }
    }

    pub fn clear(&mut self) {
        self.current_timer = None;
        self.upcoming_activities.clear();
        self.completed_activities.clear();
        self.service_id = None;
    }

    pub fn get_total_elapsed(&self) -> i64 {
        let completed: i64 = self.completed_activities
            .iter()
            .map(|a| (a.duration_minutes as i64) * 60)
            .sum();
        
        let current = self.current_timer
            .as_ref()
            .map(|t| t.elapsed_seconds())
            .unwrap_or(0);
        
        completed + current
    }

    pub fn get_total_remaining(&self) -> i64 {
        let upcoming: i64 = self.upcoming_activities
            .iter()
            .map(|a| (a.duration_minutes as i64) * 60)
            .sum();
        
        let current = self.current_timer
            .as_ref()
            .map(|t| t.remaining_seconds())
            .unwrap_or(0);
        
        upcoming + current
    }
}

lazy_static::lazy_static! {
    pub static ref TIMER: Mutex<TimerManager> = Mutex::new(TimerManager::new());
}
