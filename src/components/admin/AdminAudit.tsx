import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdRefresh, MdSearch, MdDeleteSweep } from 'react-icons/md';
import AppDatePicker from '../../components/AppDatePicker';
import { auditApi, AuditLog } from '../../api/audit';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

const AdminAudit: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [confirmCleanup, setConfirmCleanup] = useState(false);
    const [cleanupBefore, setCleanupBefore] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10);
    });
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const fetchData = async () => {
        setLoading(true);
        try {
            setLogs(await auditApi.getAuditLogs(1000, filterEntity || undefined));
        } catch { toast.error('Failed to load audit logs.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleCleanup = async () => {
        try {
            await auditApi.clearAuditLogs(cleanupBefore);
            toast.success('Old log entries removed.');
            setConfirmCleanup(false);
            triggerRefresh();
        } catch { toast.error('Cleanup failed.'); }
    };

    const filtered = logs.filter(l => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.entity_type.toLowerCase().includes(search.toLowerCase()) || l.old_values?.toLowerCase().includes(search.toLowerCase()) || l.new_values?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Audit Log</h1><p>Track all changes made in the system.</p></div>
                <div className="admin-controls">
                    <button className="btn-outline-small" onClick={fetchData}><MdRefresh /> Refresh</button>
                    <button className="btn-outline-small" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => setConfirmCleanup(true)}><MdDeleteSweep /> Cleanup</button>
                </div>
            </div>

            <div className="admin-controls" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
                    <MdSearch /><input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} style={{ width: '150px' }}>
                    <option value="">All entities</option>
                    <option value="member">Member</option>
                    <option value="event">Event</option>
                    <option value="contribution">Contribution</option>
                    <option value="visitor">Visitor</option>
                    <option value="announcement">Announcement</option>
                    <option value="venue">Venue</option>
                    <option value="budget">Budget</option>
                    <option value="expense">Expense</option>
                    <option value="user">User</option>
                </select>
                <button className="btn-outline-small" onClick={fetchData}>Filter</button>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Details</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={5} className="empty-table">Loading...</td></tr> :
                        filtered.length === 0 ? <tr><td colSpan={5} className="empty-table">No log entries found.</td></tr> :
                        filtered.map(l => (
                            <tr key={l.id}>
                                <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString()}</td>
                                <td><span className={`status-badge ${l.action === 'create' ? 'status-active' : l.action === 'delete' ? '' : l.action === 'update' ? 'status-warning' : 'status-info'}`}>{l.action}</span></td>
                                <td>{l.entity_type}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{l.entity_id ? l.entity_id.slice(0, 8) + '...' : '-'}</td>
                                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.old_values || l.new_values || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {confirmCleanup && (
                <div className="modal-overlay" onClick={() => setConfirmCleanup(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <h2 style={{ color: 'var(--accent-red)' }}>Cleanup Audit Logs</h2>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>Remove all logs older than the selected date. This cannot be undone.</p>
                        <div className="form-group"><label>Remove logs before:</label><AppDatePicker value={cleanupBefore} onChange={setCleanupBefore} className="form-input" /></div>
                        <div className="modal-actions" style={{ marginTop: '1rem' }}>
                            <button className="btn-outline-small" onClick={() => setConfirmCleanup(false)}>Cancel</button>
                            <button className="btn-primary-small" style={{ background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }} onClick={handleCleanup}>Cleanup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAudit;
