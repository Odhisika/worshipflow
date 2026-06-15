import { invoke } from '@tauri-apps/api/core';

export interface BudgetCategory {
    id: string;
    name: string;
    description?: string;
    created_at: string;
}

export interface CreateBudgetCategoryRequest {
    name: string;
    description?: string;
}

export interface Budget {
    id: string;
    category_id: string;
    fiscal_year: string;
    allocated_amount: number;
    spent_amount: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    category_name?: string;
}

export interface CreateBudgetRequest {
    category_id: string;
    fiscal_year: string;
    allocated_amount: number;
    notes?: string;
}

export interface UpdateBudgetRequest {
    allocated_amount?: number;
    notes?: string;
}

export interface ExpenseCategory {
    id: string;
    name: string;
    description?: string;
    created_at: string;
}

export interface CreateExpenseCategoryRequest {
    name: string;
    description?: string;
}

export interface Expense {
    id: string;
    category_id: string;
    amount: number;
    date: string;
    payee?: string;
    payment_method?: string;
    notes?: string;
    receipt_path?: string;
    created_at: string;
    category_name?: string;
}

export interface CreateExpenseRequest {
    category_id: string;
    amount: number;
    date: string;
    payee?: string;
    payment_method?: string;
    notes?: string;
}

export interface UpdateExpenseRequest {
    category_id?: string;
    amount?: number;
    date?: string;
    payee?: string;
    payment_method?: string;
    notes?: string;
}

export interface BudgetDashboardStats {
    total_budget: number;
    total_spent: number;
    remaining: number;
}

export interface ExpenseSummary {
    category_name: string;
    total: number;
}

export const budgetApi = {
    getBudgetCategories: () => invoke<BudgetCategory[]>('get_budget_categories'),
    createBudgetCategory: (request: CreateBudgetCategoryRequest) => invoke<BudgetCategory>('create_budget_category', { request }),
    deleteBudgetCategory: (id: string) => invoke<void>('delete_budget_category', { id }),

    getBudgets: (fiscalYear?: string) => invoke<Budget[]>('get_budgets', { fiscalYear: fiscalYear || null }),
    createBudget: (request: CreateBudgetRequest) => invoke<Budget>('create_budget', { request }),
    updateBudget: (id: string, request: UpdateBudgetRequest) => invoke<Budget>('update_budget', { id, request }),
    deleteBudget: (id: string) => invoke<void>('delete_budget', { id }),
    getBudgetDashboard: (fiscalYear: string) => invoke<BudgetDashboardStats>('get_budget_dashboard', { fiscalYear }),

    getExpenseCategories: () => invoke<ExpenseCategory[]>('get_expense_categories'),
    createExpenseCategory: (request: CreateExpenseCategoryRequest) => invoke<ExpenseCategory>('create_expense_category', { request }),
    deleteExpenseCategory: (id: string) => invoke<void>('delete_expense_category', { id }),

    getExpenses: (dateFrom?: string, dateTo?: string) => invoke<Expense[]>('get_expenses', { dateFrom: dateFrom || null, dateTo: dateTo || null }),
    createExpense: (request: CreateExpenseRequest) => invoke<Expense>('create_expense', { request }),
    updateExpense: (id: string, request: UpdateExpenseRequest) => invoke<Expense>('update_expense', { id, request }),
    deleteExpense: (id: string) => invoke<void>('delete_expense', { id }),
    getExpenseSummaries: (year: string) => invoke<ExpenseSummary[]>('get_expense_summaries', { year }),
};
