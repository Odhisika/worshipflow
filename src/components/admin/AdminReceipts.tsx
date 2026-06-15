import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdReceipt, MdSearch, MdDownload } from 'react-icons/md';
import { receiptApi, Receipt } from '../../api/receipts';
import { financeApi, Contribution } from '../../api/finance';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

const AdminReceipts: React.FC = () => {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchMember, setSearchMember] = useState('');
    const [selectedContributionId, setSelectedContributionId] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [r, c] = await Promise.all([
                receiptApi.getReceipts(searchMember || undefined),
                financeApi.getContributions(100, 0),
            ]);
            setReceipts(r); setContributions(c);
        } catch { toast.error('Failed to load data.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleGenerate = async () => {
        if (!selectedContributionId) { toast.error('Select a contribution first.'); return; }
        try {
            await receiptApi.generateReceipt({ contribution_id: selectedContributionId });
            toast.success('Receipt generated.');
            setSelectedContributionId(null);
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    const filteredContributions = contributions.filter(c =>
        !searchMember || (c.member_name && c.member_name.toLowerCase().includes(searchMember.toLowerCase()))
    );

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Contribution Receipts</h1><p>Generate and manage contribution receipts.</p></div>
                <button className="btn-primary" onClick={handleGenerate} disabled={!selectedContributionId}><MdReceipt /> Generate Receipt</button>
            </div>

            <div className="admin-controls" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
                    <MdSearch className="admin-search-icon" /><input placeholder="Search member..." value={searchMember} onChange={e => { setSearchMember(e.target.value); fetchData(); }} />
                </div>
            </div>

            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                    <h3>Contributions (select to generate receipt)</h3>
                    <div className="members-table-container">
                        <table className="members-table">
                            <thead><tr><th style={{ width: '40px' }}></th><th>Member</th><th>Amount</th><th>Date</th><th>Type</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={5} className="empty-table">Loading...</td></tr> :
                                filteredContributions.map(c => (
                                    <tr key={c.id} className={selectedContributionId === c.id ? 'selected-row' : ''} onClick={() => setSelectedContributionId(c.id)} style={{ cursor: 'pointer' }}>
                                        <td><input type="radio" name="sel" checked={selectedContributionId === c.id} onChange={() => setSelectedContributionId(c.id)} style={{ width: 'auto' }} /></td>
                                        <td>{c.member_name || 'N/A'}</td>
                                        <td style={{ fontWeight: 600 }}>Ghc {c.amount.toFixed(2)}</td>
                                        <td>{new Date(c.date).toLocaleDateString()}</td>
                                        <td><span className="status-badge status-info">{c.type_name || '-'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h3>Generated Receipts</h3>
                    <div className="members-table-container">
                        <table className="members-table">
                            <thead><tr><th>Receipt No.</th><th>Amount</th><th>Date</th><th>Type</th><th>Actions</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={5} className="empty-table">Loading...</td></tr> :
                                receipts.length === 0 ? <tr><td colSpan={5} className="empty-table">No receipts yet.</td></tr> :
                                receipts.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{r.receipt_number}</td>
                                        <td style={{ fontWeight: 600 }}>Ghc {r.amount.toFixed(2)}</td>
                                        <td>{new Date(r.date).toLocaleDateString()}</td>
                                        <td><span className="status-badge status-info">{r.receipt_type}</span></td>
                                        <td>
                                            <button className="btn-text" title="Download (stub)"><MdDownload /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminReceipts;
