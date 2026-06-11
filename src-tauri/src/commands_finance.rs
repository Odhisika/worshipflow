use tauri::State;
use crate::AppState;
use crate::models::{
    GivingType, Contribution, CreateGivingTypeRequest, UpdateGivingTypeRequest,
    CreateContributionRequest, UpdateContributionRequest,
    Pledge, CreatePledgeRequest, UpdatePledgeRequest,
    FinanceDashboardStats, MemberTitheSummary, MonthlyGivingTrend, YearComparison,
};
use crate::repositories::FinanceRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_giving_types(state: State<'_, AppState>) -> AppResult<Vec<GivingType>> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_giving_types(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn create_giving_type(
    state: State<'_, AppState>,
    request: CreateGivingTypeRequest,
) -> AppResult<GivingType> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::create_giving_type(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_giving_type(
    state: State<'_, AppState>,
    id: String,
    request: UpdateGivingTypeRequest,
) -> AppResult<GivingType> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::update_giving_type(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_giving_type(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::delete_giving_type(&conn, &id)
}

#[tauri::command]
pub async fn get_contributions(
    state: State<'_, AppState>,
    limit: i32,
    offset: i32,
    date_from: Option<String>,
    date_to: Option<String>,
) -> AppResult<Vec<Contribution>> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_contributions(&conn, limit, offset, date_from, date_to).map_err(Into::into)
}

#[tauri::command]
pub async fn add_contribution(
    state: State<'_, AppState>,
    request: CreateContributionRequest,
) -> AppResult<Contribution> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::add_contribution(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_contribution(
    state: State<'_, AppState>,
    id: String,
    request: UpdateContributionRequest,
) -> AppResult<Contribution> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::update_contribution(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_contribution(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::delete_contribution(&conn, &id).map_err(Into::into)
}

// Pledges
#[tauri::command]
pub async fn get_pledges(state: State<'_, AppState>) -> AppResult<Vec<Pledge>> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_pledges(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn create_pledge(
    state: State<'_, AppState>,
    request: CreatePledgeRequest,
) -> AppResult<Pledge> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::create_pledge(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_pledge(
    state: State<'_, AppState>,
    id: String,
    request: UpdatePledgeRequest,
) -> AppResult<Pledge> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::update_pledge(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn add_pledge_payment(
    state: State<'_, AppState>,
    id: String,
    amount: f64,
) -> AppResult<Pledge> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::add_pledge_payment(&conn, &id, amount).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_pledge(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::delete_pledge(&conn, &id).map_err(Into::into)
}

// Stats & Trends
#[tauri::command]
pub async fn get_dashboard_stats(
    state: State<'_, AppState>,
    year_month_prefix: String,
) -> AppResult<FinanceDashboardStats> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_dashboard_stats(&conn, &year_month_prefix).map_err(Into::into)
}

#[tauri::command]
pub async fn get_member_tithe_summary(
    state: State<'_, AppState>,
    year_month_prefix: String,
) -> AppResult<Vec<MemberTitheSummary>> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_member_tithe_summary(&conn, &year_month_prefix).map_err(Into::into)
}

#[tauri::command]
pub async fn get_monthly_giving_trends(
    state: State<'_, AppState>,
    months: i32,
) -> AppResult<Vec<MonthlyGivingTrend>> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_monthly_giving_trends(&conn, months).map_err(Into::into)
}

#[tauri::command]
pub async fn get_year_comparison(
    state: State<'_, AppState>,
) -> AppResult<YearComparison> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_year_comparison(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn get_member_statement(
    state: State<'_, AppState>,
    member_id: String,
    year: String,
) -> AppResult<Vec<Contribution>> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_contributions_for_member_statement(&conn, &member_id, &year).map_err(Into::into)
}
