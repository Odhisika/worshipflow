import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdSearch, MdPhone, MdMail, MdTrackChanges, MdPersonAdd } from 'react-icons/md';
import AppDatePicker from '../../components/AppDatePicker';
import { visitorApi, Visitor, VisitorFollowup } from '../../api/visitors';
import { useDataRefresh } from '../../context/DataRefreshContext';
import ConfirmModal from './ConfirmModal';
import './AdminViews.css';

const AdminVisitors: React.FC = () => {
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showFollowup, setShowFollowup] = useState<string | null>(null);
    const [followups, setFollowups] = useState<VisitorFollowup[]>([]);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', phone: '', address: '', gender: '',
        age_group: '', visited_date: '', heard_from: '', prayer_need: '', interest: '',
    });

    const [followupForm, setFollowupForm] = useState({ followup_date: '', notes: '', assigned_to: '' });

    const fetchData = async () => {
        setLoading(true);
        try { setVisitors(await visitorApi.getVisitors()); } catch { toast.error('Failed to load visitors.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const filtered = visitors.filter(v =>
        `${v.first_name} ${v.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone?.includes(searchTerm)
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await visitorApi.createVisitor({
                ...form,
                email: form.email || undefined,
                phone: form.phone || undefined,
                address: form.address || undefined,
                gender: form.gender || undefined,
                age_group: form.age_group || undefined,
                heard_from: form.heard_from || undefined,
                prayer_need: form.prayer_need || undefined,
                interest: form.interest || undefined,
            });
            toast.success('Visitor recorded.');
            setShowModal(false);
            setForm({ first_name: '', last_name: '', email: '', phone: '', address: '', gender: '', age_group: '', visited_date: '', heard_from: '', prayer_need: '', interest: '' });
            triggerRefresh();
        } catch { toast.error('Failed to record visitor.'); }
    };

    const handleConvert = async (visitor: Visitor) => {
        try {
            const member = await (await import('../../api/members')).memberApi.createMember({
                first_name: visitor.first_name,
                last_name: visitor.last_name,
                email: visitor.email || undefined,
                phone: visitor.phone || undefined,
                address: visitor.address || undefined,
                gender: visitor.gender || undefined,
            });
            await visitorApi.updateVisitor(visitor.id, { status: 'converted', converted_member_id: member.id });
            toast.success(`${visitor.first_name} converted to member!`);
            triggerRefresh();
        } catch { toast.error('Failed to convert visitor.'); }
    };

    const loadFollowups = async (visitorId: string) => {
        try {
            const data = await visitorApi.getVisitorFollowups(visitorId);
            setFollowups(data);
            setShowFollowup(visitorId);
        } catch { toast.error('Failed to load follow-ups.'); }
    };

    const handleAddFollowup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showFollowup) return;
        try {
            await visitorApi.createVisitorFollowup({
                visitor_id: showFollowup,
                followup_date: followupForm.followup_date,
                notes: followupForm.notes || undefined,
                assigned_to: followupForm.assigned_to || undefined,
            });
            toast.success('Follow-up added.');
            setFollowupForm({ followup_date: '', notes: '', assigned_to: '' });
            loadFollowups(showFollowup);
            triggerRefresh();
        } catch { toast.error('Failed to add follow-up.'); }
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = { new: 'status-info', contacted: 'status-warning', converted: 'status-active', lost: '' };
        return <span className={`status-badge ${colors[status] || ''}`}>{status}</span>;
    };

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Visitor Tracking</h1><p>Track first-time visitors, follow-ups, and conversions.</p></div>
                <div className="admin-controls">
                    <div className="search-bar">
                        <MdSearch className="admin-search-icon" size={20} />
                        <input type="text" placeholder="Search visitors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Record Visitor</button>
                </div>
            </div>

            <div className="members-grid" style={{ marginBottom: '2rem' }}>
                <div className="member-card"><div className="member-card-body"><h3>Total Visitors</h3><p className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>{visitors.length}</p></div></div>
                <div className="member-card"><div className="member-card-body"><h3>New</h3><p className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--accent-blue)' }}>{visitors.filter(v => v.status === 'new').length}</p></div></div>
                <div className="member-card"><div className="member-card-body"><h3>Converted</h3><p className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--accent-green)' }}>{visitors.filter(v => v.status === 'converted').length}</p></div></div>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Visitor</th><th>Contact</th><th>Visited</th><th>Interest</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} className="empty-table">Loading...</td></tr> :
                        filtered.length === 0 ? <tr><td colSpan={6} className="empty-table">No visitors found.</td></tr> :
                        filtered.map(v => (
                            <tr key={v.id}>
                                <td>
                                    <div className="member-info-cell">
                                        <div className="table-avatar">{v.first_name[0]}{v.last_name[0]}</div>
                                        <div><div style={{ fontWeight: 600 }}>{v.first_name} {v.last_name}</div></div>
                                    </div>
                                </td>
                                <td><div className="member-contact">{v.email && <span><MdMail size={14} /> {v.email}</span>}{v.phone && <span><MdPhone size={14} /> {v.phone}</span>}</div></td>
                                <td>{new Date(v.visited_date).toLocaleDateString()}</td>
                                <td>{v.interest || '-'}</td>
                                <td>{statusBadge(v.status)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        <button className="btn-text" onClick={() => loadFollowups(v.id)}><MdTrackChanges /> Follow-up</button>
                                        {v.status !== 'converted' && <button className="btn-text" style={{ color: 'var(--accent-green)' }} onClick={() => handleConvert(v)}><MdPersonAdd /> Convert</button>}
                                        <button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(v.id)}><MdDelete /></button>
                                    </div>
                                    {showFollowup === v.id && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-lighter)', borderRadius: '8px' }}>
                                            <h4>Follow-ups</h4>
                                            {followups.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No follow-ups yet.</p> :
                                                followups.map(f => (
                                                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                                                        <div><strong>{new Date(f.followup_date).toLocaleDateString()}</strong> - {f.notes || 'No notes'}</div>
                                                        <span className={`status-badge ${f.status === 'completed' ? 'status-active' : 'status-warning'}`}>{f.status}</span>
                                                    </div>
                                                ))
                                            }
                                            <form onSubmit={handleAddFollowup} style={{ marginTop: '0.5rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <AppDatePicker value={followupForm.followup_date} onChange={d => setFollowupForm({...followupForm, followup_date: d})} placeholderText="Date" className="form-input" style={{ width: '140px' }} />
                                                <input placeholder="Notes" value={followupForm.notes} onChange={e => setFollowupForm({...followupForm, notes: e.target.value})} style={{ flex: 1 }} />
                                                <input placeholder="Assigned to" value={followupForm.assigned_to} onChange={e => setFollowupForm({...followupForm, assigned_to: e.target.value})} style={{ width: '150px' }} />
                                                <button type="submit" className="btn-primary" style={{ padding: '0.4rem 1rem' }}>Add</button>
                                            </form>
                                            <button className="btn-text" style={{ marginTop: '0.5rem' }} onClick={() => setShowFollowup(null)}>Close</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Record New Visitor</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-row">
                                <div className="form-group"><label>First Name *</label><input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
                                <div className="form-group"><label>Last Name *</label><input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Visit Date *</label><AppDatePicker value={form.visited_date} onChange={d => setForm({...form, visited_date: d})} placeholderText="Select date" className="form-input" /></div>
                                <div className="form-group"><label>Gender</label><select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Heard From</label><input value={form.heard_from} onChange={e => setForm({...form, heard_from: e.target.value})} placeholder="e.g. Friend, Social media" /></div>
                                <div className="form-group"><label>Interest</label><input value={form.interest} onChange={e => setForm({...form, interest: e.target.value})} placeholder="e.g. Join church, Bible study" /></div>
                            </div>
                            <div className="form-group"><label>Prayer Need</label><textarea rows={2} value={form.prayer_need} onChange={e => setForm({...form, prayer_need: e.target.value})} /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Delete Visitor" message="Remove this visitor record?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { visitorApi.deleteVisitor(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

export default AdminVisitors;
