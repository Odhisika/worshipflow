use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// Song model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub lyrics: String,
    pub key: Option<String>,
    pub tempo: Option<i32>,
    pub tags: Vec<String>,
    pub chords: Option<String>,
    pub show_chords: bool,
    pub arrangement: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSongRequest {
    pub title: String,
    pub lyrics: String,
    pub key: Option<String>,
    pub tempo: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub chords: Option<String>,
    pub show_chords: Option<bool>,
    pub arrangement: Option<String>,
}

// Service model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub id: String,
    pub title: String,
    pub date: String,
    pub theme: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateServiceRequest {
    pub title: String,
    pub date: String,
    pub theme: Option<String>,
    pub notes: Option<String>,
}

// Activity model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub id: String,
    pub service_id: String,
    pub name: String,
    pub duration_minutes: i32,
    pub leader: Option<String>,
    pub notes: Option<String>,
    pub order_index: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateActivityRequest {
    pub service_id: String,
    pub name: String,
    pub duration_minutes: i32,
    pub leader: Option<String>,
    pub notes: Option<String>,
}

// Slide model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Slide {
    pub id: String,
    pub slide_type: SlideType,
    pub title: Option<String>,
    pub content: String,
    pub media_path: Option<String>,
    pub background_path: Option<String>,
    pub order_index: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SlideType {
    Text,
    Song,
    Bible,
    Image,
    Video,
    Audio,
    Announcement,
    Timer,
    Capture,
}

impl ToString for SlideType {
    fn to_string(&self) -> String {
        match self {
            SlideType::Text => "text".to_string(),
            SlideType::Song => "song".to_string(),
            SlideType::Bible => "bible".to_string(),
            SlideType::Image => "image".to_string(),
            SlideType::Video => "video".to_string(),
            SlideType::Audio => "audio".to_string(),
            SlideType::Announcement => "announcement".to_string(),
            SlideType::Timer => "timer".to_string(),
            SlideType::Capture => "capture".to_string(),
        }
    }
}

impl SlideType {
    #[expect(dead_code)]
    pub fn from_string(s: &str) -> Option<Self> {
        match s {
            "text" => Some(SlideType::Text),
            "song" => Some(SlideType::Song),
            "bible" => Some(SlideType::Bible),
            "image" => Some(SlideType::Image),
            "video" => Some(SlideType::Video),
            "audio" => Some(SlideType::Audio),
            "announcement" => Some(SlideType::Announcement),
            "timer" => Some(SlideType::Timer),
            "capture" => Some(SlideType::Capture),
            _ => None,
        }
    }
}

// Timer state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerState {
    pub activity_id: String,
    pub activity_name: String,
    pub duration_seconds: i64,
    pub elapsed_seconds: i64,
    pub is_running: bool,
    pub is_overrun: bool,
}

impl TimerState {
    #[expect(dead_code)]
    pub fn remaining_seconds(&self) -> i64 {
        (self.duration_seconds - self.elapsed_seconds).max(0)
    }

    #[expect(dead_code)]
    pub fn overrun_seconds(&self) -> i64 {
        if self.is_overrun {
            self.elapsed_seconds - self.duration_seconds
        } else {
            0
        }
    }
}

// Service execution state
#[expect(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceState {
    pub service_id: String,
    pub current_activity_index: usize,
    pub activities: Vec<Activity>,
    pub timer_state: Option<TimerState>,
    pub started_at: Option<DateTime<Utc>>,
}

// Bible verse
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BibleVerse {
    pub id: i32,
    pub book: String,
    pub chapter: i32,
    pub verse: i32,
    pub text: String,
    pub version: String,
}

// Display configuration
#[expect(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayConfig {
    pub main_display_id: Option<String>,
    pub operator_display_id: Option<String>,
    pub confidence_display_id: Option<String>,
}

// Media item
#[expect(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Media {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub media_type: MediaType,
    pub file_path: String,
    pub thumbnail_path: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Image,
    Video,
    Audio,
}

impl ToString for MediaType {
    fn to_string(&self) -> String {
        match self {
            MediaType::Image => "image".to_string(),
            MediaType::Video => "video".to_string(),
            MediaType::Audio => "audio".to_string(),
        }
    }
}

// Church Admin Authentication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminUser {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AdminLoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangeEmailRequest {
    pub password: String,
    pub new_email: String,
}
// Church Members
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Member {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub hometown: Option<String>,
    pub occupation: Option<String>,
    pub is_baptized: bool,
    pub baptism_date: Option<String>,
    pub confirmation_date: Option<String>,
    pub wedding_date: Option<String>,
    pub marital_status: Option<String>,
    pub emergency_contact: Option<String>,
    pub role: MemberRole,
    pub status: MemberStatus,
    pub membership_status: Option<String>,
    pub ministry: Option<String>,
    pub photo: Option<String>,
    pub joined_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MemberRole {
    Member,
    YouthLeader,
    MensLeader,
    Deacon,
    Pastor,
}

impl ToString for MemberRole {
    fn to_string(&self) -> String {
        match self {
            MemberRole::Member => "member".to_string(),
            MemberRole::YouthLeader => "youth_leader".to_string(),
            MemberRole::MensLeader => "mens_leader".to_string(),
            MemberRole::Deacon => "deacon".to_string(),
            MemberRole::Pastor => "pastor".to_string(),
        }
    }
}

impl MemberRole {
    pub fn from_string(s: &str) -> Self {
        match s {
            "youth_leader" => MemberRole::YouthLeader,
            "mens_leader" => MemberRole::MensLeader,
            "deacon" => MemberRole::Deacon,
            "pastor" => MemberRole::Pastor,
            _ => MemberRole::Member,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MemberStatus {
    Active,
    Inactive,
    Transferred,
    Deceased,
    Suspended,
}

impl ToString for MemberStatus {
    fn to_string(&self) -> String {
        match self {
            MemberStatus::Active => "active".to_string(),
            MemberStatus::Inactive => "inactive".to_string(),
            MemberStatus::Transferred => "transferred".to_string(),
            MemberStatus::Deceased => "deceased".to_string(),
            MemberStatus::Suspended => "suspended".to_string(),
        }
    }
}

impl MemberStatus {
    pub fn from_string(s: &str) -> Self {
        match s {
            "inactive" => MemberStatus::Inactive,
            "transferred" => MemberStatus::Transferred,
            "deceased" => MemberStatus::Deceased,
            "suspended" => MemberStatus::Suspended,
            _ => MemberStatus::Active,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateMemberRequest {
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub hometown: Option<String>,
    pub occupation: Option<String>,
    pub is_baptized: Option<bool>,
    pub baptism_date: Option<String>,
    pub confirmation_date: Option<String>,
    pub wedding_date: Option<String>,
    pub marital_status: Option<String>,
    pub emergency_contact: Option<String>,
    pub role: Option<MemberRole>,
    pub ministry: Option<String>,
    pub photo: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMemberRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub hometown: Option<String>,
    pub occupation: Option<String>,
    pub is_baptized: Option<bool>,
    pub baptism_date: Option<String>,
    pub confirmation_date: Option<String>,
    pub wedding_date: Option<String>,
    pub marital_status: Option<String>,
    pub emergency_contact: Option<String>,
    pub role: Option<MemberRole>,
    pub status: Option<MemberStatus>,
    pub ministry: Option<String>,
    pub photo: Option<String>,
}
// Finance - Giving Types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GivingType {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub is_system: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGivingTypeRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGivingTypeRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}

// Finance - Contributions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contribution {
    pub id: String,
    pub type_id: String,
    pub member_id: Option<String>,
    pub amount: f64,
    pub date: String,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    
    // Joined fields for convenience in UI
    #[serde(skip_deserializing)]
    pub type_name: Option<String>,
    #[serde(skip_deserializing)]
    pub member_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateContributionRequest {
    pub type_id: String,
    pub member_id: Option<String>,
    pub amount: f64,
    pub date: String,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContributionRequest {
    pub type_id: Option<String>,
    pub member_id: Option<String>,
    pub amount: Option<f64>,
    pub date: Option<String>,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

// Finance - Pledges
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pledge {
    pub id: String,
    pub member_id: String,
    pub category: String,
    pub amount_promised: f64,
    pub amount_paid: f64,
    pub due_date: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    
    // Joined fields
    #[serde(skip_deserializing)]
    pub member_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePledgeRequest {
    pub member_id: String,
    pub category: String,
    pub amount_promised: f64,
    pub due_date: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePledgeRequest {
    pub amount_promised: Option<f64>,
    pub amount_paid: Option<f64>,
    pub due_date: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

// Finance - Dashboards and Summaries
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FinanceDashboardStats {
    pub total_offerings: f64,
    pub total_tithes: f64,
    pub total_pledges: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberTitheSummary {
    pub member_id: String,
    pub member_name: String,
    pub total_amount: f64,
    pub month: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyGivingTrend {
    pub month: String,
    pub tithes: f64,
    pub offerings: f64,
    pub pledges: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearComparison {
    pub current_year: String,
    pub previous_year: String,
    pub current_total: f64,
    pub previous_total: f64,
    pub change_pct: f64,
}

// Small Groups / Ministries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub meeting_day: Option<String>,
    pub meeting_time: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub description: Option<String>,
    pub meeting_day: Option<String>,
    pub meeting_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGroupRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub meeting_day: Option<String>,
    pub meeting_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupMember {
    pub id: String,
    pub group_id: String,
    pub member_id: String,
    pub role: String,
    pub joined_at: DateTime<Utc>,
    
    // Optional fields for UI
    #[serde(skip_deserializing)]
    pub member_name: Option<String>,
    #[serde(skip_deserializing)]
    pub group_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddMemberToGroupRequest {
    pub group_id: String,
    pub member_id: String,
    pub role: String,
}

// Attendance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceRecord {
    pub id: String,
    pub service_id: String,
    pub member_id: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    
    // Joined field for UI
    #[serde(skip_deserializing)]
    pub member_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MarkAttendanceRequest {
    pub service_id: String,
    pub member_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceAttendanceSummary {
    pub service_id: String,
    pub service_title: String,
    pub service_date: String,
    pub total_present: i32,
    pub total_absent: i32,
    pub total_excused: i32,
    pub total_members: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberAttendanceRecord {
    pub member_id: String,
    pub member_name: String,
    pub status: Option<String>,
    pub role: String,
}

// Events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub date: String,
    pub time: Option<String>,
    pub location: Option<String>,
    pub category: Option<String>,
    pub is_recurring: bool,
    pub recurrence_rule: Option<String>,
    pub recurrence_end: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub date: String,
    pub time: Option<String>,
    pub location: Option<String>,
    pub category: Option<String>,
    pub is_recurring: Option<bool>,
    pub recurrence_rule: Option<String>,
    pub recurrence_end: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEventRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
    pub location: Option<String>,
    pub category: Option<String>,
    pub is_recurring: Option<bool>,
    pub recurrence_rule: Option<String>,
    pub recurrence_end: Option<String>,
}

// Communications
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Campaign {
    pub id: String,
    pub name: String,
    pub campaign_type: String, // 'Email' or 'SMS'
    pub content: String,
    pub recipient_count: i32,
    pub open_rate: f64,
    pub click_rate: f64,
    pub status: String,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub sent_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCampaignRequest {
    pub name: String,
    pub campaign_type: String,
    pub content: String,
    pub scheduled_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriberStats {
    pub email_subscribers: i32,
    pub sms_subscribers: i32,
    pub avg_open_rate: f64,
}

// Overview
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub total_members: i32,
    pub members_growth: i32,
    pub weekly_giving: f64,
    pub giving_trend: f64,
    pub upcoming_events: i32,
    pub next_event_title: String,
    pub active_groups: i32,
    pub total_participants: i32,
}

// Volunteers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolunteerRole {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub required_count: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolunteerAssignment {
    pub id: String,
    pub role_id: String,
    pub role_name: String,
    pub member_id: String,
    pub member_name: String,
    pub service_id: String,
    pub status: String, // 'Confirmed', 'Pending', 'Declined'
}

// Reports
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceTrend {
    pub month: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GivingSummary {
    pub category: String,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrowthMetric {
    pub period: String,
    pub new_members: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsReport {
    pub attendance_trends: Vec<AttendanceTrend>,
    pub giving_summaries: Vec<GivingSummary>,
    pub growth_metrics: Vec<GrowthMetric>,
}

// Settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingItem {
    pub key: String,
    pub value: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub church_name: String,
    pub church_address: Option<String>,
    pub church_phone: Option<String>,
    pub church_email: Option<String>,
    pub church_logo: Option<String>,
    pub currency: String,
    pub language: String,
    pub theme: String,
    pub checkin_proximity_enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingRequest {
    pub key: String,
    pub value: String,
}

// Member Relationships (for Child Check-In)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberRelationship {
    pub id: String,
    pub child_id: String,
    pub guardian_id: String,
    pub relationship_type: String,
    pub created_at: DateTime<Utc>,
    
    // Optional fields for UI
    #[serde(skip_deserializing)]
    pub child_name: Option<String>,
    #[serde(skip_deserializing)]
    pub guardian_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRelationshipRequest {
    pub child_id: String,
    pub guardian_id: String,
    pub relationship_type: String,
}

// Check-In Sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckIn {
    pub id: String,
    pub member_id: String,
    pub service_id: Option<String>,
    pub event_id: Option<String>,
    pub location: Option<String>,
    pub check_in_time: DateTime<Utc>,
    pub check_out_time: Option<DateTime<Utc>>,
    pub security_code: String,
    pub status: CheckInStatus,
    pub created_at: DateTime<Utc>,
    
    // Optional fields for UI
    #[serde(skip_deserializing)]
    pub member_name: Option<String>,
    #[serde(skip_deserializing)]
    pub service_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CheckInStatus {
    Active,
    Completed,
}

impl ToString for CheckInStatus {
    fn to_string(&self) -> String {
        match self {
            CheckInStatus::Active => "active".to_string(),
            CheckInStatus::Completed => "completed".to_string(),
        }
    }
}

impl CheckInStatus {
    pub fn from_string(s: &str) -> Self {
        match s {
            "completed" => CheckInStatus::Completed,
            _ => CheckInStatus::Active,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CheckInRequest {
    pub member_id: String,
    pub service_id: Option<String>,
    pub event_id: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckOutRequest {
    pub check_in_id: String,
    pub security_code: String,
}

// --- NEW FEATURE MODELS ---

// Budget Categories
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetCategory {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBudgetCategoryRequest {
    pub name: String,
    pub description: Option<String>,
}

// Budgets
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Budget {
    pub id: String,
    pub category_id: String,
    pub fiscal_year: String,
    pub allocated_amount: f64,
    pub spent_amount: f64,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(skip_deserializing)]
    pub category_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBudgetRequest {
    pub category_id: String,
    pub fiscal_year: String,
    pub allocated_amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBudgetRequest {
    pub allocated_amount: Option<f64>,
    pub notes: Option<String>,
}

// Expense Categories
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpenseCategory {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseCategoryRequest {
    pub name: String,
    pub description: Option<String>,
}

// Expenses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: String,
    pub category_id: String,
    pub amount: f64,
    pub date: String,
    pub payee: Option<String>,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
    pub receipt_path: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_deserializing)]
    pub category_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub category_id: String,
    pub amount: f64,
    pub date: String,
    pub payee: Option<String>,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExpenseRequest {
    pub category_id: Option<String>,
    pub amount: Option<f64>,
    pub date: Option<String>,
    pub payee: Option<String>,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

// Visitors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Visitor {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub gender: Option<String>,
    pub age_group: Option<String>,
    pub visited_date: String,
    pub service_id: Option<String>,
    pub heard_from: Option<String>,
    pub prayer_need: Option<String>,
    pub interest: Option<String>,
    pub status: String,
    pub converted_member_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVisitorRequest {
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub gender: Option<String>,
    pub age_group: Option<String>,
    pub visited_date: String,
    pub service_id: Option<String>,
    pub heard_from: Option<String>,
    pub prayer_need: Option<String>,
    pub interest: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVisitorRequest {
    pub status: Option<String>,
    pub converted_member_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub interest: Option<String>,
}

// Visitor Follow-ups
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisitorFollowup {
    pub id: String,
    pub visitor_id: String,
    pub followup_date: String,
    pub notes: Option<String>,
    pub status: String,
    pub assigned_to: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_deserializing)]
    pub visitor_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVisitorFollowupRequest {
    pub visitor_id: String,
    pub followup_date: String,
    pub notes: Option<String>,
    pub assigned_to: Option<String>,
}

// Event Attendance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventAttendance {
    pub id: String,
    pub event_id: String,
    pub member_id: Option<String>,
    pub visitor_id: Option<String>,
    pub status: String,
    pub check_in_time: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_deserializing)]
    pub attendee_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MarkEventAttendanceRequest {
    pub event_id: String,
    pub member_id: Option<String>,
    pub visitor_id: Option<String>,
    pub status: String,
}

// Pastoral Care - Visitations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Visitation {
    pub id: String,
    pub member_id: Option<String>,
    pub visitor_id: Option<String>,
    pub visitation_date: String,
    pub visitation_type: String,
    pub notes: Option<String>,
    pub conducted_by: Option<String>,
    pub follow_up_needed: bool,
    pub follow_up_date: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_deserializing)]
    pub person_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVisitationRequest {
    pub member_id: Option<String>,
    pub visitation_date: String,
    pub visitation_type: Option<String>,
    pub notes: Option<String>,
    pub conducted_by: Option<String>,
    pub follow_up_needed: Option<bool>,
    pub follow_up_date: Option<String>,
}

// Pastoral Care - Prayer Requests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrayerRequest {
    pub id: String,
    pub member_id: Option<String>,
    pub visitor_id: Option<String>,
    pub request: String,
    pub is_anonymous: bool,
    pub category: Option<String>,
    pub status: String,
    pub prayed_for_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(skip_deserializing)]
    pub requester_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePrayerRequestRequest {
    pub member_id: Option<String>,
    pub request: String,
    pub is_anonymous: Option<bool>,
    pub category: Option<String>,
    pub notes: Option<String>,
}

// Pastoral Care - Counselling Sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CounsellingSession {
    pub id: String,
    pub member_id: String,
    pub session_date: String,
    pub session_type: String,
    pub notes: Option<String>,
    pub is_confidential: bool,
    pub conducted_by: Option<String>,
    pub follow_up_date: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(skip_deserializing)]
    pub member_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCounsellingSessionRequest {
    pub member_id: String,
    pub session_date: String,
    pub session_type: String,
    pub notes: Option<String>,
    pub is_confidential: Option<bool>,
    pub conducted_by: Option<String>,
    pub follow_up_date: Option<String>,
}

// Announcements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Announcement {
    pub id: String,
    pub title: String,
    pub content: String,
    pub category: Option<String>,
    pub priority: Option<String>,
    pub start_date: String,
    pub end_date: Option<String>,
    pub is_active: bool,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAnnouncementRequest {
    pub title: String,
    pub content: String,
    pub category: Option<String>,
    pub priority: Option<String>,
    pub start_date: String,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAnnouncementRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
    pub priority: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_active: Option<bool>,
}

// Reminders
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub reminder_type: String,
    pub title: String,
    pub description: Option<String>,
    pub reference_type: Option<String>,
    pub reference_id: Option<String>,
    pub scheduled_date: String,
    pub is_sent: bool,
    pub sent_at: Option<String>,
    pub created_at: DateTime<Utc>,
}

// Receipts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Receipt {
    pub id: String,
    pub receipt_number: String,
    pub contribution_id: Option<String>,
    pub member_id: Option<String>,
    pub member_name: Option<String>,
    pub amount: f64,
    pub date: String,
    pub receipt_type: String,
    pub notes: Option<String>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateReceiptRequest {
    pub contribution_id: String,
    pub receipt_number: Option<String>,
}

// Venues
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Venue {
    pub id: String,
    pub name: String,
    pub capacity: Option<i32>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub facilities: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVenueRequest {
    pub name: String,
    pub capacity: Option<i32>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub facilities: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVenueRequest {
    pub name: Option<String>,
    pub capacity: Option<i32>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub facilities: Option<String>,
    pub is_active: Option<bool>,
}

// Venue Bookings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VenueBooking {
    pub id: String,
    pub venue_id: String,
    pub event_id: Option<String>,
    pub booking_date: String,
    pub start_time: String,
    pub end_time: String,
    pub booked_by: Option<String>,
    pub purpose: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    #[serde(skip_deserializing)]
    pub venue_name: Option<String>,
    #[serde(skip_deserializing)]
    pub event_title: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVenueBookingRequest {
    pub venue_id: String,
    pub event_id: Option<String>,
    pub booking_date: String,
    pub start_time: String,
    pub end_time: String,
    pub booked_by: Option<String>,
    pub purpose: Option<String>,
}

// Audit Logs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub user_id: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

// Admin Roles
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminRole {
    pub id: String,
    pub admin_id: String,
    pub role: String,
    pub permissions: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAdminRoleRequest {
    pub admin_id: String,
    pub role: String,
    pub permissions: Option<String>,
}

// Budget Dashboard
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BudgetDashboardStats {
    pub total_budget: f64,
    pub total_spent: f64,
    pub remaining: f64,
}

// Expense Summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpenseSummary {
    pub category_name: String,
    pub total: f64,
}

// Backup Info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub file_name: String,
    pub file_size: i64,
    pub created_at: String,
}

// Upcoming birthdays/anniversaries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpcomingBirthday {
    pub member_id: String,
    pub member_name: String,
    pub dob: String,
    pub age: i32,
    pub days_until: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpcomingAnniversary {
    pub member_id: String,
    pub member_name: String,
    pub joined_at: String,
    pub years: i32,
    pub days_until: i32,
}
