use tauri::State;
use crate::AppState;
use crate::models::{
    BudgetCategory, CreateBudgetCategoryRequest,
    Budget, CreateBudgetRequest, UpdateBudgetRequest,
    ExpenseCategory, CreateExpenseCategoryRequest,
    Expense, CreateExpenseRequest, UpdateExpenseRequest,
    BudgetDashboardStats, ExpenseSummary,
};
use crate::repositories::BudgetRepository;
use crate::error::AppResult;

// --- Budget Categories ---
#[tauri::command]
pub async fn get_budget_categories(state: State<'_, AppState>) -> AppResult<Vec<BudgetCategory>> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::get_budget_categories(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn create_budget_category(
    state: State<'_, AppState>,
    request: CreateBudgetCategoryRequest,
) -> AppResult<BudgetCategory> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::create_budget_category(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_budget_category(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::delete_budget_category(&conn, &id).map_err(Into::into)
}

// --- Budgets ---
#[tauri::command]
pub async fn get_budgets(
    state: State<'_, AppState>,
    fiscal_year: Option<String>,
) -> AppResult<Vec<Budget>> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::get_budgets(&conn, fiscal_year.as_deref()).map_err(Into::into)
}

#[tauri::command]
pub async fn create_budget(
    state: State<'_, AppState>,
    request: CreateBudgetRequest,
) -> AppResult<Budget> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::create_budget(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_budget(
    state: State<'_, AppState>,
    id: String,
    request: UpdateBudgetRequest,
) -> AppResult<Budget> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::update_budget(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_budget(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::delete_budget(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn get_budget_dashboard(
    state: State<'_, AppState>,
    fiscal_year: String,
) -> AppResult<BudgetDashboardStats> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::get_budget_dashboard(&conn, &fiscal_year).map_err(Into::into)
}

// --- Expense Categories ---
#[tauri::command]
pub async fn get_expense_categories(state: State<'_, AppState>) -> AppResult<Vec<ExpenseCategory>> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::get_expense_categories(&conn).map_err(Into::into)
}

#[tauri::command]
pub async fn create_expense_category(
    state: State<'_, AppState>,
    request: CreateExpenseCategoryRequest,
) -> AppResult<ExpenseCategory> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::create_expense_category(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_expense_category(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::delete_expense_category(&conn, &id).map_err(Into::into)
}

// --- Expenses ---
#[tauri::command]
pub async fn get_expenses(
    state: State<'_, AppState>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> AppResult<Vec<Expense>> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::get_expenses(&conn, date_from.as_deref(), date_to.as_deref()).map_err(Into::into)
}

#[tauri::command]
pub async fn create_expense(
    state: State<'_, AppState>,
    request: CreateExpenseRequest,
) -> AppResult<Expense> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::create_expense(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn update_expense(
    state: State<'_, AppState>,
    id: String,
    request: UpdateExpenseRequest,
) -> AppResult<Expense> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::update_expense(&conn, &id, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_expense(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::delete_expense(&conn, &id).map_err(Into::into)
}

#[tauri::command]
pub async fn get_expense_summaries(
    state: State<'_, AppState>,
    year: String,
) -> AppResult<Vec<ExpenseSummary>> {
    let conn = state.db.lock().unwrap();
    BudgetRepository::get_expense_summaries(&conn, &year).map_err(Into::into)
}
