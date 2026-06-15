use tauri::State;
use crate::AppState;
use crate::models::{Receipt, GenerateReceiptRequest};
use crate::repositories::ReceiptRepository;
use crate::error::AppResult;

#[tauri::command]
pub async fn get_receipts(
    state: State<'_, AppState>,
    member_id: Option<String>,
) -> AppResult<Vec<Receipt>> {
    let conn = state.db.lock().unwrap();
    ReceiptRepository::get_receipts(&conn, member_id.as_deref()).map_err(Into::into)
}

#[tauri::command]
pub async fn generate_receipt(
    state: State<'_, AppState>,
    request: GenerateReceiptRequest,
) -> AppResult<Receipt> {
    let conn = state.db.lock().unwrap();
    ReceiptRepository::generate_receipt(&conn, request).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_receipt(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    ReceiptRepository::delete_receipt(&conn, &id).map_err(Into::into)
}
