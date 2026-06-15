import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdEdit, MdAccountBalance } from 'react-icons/md';
import AppDatePicker from '../../components/AppDatePicker';
import { budgetApi, Budget, BudgetCategory, Expense, ExpenseCategory, BudgetDashboardStats } from '../../api/budget';
import { useDataRefresh } from '../../context/DataRefreshContext';
import ConfirmModal from './ConfirmModal';
import './AdminViews.css';

type TabType = 'budgets' | 'expenses';

const AdminBudget: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('budgets');
    const currentYear = new Date().getFullYear().toString();
    const [fiscalYear, setFiscalYear] = useState(currentYear);

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Budget & Expense Management</h1><p>Track church budgets, expenses, and financial planning.</p></div>
                <div className="admin-controls">
                    <input type="text" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} placeholder="Year" style={{ width: '80px', textAlign: 'center' }} />
                </div>
            </div>
            <div className="tab-bar">
                <button className={activeTab === 'budgets' ? 'tab-active' : ''} onClick={() => setActiveTab('budgets')}><MdAccountBalance /> Budgets</button>
                <button className={activeTab === 'expenses' ? 'tab-active' : ''} onClick={() => setActiveTab('expenses')}><MdAdd /> Expenses</button>
            </div>
            {activeTab === 'budgets' && <BudgetsSection fiscalYear={fiscalYear} />}
            {activeTab === 'expenses' && <ExpensesSection />}
        </div>
    );
};

const BudgetsSection: React.FC<{ fiscalYear: string }> = ({ fiscalYear }) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [dashboard, setDashboard] = useState<BudgetDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const [editBudget, setEditBudget] = useState<Budget | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const [form, setForm] = useState({ category_id: '', allocated_amount: 0, notes: '' });
    const [catForm, setCatForm] = useState({ name: '', description: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            setBudgets(await budgetApi.getBudgets(fiscalYear));
            setCategories(await budgetApi.getBudgetCategories());
            try { setDashboard(await budgetApi.getBudgetDashboard(fiscalYear)); } catch {}
        } catch { toast.error('Failed to load budgets.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal, fiscalYear]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await budgetApi.createBudget({ category_id: form.category_id, fiscal_year: fiscalYear, allocated_amount: form.allocated_amount, notes: form.notes || undefined });
            toast.success('Budget created.');
            setShowModal(false);
            setForm({ category_id: '', allocated_amount: 0, notes: '' });
            triggerRefresh();
        } catch { toast.error('Failed to create budget.'); }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editBudget) return;
        try {
            await budgetApi.updateBudget(editBudget.id, { allocated_amount: form.allocated_amount, notes: form.notes || undefined });
            toast.success('Budget updated.');
            setEditBudget(null);
            triggerRefresh();
        } catch { toast.error('Failed to update budget.'); }
    };

    const handleCatCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await budgetApi.createBudgetCategory(catForm); toast.success('Category added.'); setShowCatModal(false); setCatForm({ name: '', description: '' }); triggerRefresh(); }
        catch { toast.error('Failed.'); }
    };

    const formatCurrency = (n: number) => `Ghc ${n.toLocaleString()}`;

    return (
        <div>
            <div className="members-grid" style={{ marginBottom: '2rem' }}>
                <div className="member-card"><div className="member-card-body"><h3>Total Budget</h3><p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-blue)' }}>{formatCurrency(dashboard?.total_budget || 0)}</p></div></div>
                <div className="member-card"><div className="member-card-body"><h3>Total Spent</h3><p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-orange)' }}>{formatCurrency(dashboard?.total_spent || 0)}</p></div></div>
                <div className="member-card"><div className="member-card-body"><h3>Remaining</h3><p style={{ fontSize: '2rem', fontWeight: 800, color: (dashboard?.remaining || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatCurrency(dashboard?.remaining || 0)}</p></div></div>
            </div>

            <div className="admin-controls" style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Add Budget</button>
                <button className="btn-outline-small" onClick={() => setShowCatModal(true)}><MdAdd /> Category</button>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Category</th><th>Allocated</th><th>Spent</th><th>Remaining</th><th>Usage</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} className="empty-table">Loading...</td></tr> :
                        budgets.length === 0 ? <tr><td colSpan={6} className="empty-table">No budgets for {fiscalYear}. <button className="btn-text" onClick={() => setShowModal(true)}>Create one</button></td></tr> :
                        budgets.map(b => {
                            const remaining = b.allocated_amount - b.spent_amount;
                            const pct = b.allocated_amount > 0 ? (b.spent_amount / b.allocated_amount * 100) : 0;
                            return (
                                <tr key={b.id}>
                                    <td style={{ fontWeight: 600 }}>{b.category_name}</td>
                                    <td>{formatCurrency(b.allocated_amount)}</td>
                                    <td>{formatCurrency(b.spent_amount)}</td>
                                    <td style={{ color: remaining >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatCurrency(remaining)}</td>
                                    <td><div style={{ background: 'var(--bg-lighter)', borderRadius: '4px', height: '8px', width: '100px' }}><div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct > 90 ? 'var(--accent-red)' : pct > 75 ? 'var(--accent-orange)' : 'var(--accent-green)', borderRadius: '4px' }} /></div></td>
                                    <td>
                                        <button className="btn-text" onClick={() => { setEditBudget(b); setForm({ category_id: b.category_id, allocated_amount: b.allocated_amount, notes: b.notes || '' }); }}><MdEdit /></button>
                                        <button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(b.id)}><MdDelete /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Add Budget Allocation</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group"><label>Category *</label><select required value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div className="form-group"><label>Allocated Amount (Ghc) *</label><input type="number" required min={0} step="0.01" value={form.allocated_amount} onChange={e => setForm({...form, allocated_amount: parseFloat(e.target.value) || 0})} /></div>
                            <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}

            {editBudget && (
                <div className="modal-overlay" onClick={() => setEditBudget(null)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Edit Budget</h2>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group"><label>Category</label><input disabled value={editBudget.category_name || ''} /></div>
                            <div className="form-group"><label>Allocated Amount (Ghc) *</label><input type="number" required min={0} step="0.01" value={form.allocated_amount} onChange={e => setForm({...form, allocated_amount: parseFloat(e.target.value) || 0})} /></div>
                            <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setEditBudget(null)}>Cancel</button><button type="submit" className="btn-primary">Update</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showCatModal && (
                <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Add Budget Category</h2>
                        <form onSubmit={handleCatCreate}>
                            <div className="form-group"><label>Name *</label><input required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} /></div>
                            <div className="form-group"><label>Description</label><input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowCatModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}

            {confirmDelete && <ConfirmModal title="Delete Budget" message="Remove this budget allocation?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { budgetApi.deleteBudget(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

const ExpensesSection: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const [editing, setEditing] = useState<Expense | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const [form, setForm] = useState({ category_id: '', amount: 0, date: '', payee: '', payment_method: 'Cash', notes: '' });
    const [catForm, setCatForm] = useState({ name: '', description: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            setExpenses(await budgetApi.getExpenses(dateFrom || undefined, dateTo || undefined));
            setCategories(await budgetApi.getExpenseCategories());
        } catch { toast.error('Failed to load expenses.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await budgetApi.updateExpense(editing.id, form);
                toast.success('Expense updated.');
            } else {
                await budgetApi.createExpense(form);
                toast.success('Expense recorded.');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ category_id: '', amount: 0, date: '', payee: '', payment_method: 'Cash', notes: '' });
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    const total = expenses.reduce((s, e) => s + e.amount, 0);

    return (
        <div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="member-card" style={{ flex: 1, padding: '1rem' }}><h3>Total Expenses</h3><p style={{ fontSize: '1.5rem', fontWeight: 800 }}>Ghc {total.toLocaleString()}</p></div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AppDatePicker value={dateFrom} onChange={setDateFrom} placeholderText="From" className="form-input" style={{ width: '130px' }} />
                    <AppDatePicker value={dateTo} onChange={setDateTo} placeholderText="To" className="form-input" style={{ width: '130px' }} />
                    <button className="btn-outline-small" onClick={fetchData}>Filter</button>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Add Expense</button>
                <button className="btn-outline-small" onClick={() => setShowCatModal(true)}><MdAdd /> Category</button>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Payee</th><th>Payment Method</th><th>Notes</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={7} className="empty-table">Loading...</td></tr> :
                        expenses.length === 0 ? <tr><td colSpan={7} className="empty-table">No expenses recorded.</td></tr> :
                        expenses.map(e => (
                            <tr key={e.id}>
                                <td>{new Date(e.date).toLocaleDateString()}</td>
                                <td><span className="status-badge status-info">{e.category_name}</span></td>
                                <td style={{ fontWeight: 700 }}>Ghc {e.amount.toLocaleString()}</td>
                                <td>{e.payee || '-'}</td>
                                <td>{e.payment_method || 'Cash'}</td>
                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.notes || '-'}</td>
                                <td>
                                    <button className="btn-text" onClick={() => { setEditing(e); setForm({ category_id: e.category_id, amount: e.amount, date: e.date, payee: e.payee || '', payment_method: e.payment_method || 'Cash', notes: e.notes || '' }); setShowModal(true); }}><MdEdit /></button>
                                    <button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(e.id)}><MdDelete /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setEditing(null); }}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>{editing ? 'Edit Expense' : 'Record Expense'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label>Category *</label><select required value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div className="form-row">
                                <div className="form-group"><label>Amount (Ghc) *</label><input type="number" required min={0} step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} /></div>
                                <div className="form-group"><label>Date *</label><AppDatePicker value={form.date} onChange={d => setForm({...form, date: d})} placeholderText="Select date" className="form-input" /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Payee</label><input value={form.payee} onChange={e => setForm({...form, payee: e.target.value})} placeholder="Paid to" /></div>
                                <div className="form-group"><label>Payment Method</label><select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}><option value="Cash">Cash</option><option value="Mobile Money">Mobile Money</option><option value="Bank Transfer">Bank Transfer</option><option value="Cheque">Cheque</option><option value="Card">Card</option></select></div>
                            </div>
                            <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button><button type="submit" className="btn-primary">{editing ? 'Update' : 'Save'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showCatModal && (
                <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Add Expense Category</h2>
                        <form onSubmit={(e) => { e.preventDefault(); budgetApi.createExpenseCategory(catForm).then(() => { toast.success('Category added.'); setShowCatModal(false); setCatForm({ name: '', description: '' }); triggerRefresh(); }).catch(() => toast.error('Failed.')); }}>
                            <div className="form-group"><label>Name *</label><input required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} /></div>
                            <div className="form-group"><label>Description</label><input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowCatModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Delete Expense" message="Remove this expense?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { budgetApi.deleteExpense(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

export default AdminBudget;
