import { invoke } from '@tauri-apps/api/core';

export interface Receipt {
    id: string;
    receipt_number: string;
    contribution_id?: string;
    member_id?: string;
    amount: number;
    date: string;
    receipt_type: string;
    notes?: string;
    generated_at: string;
}

export interface GenerateReceiptRequest {
    contribution_id: string;
    receipt_number?: string;
}

export const receiptApi = {
    getReceipts: (memberId?: string) => invoke<Receipt[]>('get_receipts', { memberId: memberId || null }),
    generateReceipt: (request: GenerateReceiptRequest) => invoke<Receipt>('generate_receipt', { request }),
    deleteReceipt: (id: string) => invoke<void>('delete_receipt', { id }),
};
