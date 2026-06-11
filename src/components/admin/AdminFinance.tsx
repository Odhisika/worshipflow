import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    MdAdd, MdAttachMoney, MdShowChart, MdAccountBalanceWallet,
    MdMoreVert, MdDelete, MdEdit, MdPerson, MdFileDownload,
    MdReceipt, MdTrendingUp, MdCompareArrows
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AppDatePicker from '../../components/AppDatePicker';
import { saveFileWithDialog } from '../../api/export';
import { financeApi, GivingType, Contribution, FinanceDashboardStats, MemberTitheSummary, Pledge, MonthlyGivingTrend, YearComparison } from '../../api/finance';
import { memberApi, Member } from '../../api/members';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

const AdminFinance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'pledges' | 'types'>('overview');
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const [stats, setStats] = useState<FinanceDashboardStats>({ total_offerings: 0, total_tithes: 0, total_pledges: 0 });
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [givingTypes, setGivingTypes] = useState<GivingType[]>([]);
    const [titheSummary, setTitheSummary] = useState<MemberTitheSummary[]>([]);
    const [pledges, setPledges] = useState<Pledge[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [trends, setTrends] = useState<MonthlyGivingTrend[]>([]);
    const [yearComp, setYearComp] = useState<YearComparison | null>(null);

    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));

    // Date range filter
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modals
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editContribution, setEditContribution] = useState<Contribution | null>(null);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showPledgeModal, setShowPledgeModal] = useState(false);
    const [showPledgePaymentModal, setShowPledgePaymentModal] = useState(false);
    const [pledgeToPay, setPledgeToPay] = useState<Pledge | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [contributionForm, setContributionForm] = useState({
        type_id: '', member_id: '', amount: '',
        date: new Date().toISOString().substring(0, 10),
        payment_method: 'Cash', notes: ''
    });

    const [typeForm, setTypeForm] = useState({ id: '', name: '', description: '' });

    const [pledgeForm, setPledgeForm] = useState({
        member_id: '', category: '', amount_promised: '', due_date: '', notes: ''
    });

    const [pledgePaymentAmount, setPledgePaymentAmount] = useState('');

    const loadOverviewData = async (from?: string, to?: string) => {
        try {
            setLoading(true);
            const [fetchedStats, fetchedContribs, fetchedTypes, fetchedMembers, fetchedTrends, fetchedYearComp] = await Promise.all([
                financeApi.getDashboardStats(currentMonth),
                financeApi.getContributions(50, 0, from || undefined, to || undefined),
                financeApi.getGivingTypes(),
                memberApi.getMembers(),
                financeApi.getMonthlyGivingTrends(12),
                financeApi.getYearComparison(),
            ]);
            setStats(fetchedStats);
            setContributions(fetchedContribs);
            setGivingTypes(fetchedTypes);
            setMembers(fetchedMembers);
            setTrends(fetchedTrends);
            setYearComp(fetchedYearComp);
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

    const loadPledges = async () => {
        try {
            setLoading(true);
            const [p, m] = await Promise.all([
                financeApi.getPledges(),
                memberApi.getMembers()
            ]);
            setPledges(p);
            setMembers(m);
        } catch (error) {
            console.error("Failed to load pledges:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'overview' || activeTab === 'types') {
            if (dateFrom || dateTo) {
                loadOverviewData(dateFrom || undefined, dateTo || undefined);
            } else {
                loadOverviewData();
            }
        } else if (activeTab === 'tracking') {
            loadTitheSummary();
            if (members.length === 0) memberApi.getMembers().then(setMembers).catch(console.error);
        } else if (activeTab === 'pledges') {
            loadPledges();
        }
    }, [activeTab, currentMonth, refreshSignal]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount).replace('GHS', 'Ghc');
    };

    const handleDateFilter = () => {
        loadOverviewData(dateFrom || undefined, dateTo || undefined);
    };

    const clearDateFilter = () => {
        setDateFrom('');
        setDateTo('');
        loadOverviewData();
    };

    // --- Contributions ---
    const handleRecordContribution = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await financeApi.addContribution({
                type_id: contributionForm.type_id,
                member_id: contributionForm.member_id || undefined,
                amount: parseFloat(contributionForm.amount),
                date: contributionForm.date,
                payment_method: contributionForm.payment_method || undefined,
                notes: contributionForm.notes || undefined
            });
            setShowRecordModal(false);
            resetContributionForm();
            triggerRefresh();
            toast.success('Contribution recorded successfully.');
        } catch (error) {
            console.error("Failed to record contribution:", error);
            toast.error("Failed to record contribution.");
        }
    };

    const handleEditContribution = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editContribution) return;
        try {
            await financeApi.updateContribution(editContribution.id, {
                type_id: contributionForm.type_id || undefined,
                member_id: contributionForm.member_id || undefined,
                amount: contributionForm.amount ? parseFloat(contributionForm.amount) : undefined,
                date: contributionForm.date || undefined,
                payment_method: contributionForm.payment_method || undefined,
                notes: contributionForm.notes || undefined,
            });
            setShowEditModal(false);
            setEditContribution(null);
            resetContributionForm();
            triggerRefresh();
            toast.success('Contribution updated successfully.');
        } catch (error) {
            console.error("Failed to update contribution:", error);
            toast.error("Failed to update contribution.");
        }
    };

    const handleDeleteContribution = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this contribution record?")) {
            try {
                await financeApi.deleteContribution(id);
                toast.success('Contribution record deleted.');
                triggerRefresh();
            } catch (error) {
                console.error("Failed to delete contribution:", error);
                toast.error("Failed to delete contribution.");
            }
        }
    };

    const openEditModal = (tx: Contribution) => {
        setEditContribution(tx);
        setContributionForm({
            type_id: tx.type_id,
            member_id: tx.member_id || '',
            amount: tx.amount.toString(),
            date: tx.date,
            payment_method: tx.payment_method || 'Cash',
            notes: tx.notes || '',
        });
        setShowEditModal(true);
        setActiveMenuId(null);
    };

    const resetContributionForm = () => {
        setContributionForm({
            type_id: '', member_id: '', amount: '',
            date: new Date().toISOString().substring(0, 10),
            payment_method: 'Cash', notes: ''
        });
    };

    // --- Pledges ---
    const handleCreatePledge = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await financeApi.createPledge({
                member_id: pledgeForm.member_id,
                category: pledgeForm.category,
                amount_promised: parseFloat(pledgeForm.amount_promised),
                due_date: pledgeForm.due_date || undefined,
                notes: pledgeForm.notes || undefined,
            });
            setShowPledgeModal(false);
            setPledgeForm({ member_id: '', category: '', amount_promised: '', due_date: '', notes: '' });
            triggerRefresh();
            toast.success('Pledge created successfully.');
        } catch (error) {
            console.error("Failed to create pledge:", error);
            toast.error("Failed to create pledge.");
        }
    };

    const handleAddPledgePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pledgeToPay) return;
        try {
            await financeApi.addPledgePayment(pledgeToPay.id, parseFloat(pledgePaymentAmount));
            setShowPledgePaymentModal(false);
            setPledgeToPay(null);
            setPledgePaymentAmount('');
            triggerRefresh();
            toast.success('Pledge payment recorded successfully.');
        } catch (error) {
            console.error("Failed to add pledge payment:", error);
            toast.error("Failed to record pledge payment.");
        }
    };

    const handleDeletePledge = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this pledge?")) {
            try {
                await financeApi.deletePledge(id);
                toast.success('Pledge deleted.');
                triggerRefresh();
            } catch (error) {
                console.error("Failed to delete pledge:", error);
                toast.error("Failed to delete pledge.");
            }
        }
    };

    // --- Giving Types ---
    const handleSaveGivingType = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (typeForm.id) {
                await financeApi.updateGivingType(typeForm.id, { name: typeForm.name, description: typeForm.description || undefined });
            } else {
                await financeApi.createGivingType({ name: typeForm.name, description: typeForm.description || undefined });
            }
            setShowTypeModal(false);
            setTypeForm({ id: '', name: '', description: '' });
            triggerRefresh();
            toast.success('Giving type saved successfully.');
        } catch (error) {
            console.error("Failed to save giving type:", error);
            toast.error("Failed to save giving type.");
        }
    };

    const handleDeleteGivingType = async (id: string, isSystem: boolean) => {
        if (isSystem) { toast.error("System giving types cannot be deleted."); return; }
        if (window.confirm("Are you sure you want to delete this giving type?")) {
            try {
                await financeApi.deleteGivingType(id);
                triggerRefresh();
                toast.success('Giving type deleted.');
            } catch (error) {
                console.error("Failed to delete giving type:", error);
                toast.error("Cannot delete. There are contributions using this giving type.");
            }
        }
    };

    const selectedType = givingTypes.find(t => t.id === contributionForm.type_id);
    const requiresMember = selectedType?.id === 'tithe' || selectedType?.id === 'pledge';

    // --- Exports ---
    const handleExportExcel = async () => {
        if (contributions.length === 0) {
            toast.error('No contributions to export.');
            return;
        }
        try {
            const data = contributions.map(c => ({
                Date: c.date,
                Category: c.type_name || '',
                Member: c.member_name || 'General',
                Amount: c.amount,
                'Payment Method': c.payment_method || 'Cash',
                Notes: c.notes || '',
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Contributions');
            const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            await saveFileWithDialog('contributions.xlsx', blob);
            toast.success('Contributions exported to Excel.');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export contributions.');
        }
    };

    const handleExportPDF = async () => {
        if (contributions.length === 0) {
            toast.error('No contributions to export.');
            return;
        }
        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Finance Report', 14, 20);
            doc.setFontSize(10);
            doc.text(`Period: ${currentMonth}`, 14, 28);
            const tableData = contributions.map(c => [
                c.date,
                c.type_name || '',
                c.member_name || 'General',
                `${c.payment_method || 'Cash'}`,
                `Ghc ${c.amount.toFixed(2)}`,
            ]);
            autoTable(doc, {
                head: [['Date', 'Category', 'Member', 'Method', 'Amount']],
                body: tableData,
                startY: 35,
                styles: { fontSize: 7 },
                headStyles: { fillColor: [26, 115, 232] },
            });
            const blob = doc.output('blob');
            await saveFileWithDialog('contributions.pdf', blob);
            toast.success('Contributions exported to PDF.');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export contributions.');
        }
    };

    const handleExportStatement = async (member: MemberTitheSummary) => {
        try {
            const contribs = await financeApi.getMemberStatement(member.member_id, currentMonth.substring(0, 4));
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('Giving Statement', 14, 20);
            doc.setFontSize(11);
            doc.text(`Member: ${member.member_name}`, 14, 30);
            doc.text(`Year: ${currentMonth.substring(0, 4)}`, 14, 37);
            doc.setFontSize(9);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 44);
            const tableData = contribs.map(c => [
                c.date,
                c.type_name || '',
                `Ghc ${c.amount.toFixed(2)}`,
                c.payment_method || 'Cash',
            ]);
            autoTable(doc, {
                head: [['Date', 'Category', 'Amount', 'Method']],
                body: tableData,
                startY: 50,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [26, 115, 232] },
                foot: [[{ content: 'Total', colSpan: 2 }, `Ghc ${contribs.reduce((s, c) => s + c.amount, 0).toFixed(2)}`, '']],
                footStyles: { fontSize: 8, fontStyle: 'bold' },
            });
            const blob = doc.output('blob');
            await saveFileWithDialog(`${member.member_name.replace(/\s+/g, '_')}_statement.pdf`, blob);
            toast.success(`Statement for ${member.member_name} generated.`);
        } catch (error) {
            console.error("Failed to generate statement:", error);
            toast.error("Failed to generate statement.");
        }
    };

    // --- Chart ---
    const maxTrend = Math.max(...trends.map(t => Math.max(t.tithes, t.offerings, t.pledges)), 1);
    const barColors = ['var(--accent-green)', 'var(--primary-blue)', 'var(--accent-orange)'];

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Finance & Giving</h1>
                    <p>Track offerings, tithes, pledges, and manage giving categories.</p>
                </div>
                <div className="admin-controls">
                    <input type="month" className="btn-outline-small"
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(e.target.value)}
                        style={{ padding: '0.45rem 1rem' }} />
                    <button className="btn-primary" onClick={() => { resetContributionForm(); setShowRecordModal(true); }}>
                        <MdAdd size={20} /> Record Income
                    </button>
                </div>
            </div>

            <div className="view-tabs">
                {(['overview', 'tracking', 'pledges', 'types'] as const).map(tab => (
                    <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}>
                        {tab === 'overview' ? 'Overview' : tab === 'tracking' ? 'Member Tithes' : tab === 'pledges' ? 'Pledges' : 'Giving Types'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading finance data...</div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <>
                            <div className="members-grid" style={{ marginBottom: '1.5rem' }}>
                                <div className="member-card">
                                    <div className="member-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Offerings ({currentMonth})</h3>
                                            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-blue)' }}>{formatCurrency(stats.total_offerings)}</p>
                                        </div>
                                        <div className="table-avatar" style={{ background: 'var(--primary-blue-light)', color: 'var(--primary-blue)' }}><MdAttachMoney size={24} /></div>
                                    </div>
                                </div>
                                <div className="member-card">
                                    <div className="member-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Tithes ({currentMonth})</h3>
                                            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-blue)' }}>{formatCurrency(stats.total_tithes)}</p>
                                        </div>
                                        <div className="table-avatar" style={{ background: 'var(--bg-lighter)', color: 'var(--primary-blue)' }}><MdShowChart size={24} /></div>
                                    </div>
                                </div>
                                <div className="member-card">
                                    <div className="member-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Pledges ({currentMonth})</h3>
                                            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{formatCurrency(stats.total_pledges)}</p>
                                        </div>
                                        <div className="table-avatar" style={{ background: 'var(--bg-lighter)', color: 'var(--text-primary)' }}><MdAccountBalanceWallet size={24} /></div>
                                    </div>
                                </div>
                                {yearComp && (
                                    <div className="member-card">
                                        <div className="member-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                                    <MdCompareArrows size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                    {yearComp.current_year} vs {yearComp.previous_year}
                                                </h3>
                                                <p className="stat-value" style={{ fontSize: '1.5rem', fontWeight: '800', color: yearComp.change_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                    {yearComp.change_pct >= 0 ? '+' : ''}{yearComp.change_pct.toFixed(1)}%
                                                </p>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                    {formatCurrency(yearComp.current_total)} vs {formatCurrency(yearComp.previous_total)}
                                                </p>
                                            </div>
                                            <div className="table-avatar" style={{ background: 'var(--bg-lighter)', color: 'var(--accent-green)' }}><MdTrendingUp size={24} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Giving Trends Chart */}
                            {trends.length > 0 && (
                                <div className="members-table-container" style={{ marginBottom: '1.5rem' }}>
                                    <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Giving Trends (12 Months)</h2>
                                    </div>
                                    <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'flex-end', minHeight: '160px', minWidth: '400px' }}>
                                            {trends.map((t, i) => {
                                                const hTithes = (t.tithes / maxTrend) * 100;
                                                const hOfferings = (t.offerings / maxTrend) * 100;
                                                const hPledges = (t.pledges / maxTrend) * 100;
                                                return (
                                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        <div title={`Tithes: ${formatCurrency(t.tithes)}`} style={{ width: '100%', height: `${Math.max(hTithes, 2)}%`, background: barColors[0], borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                                                        <div title={`Offerings: ${formatCurrency(t.offerings)}`} style={{ width: '100%', height: `${Math.max(hOfferings, 2)}%`, background: barColors[1], borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                                                        <div title={`Pledges: ${formatCurrency(t.pledges)}`} style={{ width: '100%', height: `${Math.max(hPledges, 2)}%`, background: barColors[2], borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px', writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>{t.month}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: barColors[0], borderRadius: 2, marginRight: 4 }} /> Tithes</span>
                                            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: barColors[1], borderRadius: 2, marginRight: 4 }} /> Offerings</span>
                                            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: barColors[2], borderRadius: 2, marginRight: 4 }} /> Pledges</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Date Range + Export */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filter by Date:</label>
                                    <AppDatePicker value={dateFrom} onChange={setDateFrom}
                                        placeholderText="From date" className="form-input"
                                        style={{ width: '160px' }} />
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>to</span>
                                    <AppDatePicker value={dateTo} onChange={setDateTo}
                                        placeholderText="To date" className="form-input"
                                        style={{ width: '160px' }} />
                                    <button className="btn-primary-small" onClick={handleDateFilter}>Apply</button>
                                    {(dateFrom || dateTo) && (
                                        <button className="btn-text" onClick={clearDateFilter} style={{ fontSize: '0.8rem' }}>Clear</button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button className="btn-outline-small" onClick={handleExportExcel}><MdFileDownload size={16} /> Excel</button>
                                    <button className="btn-outline-small" onClick={handleExportPDF}><MdFileDownload size={16} /> PDF</button>
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
                                            <th>Member</th>
                                            <th>Method</th>
                                            <th>Amount</th>
                                            <th>Notes</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contributions.length === 0 ? (
                                            <tr><td colSpan={7} className="empty-table">No transactions found.</td></tr>
                                        ) : contributions.map((tx) => (
                                            <tr key={tx.id}>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{tx.date}</td>
                                                <td>
                                                    <span style={{
                                                        background: 'var(--bg-lighter)', padding: '0.3rem 0.6rem',
                                                        borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                                                        color: 'var(--text-primary)', border: '1px solid var(--border-light)'
                                                    }}>{tx.type_name}</span>
                                                </td>
                                                <td style={{ fontWeight: '600', color: tx.member_name ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                    {tx.member_name || 'General (Anonymous)'}
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        {tx.payment_method || 'Cash'}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: '700', color: 'var(--accent-green)' }}>{formatCurrency(tx.amount)}</td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                                            <button className="btn-text" style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                                                                onClick={() => openEditModal(tx)}>
                                                                <MdEdit size={16} /> Edit
                                                            </button>
                                                            <button className="btn-text" style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', width: '100%' }}
                                                                onClick={() => handleDeleteContribution(tx.id)}>
                                                                <MdDelete size={16} /> Delete
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
                                    Summary of total tithes paid by each registered member.
                                </p>
                            </div>
                            <table className="members-table">
                                <thead>
                                    <tr>
                                        <th>Member Name</th>
                                        <th>Total Tithes Paid</th>
                                        <th>Status</th>
                                        <th>Statement</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {titheSummary.length === 0 ? (
                                        <tr><td colSpan={4} className="empty-table">No tithes recorded for this month.</td></tr>
                                    ) : titheSummary.map((summary) => (
                                        <tr key={summary.member_id}>
                                            <td className="member-info-cell">
                                                <div className="table-avatar" style={{ background: 'var(--primary-blue-light)', color: 'var(--primary-blue)' }}><MdPerson size={20} /></div>
                                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{summary.member_name}</span>
                                            </td>
                                            <td style={{ fontWeight: '700', color: 'var(--accent-green)', fontSize: '1.1rem' }}>
                                                {formatCurrency(summary.total_amount)}
                                            </td>
                                            <td><span className="status-badge status-active">Recorded</span></td>
                                            <td>
                                                <button className="btn-outline-small" onClick={() => handleExportStatement(summary)}
                                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                                                    <MdReceipt size={14} /> Get Statement
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'pledges' && (
                        <div className="members-table-container">
                            <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Pledge Management</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                        Track committed giving and follow up on pledges.
                                    </p>
                                </div>
                                <button className="btn-outline-small" onClick={() => {
                                    setPledgeForm({ member_id: '', category: '', amount_promised: '', due_date: '', notes: '' });
                                    setShowPledgeModal(true);
                                }}>
                                    <MdAdd size={20} /> New Pledge
                                </button>
                            </div>
                            <table className="members-table">
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Category</th>
                                        <th>Promised</th>
                                        <th>Paid</th>
                                        <th>Balance</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pledges.length === 0 ? (
                                        <tr><td colSpan={8} className="empty-table">No pledges recorded yet.</td></tr>
                                    ) : pledges.map((p) => {
                                        const balance = p.amount_promised - p.amount_paid;
                                        const statusColor = p.status === 'fulfilled' ? 'var(--accent-green)' :
                                            p.status === 'partial' ? 'var(--accent-orange)' : 'var(--text-secondary)';
                                        return (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.member_name || 'Unknown'}</td>
                                                <td><span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.75rem' }}>{p.category}</span></td>
                                                <td style={{ fontWeight: '600' }}>{formatCurrency(p.amount_promised)}</td>
                                                <td style={{ fontWeight: '600', color: 'var(--accent-green)' }}>{formatCurrency(p.amount_paid)}</td>
                                                <td style={{ fontWeight: '600', color: balance > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                                                    {formatCurrency(balance)}
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{p.due_date || 'N/A'}</td>
                                                <td><span className="status-badge" style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>{p.status}</span></td>
                                                <td style={{ position: 'relative' }}>
                                                    <button className="action-dot-btn" onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}>
                                                        <MdMoreVert size={20} />
                                                    </button>
                                                    {activeMenuId === p.id && (
                                                        <div className="dropdown-menu" style={{
                                                            position: 'absolute', right: '1.5rem', top: '100%', zIndex: 100,
                                                            background: 'var(--bg-modal)', border: '1px solid var(--border-light)',
                                                            borderRadius: '8px', padding: '0.5rem', boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                                                            minWidth: '160px'
                                                        }}>
                                                            <button className="btn-text" style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', color: 'var(--accent-green)' }}
                                                                onClick={() => { setPledgeToPay(p); setPledgePaymentAmount(''); setShowPledgePaymentModal(true); setActiveMenuId(null); }}>
                                                                <MdAttachMoney size={16} /> Record Payment
                                                            </button>
                                                            <button className="btn-text" style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', width: '100%' }}
                                                                onClick={() => handleDeletePledge(p.id)}>
                                                                <MdDelete size={16} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'types' && (
                        <div className="members-table-container">
                            <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Giving Categories</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Manage different funds, appeals, and default giving categories.</p>
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

            {/* Record Income Modal */}
            {showRecordModal && (
                <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header"><h2>Record Income</h2></div>
                        <form className="admin-form" onSubmit={handleRecordContribution}>
                            <div className="form-group">
                                <label>Giving Category</label>
                                <select className="form-input" required value={contributionForm.type_id}
                                    onChange={e => { setContributionForm({ ...contributionForm, type_id: e.target.value, member_id: '' }); }}>
                                    <option value="" disabled>Select a category...</option>
                                    {givingTypes.map(gt => <option key={gt.id} value={gt.id}>{gt.name}</option>)}
                                </select>
                            </div>
                            {requiresMember ? (
                                <div className="form-group animate-fade-in">
                                    <label>Select Member (Required for {selectedType?.name})</label>
                                    <select className="form-input" required value={contributionForm.member_id}
                                        onChange={e => setContributionForm({ ...contributionForm, member_id: e.target.value })}>
                                        <option value="" disabled>Select a member...</option>
                                        {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="form-group animate-fade-in">
                                    <label>Select Member (Optional)</label>
                                    <select className="form-input" value={contributionForm.member_id}
                                        onChange={e => setContributionForm({ ...contributionForm, member_id: e.target.value })}>
                                        <option value="">Anonymous / General Congregation</option>
                                        {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label>Amount (Ghc)</label>
                                    <input className="form-input" required type="number" step="0.01" min="0.01" placeholder="0.00"
                                        value={contributionForm.amount} onChange={e => setContributionForm({ ...contributionForm, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Date Received</label>
                                    <AppDatePicker value={contributionForm.date}
                                        onChange={(d) => setContributionForm({ ...contributionForm, date: d })}
                                        required className="form-input" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Payment Method</label>
                                <select className="form-input" value={contributionForm.payment_method}
                                    onChange={e => setContributionForm({ ...contributionForm, payment_method: e.target.value })}>
                                    <option value="Cash">Cash</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Check">Check</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card">Card</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Notes / Reference</label>
                                <input className="form-input" placeholder="e.g. Check #1234, Weekly Offering"
                                    value={contributionForm.notes} onChange={e => setContributionForm({ ...contributionForm, notes: e.target.value })} />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn-text" onClick={() => setShowRecordModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Record Amount</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Contribution Modal */}
            {showEditModal && editContribution && (
                <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditContribution(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header"><h2>Edit Contribution</h2></div>
                        <form className="admin-form" onSubmit={handleEditContribution}>
                            <div className="form-group">
                                <label>Giving Category</label>
                                <select className="form-input" value={contributionForm.type_id}
                                    onChange={e => setContributionForm({ ...contributionForm, type_id: e.target.value })}>
                                    {givingTypes.map(gt => <option key={gt.id} value={gt.id}>{gt.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Select Member</label>
                                <select className="form-input" value={contributionForm.member_id}
                                    onChange={e => setContributionForm({ ...contributionForm, member_id: e.target.value })}>
                                    <option value="">Anonymous / General Congregation</option>
                                    {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label>Amount (Ghc)</label>
                                    <input className="form-input" required type="number" step="0.01" min="0.01"
                                        value={contributionForm.amount} onChange={e => setContributionForm({ ...contributionForm, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <AppDatePicker value={contributionForm.date}
                                        onChange={(d) => setContributionForm({ ...contributionForm, date: d })}
                                        required className="form-input" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Payment Method</label>
                                <select className="form-input" value={contributionForm.payment_method}
                                    onChange={e => setContributionForm({ ...contributionForm, payment_method: e.target.value })}>
                                    <option value="Cash">Cash</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Check">Check</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card">Card</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <input className="form-input" value={contributionForm.notes}
                                    onChange={e => setContributionForm({ ...contributionForm, notes: e.target.value })} />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn-text" onClick={() => { setShowEditModal(false); setEditContribution(null); }}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pledge Modal */}
            {showPledgeModal && (
                <div className="modal-overlay" onClick={() => setShowPledgeModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header"><h2>New Pledge</h2></div>
                        <form className="admin-form" onSubmit={handleCreatePledge}>
                            <div className="form-group">
                                <label>Member</label>
                                <select className="form-input" required value={pledgeForm.member_id}
                                    onChange={e => setPledgeForm({ ...pledgeForm, member_id: e.target.value })}>
                                    <option value="" disabled>Select a member...</option>
                                    {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <input className="form-input" required placeholder="e.g. Building Fund, Missions"
                                    value={pledgeForm.category} onChange={e => setPledgeForm({ ...pledgeForm, category: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label>Amount Promised (Ghc)</label>
                                    <input className="form-input" required type="number" step="0.01" min="0.01" placeholder="0.00"
                                        value={pledgeForm.amount_promised} onChange={e => setPledgeForm({ ...pledgeForm, amount_promised: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Due Date (Optional)</label>
                                    <AppDatePicker value={pledgeForm.due_date}
                                        onChange={(d) => setPledgeForm({ ...pledgeForm, due_date: d })}
                                        placeholderText="Select due date" className="form-input" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <input className="form-input" placeholder="e.g. Monthly commitment"
                                    value={pledgeForm.notes} onChange={e => setPledgeForm({ ...pledgeForm, notes: e.target.value })} />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn-text" onClick={() => setShowPledgeModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create Pledge</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pledge Payment Modal */}
            {showPledgePaymentModal && pledgeToPay && (
                <div className="modal-overlay" onClick={() => { setShowPledgePaymentModal(false); setPledgeToPay(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2>Record Pledge Payment</h2>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            {pledgeToPay.member_name} — {pledgeToPay.category}<br />
                            Promised: {formatCurrency(pledgeToPay.amount_promised)} |
                            Paid: {formatCurrency(pledgeToPay.amount_paid)} |
                            Balance: {formatCurrency(pledgeToPay.amount_promised - pledgeToPay.amount_paid)}
                        </p>
                        <form onSubmit={handleAddPledgePayment}>
                            <div className="form-group">
                                <label>Payment Amount (Ghc)</label>
                                <input className="form-input" required type="number" step="0.01" min="0.01" placeholder="0.00"
                                    value={pledgePaymentAmount} onChange={e => setPledgePaymentAmount(e.target.value)} />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn-text" onClick={() => { setShowPledgePaymentModal(false); setPledgeToPay(null); }}>Cancel</button>
                                <button type="submit" className="btn-primary">Record Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Giving Type Modal */}
            {showTypeModal && (
                <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header"><h2>{typeForm.id ? 'Edit Category' : 'Create Giving Category'}</h2></div>
                        <form className="admin-form" onSubmit={handleSaveGivingType}>
                            <div className="form-group">
                                <label>Category Name</label>
                                <input className="form-input" required placeholder="e.g. Youth Camp Appeal" value={typeForm.name}
                                    onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="form-input" rows={3} placeholder="Brief description of this fund..."
                                    value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} />
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
