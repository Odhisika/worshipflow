use tauri::State;
use crate::AppState;
use crate::models::{
    GivingType, Contribution, CreateGivingTypeRequest, UpdateGivingTypeRequest,
    CreateContributionRequest, FinanceDashboardStats, MemberTitheSummary,
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
) -> AppResult<Vec<Contribution>> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::get_contributions(&conn, limit, offset).map_err(Into::into)
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
pub async fn delete_contribution(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    FinanceRepository::delete_contribution(&conn, &id).map_err(Into::into)
}

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
