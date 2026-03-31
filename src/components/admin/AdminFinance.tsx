import React, { useState, useEffect } from 'react';
import {
    MdAdd, MdAttachMoney, MdShowChart, MdAccountBalanceWallet,
    MdMoreVert, MdDelete, MdEdit, MdPerson
} from 'react-icons/md';
import { financeApi, GivingType, Contribution, FinanceDashboardStats, MemberTitheSummary } from '../../api/finance';
import { memberApi, Member } from '../../api/members';
import './AdminViews.css';

const AdminFinance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'types'>('overview');

    // Data state
    const [stats, setStats] = useState<FinanceDashboardStats>({ total_offerings: 0, total_tithes: 0, total_pledges: 0 });
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [givingTypes, setGivingTypes] = useState<GivingType[]>([]);
    const [titheSummary, setTitheSummary] = useState<MemberTitheSummary[]>([]);
    const [members, setMembers] = useState<Member[]>([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

    // Modal states
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Form states
    const [contributionForm, setContributionForm] = useState({
        type_id: '',
        member_id: '',
        amount: '',
        date: new Date().toISOString().substring(0, 10),
        notes: ''
    });

    const [typeForm, setTypeForm] = useState({
        id: '', // Empty if new
        name: '',
        description: ''
    });

    const loadOverviewData = async () => {
        try {
            setLoading(true);
            const [fetchedStats, fetchedContribs, fetchedTypes, fetchedMembers] = await Promise.all([
                financeApi.getDashboardStats(currentMonth),
                financeApi.getContributions(50, 0),
                financeApi.getGivingTypes(),
                memberApi.getMembers()
            ]);
            setStats(fetchedStats);
            setContributions(fetchedContribs);
            setGivingTypes(fetchedTypes);
            setMembers(fetchedMembers);
        } catch (error) {
            console.error("Failed to load finance overview:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadTitheSummary = async () => {
        try {
            setLoading(true);
            const summary = await financeApi.getMemberTitheSummary(currentMonth);
            setTitheSummary(summary);
        } catch (error) {
            console.error("Failed to load tithe summary:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'overview' || activeTab === 'types') {
            loadOverviewData();
        } else if (activeTab === 'tracking') {
            loadTitheSummary();
            if (members.length === 0) {
                memberApi.getMembers().then(setMembers).catch(console.error);
            }
        }
    }, [activeTab, currentMonth]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount).replace('GHS', 'Ghc');
    };

    // --- Action Handlers ---

    const handleRecordContribution = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await financeApi.addContribution({
                type_id: contributionForm.type_id,
                member_id: contributionForm.member_id || undefined,
                amount: parseFloat(contributionForm.amount),
                date: contributionForm.date,
                notes: contributionForm.notes || undefined
            });
            setShowRecordModal(false);
            setContributionForm({
                type_id: '', member_id: '', amount: '',
                date: new Date().toISOString().substring(0, 10), notes: ''
            });
            loadOverviewData(); // Refresh UI
        } catch (error) {
            console.error("Failed to record contribution:", error);
            alert("Error recording contribution.");
        }
    };

    const handleDeleteContribution = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this contribution record?")) {
            try {
                await financeApi.deleteContribution(id);
                loadOverviewData();
            } catch (error) {
                console.error("Failed to delete contribution:", error);
            }
        }
    };

    const handleSaveGivingType = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (typeForm.id) {
                await financeApi.updateGivingType(typeForm.id, {
                    name: typeForm.name,
                    description: typeForm.description || undefined
                });
            } else {
                await financeApi.createGivingType({
                    name: typeForm.name,
                    description: typeForm.description || undefined
                });
            }
            setShowTypeModal(false);
            setTypeForm({ id: '', name: '', description: '' });
            loadOverviewData();
        } catch (error) {
            console.error("Failed to save giving type:", error);
        }
    };

    const handleDeleteGivingType = async (id: string, isSystem: boolean) => {
        if (isSystem) {
            alert("System giving types cannot be deleted.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this giving type? Note: It will fail if there are existing contributions attached to it.")) {
            try {
                await financeApi.deleteGivingType(id);
                loadOverviewData();
            } catch (error) {
                console.error("Failed to delete giving type:", error);
                alert("Failed to delete. Make sure there are no contributions using this type.");
            }
        }
    };

    const selectedType = givingTypes.find(t => t.id === contributionForm.type_id);
    const requiresMember = selectedType?.id === 'tithe' || selectedType?.id === 'pledge';

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Finance & Giving</h1>
                    <p>Track offerings, tithes, pledges, and manage giving types.</p>
                </div>
                <div className="admin-controls">
                    <input
                        type="month"
                        className="btn-outline-small"
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(e.target.value)}
                        style={{ padding: '0.45rem 1rem' }}
                    />
                    <button className="btn-primary" onClick={() => setShowRecordModal(true)}>
                        <MdAdd size={20} /> Record Income
                    </button>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="view-tabs">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tracking')}
                >
                    Member Tithes
                </button>
                <button
                    className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`}
                    onClick={() => setActiveTab('types')}
                >
                    Giving Types
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading finance data...</div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <>
                            <div className="members-grid" style={{ marginBottom: '2rem' }}>
                                <div className="member-card">
                                    <div className="member-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Offerings ({currentMonth})</h3>
                                            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-blue)' }}>{formatCurrency(stats.total_offerings)}</p>
                                        </div>
                                        <div className="table-avatar" style={{ background: 'var(--primary-blue-light)', color: 'var(--primary-blue)' }}>
                                            <MdAttachMoney size={24} />
                                        </div>
                                    </div>
                                </div>

                                <div className="member-card">
                                    <div className="member-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Tithes ({currentMonth})</h3>
                                            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-blue)' }}>{formatCurrency(stats.total_tithes)}</p>
                                        </div>
                                        <div className="table-avatar" style={{ background: 'var(--bg-lighter)', color: 'var(--primary-blue)' }}>
                                            <MdShowChart size={24} />
                                        </div>
                                    </div>
                                </div>

                                <div className="member-card">
                                    <div className="member-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Pledges ({currentMonth})</h3>
                                            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{formatCurrency(stats.total_pledges)}</p>
                                        </div>
                                        <div className="table-avatar" style={{ background: 'var(--bg-lighter)', color: 'var(--text-primary)' }}>
                                            <MdAccountBalanceWallet size={24} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="members-table-container">
                                <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Recent Transactions</h2>
                                </div>
                                <table className="members-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Member (If Any)</th>
                                            <th>Amount</th>
                                            <th>Notes</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contributions.length === 0 ? (
                                            <tr><td colSpan={6} className="empty-table">No recent transactions.</td></tr>
                                        ) : contributions.map((tx) => (
                                            <tr key={tx.id}>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{tx.date}</td>
                                                <td>
                                                    <span style={{
                                                        background: 'var(--bg-lighter)',
                                                        padding: '0.35rem 0.6rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: 'var(--text-primary)',
                                                        border: '1px solid var(--border-light)'
                                                    }}>
                                                        {tx.type_name}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: '600', color: tx.member_name ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                    {tx.member_name || 'General (Anonymous)'}
                                                </td>
                                                <td style={{ fontWeight: '700', color: 'var(--accent-green)' }}>{formatCurrency(tx.amount)}</td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {tx.notes || '-'}
                                                </td>
                                                <td style={{ position: 'relative' }}>
                                                    <button className="action-dot-btn" onClick={() => setActiveMenuId(activeMenuId === tx.id ? null : tx.id)}>
                                                        <MdMoreVert size={20} />
                                                    </button>
                                                    {activeMenuId === tx.id && (
                                                        <div className="dropdown-menu" style={{
                                                            position: 'absolute', right: '1.5rem', top: '100%', zIndex: 100,
                                                            background: 'var(--bg-modal)', border: '1px solid var(--border-light)',
                                                            borderRadius: '8px', padding: '0.5rem', boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                                                            minWidth: '150px'
                                                        }}>
                                                            <button
                                                                className="btn-text"
                                                                style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', width: '100%' }}
                                                                onClick={() => handleDeleteContribution(tx.id)}
                                                            >
                                                                <MdDelete size={16} /> Delete Record
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'tracking' && (
                        <div className="members-table-container">
                            <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Member Tithe Tracker ({currentMonth})</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                    Summary of total tithes paid by each registered member during this month.
                                </p>
                            </div>
                            <table className="members-table">
                                <thead>
                                    <tr>
                                        <th>Member Name</th>
                                        <th>Total Tithes Paid ({currentMonth})</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {titheSummary.length === 0 ? (
                                        <tr><td colSpan={3} className="empty-table">No tithes recorded for this month.</td></tr>
                                    ) : titheSummary.map((summary) => (
                                        <tr key={summary.member_id}>
                                            <td className="member-info-cell">
                                                <div className="table-avatar" style={{ background: 'var(--primary-blue-light)', color: 'var(--primary-blue)' }}>
                                                    <MdPerson size={20} />
                                                </div>
                                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{summary.member_name}</span>
                                            </td>
                                            <td style={{ fontWeight: '700', color: 'var(--accent-green)', fontSize: '1.1rem' }}>
                                                {formatCurrency(summary.total_amount)}
                                            </td>
                                            <td>
                                                <span className="status-badge status-active">Recorded</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'types' && (
                        <div className="members-table-container">
                            <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Giving Categories</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                        Manage different funds, appeals, and default giving categories.
                                    </p>
                                </div>
                                <button className="btn-outline-small" onClick={() => { setTypeForm({ id: '', name: '', description: '' }); setShowTypeModal(true); }}>
                                    <MdAdd size={20} /> New Category
                                </button>
                            </div>
                            <div className="members-grid" style={{ padding: '1.5rem' }}>
                                {givingTypes.map(type => (
                                    <div key={type.id} className="member-card" style={{ border: '1px solid var(--border-light)' }}>
                                        <div className="member-card-body">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>{type.name}</h3>
                                                    {type.is_system && <span className="status-badge status-info" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>System</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="action-dot-btn" onClick={() => { setTypeForm({ id: type.id, name: type.name, description: type.description || '' }); setShowTypeModal(true); }}>
                                                        <MdEdit size={16} />
                                                    </button>
                                                    {!type.is_system && (
                                                        <button className="action-dot-btn" style={{ color: 'var(--accent-red)' }} onClick={() => handleDeleteGivingType(type.id, type.is_system)}>
                                                            <MdDelete size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>{type.description || 'No description provided.'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            {showRecordModal && (
                <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Record Income</h2>
                        </div>
                        <form className="admin-form" onSubmit={handleRecordContribution}>
                            <div className="form-group">
                                <label>Giving Category</label>
                                <select className="form-input" required value={contributionForm.type_id} onChange={e => setContributionForm({ ...contributionForm, type_id: e.target.value })}>
                                    <option value="" disabled>Select a category...</option>
                                    {givingTypes.map(gt => (
                                        <option key={gt.id} value={gt.id}>{gt.name}</option>
                                    ))}
                                </select>
                            </div>

                            {requiresMember && (
                                <div className="form-group animate-fade-in">
                                    <label>Select Member (Required for {selectedType?.name})</label>
                                    <select className="form-input" required value={contributionForm.member_id} onChange={e => setContributionForm({ ...contributionForm, member_id: e.target.value })}>
                                        <option value="" disabled>Select a member...</option>
                                        {members.map(m => (
                                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {!requiresMember && (
                                <div className="form-group animate-fade-in">
                                    <label>Select Member (Optional for General Offerings)</label>
                                    <select className="form-input" value={contributionForm.member_id} onChange={e => setContributionForm({ ...contributionForm, member_id: e.target.value })}>
                                        <option value="">Anonymous / General Congregation</option>
                                        {members.map(m => (
                                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label>Amount (Ghc)</label>
                                    <input className="form-input" required type="number" step="0.01" min="0.01" placeholder="0.00" value={contributionForm.amount} onChange={e => setContributionForm({ ...contributionForm, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Date Received</label>
                                    <input className="form-input" required type="date" value={contributionForm.date} onChange={e => setContributionForm({ ...contributionForm, date: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Notes / Reference (Optional)</label>
                                <input className="form-input" placeholder="e.g. Check #1234, Weekly Offering" value={contributionForm.notes} onChange={e => setContributionForm({ ...contributionForm, notes: e.target.value })} />
                            </div>

                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn-text" onClick={() => setShowRecordModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Record Amount</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showTypeModal && (
                <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>{typeForm.id ? 'Edit Category' : 'Create Giving Category'}</h2>
                        </div>
                        <form className="admin-form" onSubmit={handleSaveGivingType}>
                            <div className="form-group">
                                <label>Category Name</label>
                                <input className="form-input" required placeholder="e.g. Youth Camp Appeal" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="form-input" rows={3} placeholder="Brief description of this fund..." value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}></textarea>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn-text" onClick={() => setShowTypeModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Category</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFinance;
