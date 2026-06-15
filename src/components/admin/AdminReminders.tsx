import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdNotifications, MdRefresh } from 'react-icons/md';
import AppDatePicker from '../../components/AppDatePicker';
import { reminderApi, Reminder, UpcomingBirthday, UpcomingAnniversary } from '../../api/reminders';
import { useDataRefresh } from '../../context/DataRefreshContext';
import ConfirmModal from './ConfirmModal';
import './AdminViews.css';

type TabType = 'manual' | 'auto';

const AdminReminders: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('manual');

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Reminders & Notifications</h1><p>Create reminders and view upcoming birthdays/anniversaries.</p></div>
            </div>
            <div className="tab-bar">
                <button className={activeTab === 'manual' ? 'tab-active' : ''} onClick={() => setActiveTab('manual')}><MdNotifications /> Manual Reminders</button>
                <button className={activeTab === 'auto' ? 'tab-active' : ''} onClick={() => setActiveTab('auto')}><MdRefresh /> Birthdays & Anniversaries</button>
            </div>
            {activeTab === 'manual' ? <ManualReminders /> : <AutoReminders />}
        </div>
    );
};

const ManualReminders: React.FC = () => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [form, setForm] = useState({ reminder_type: 'one-time', title: '', description: '', reference_type: '', reference_id: '', scheduled_date: '' });

    const fetchData = async () => {
        setLoading(true);
        try { setReminders(await reminderApi.getReminders()); }
        catch { toast.error('Failed to load reminders.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await reminderApi.createReminder(form.reminder_type, form.title, form.description || undefined, form.reference_type || undefined, form.reference_id || undefined, form.scheduled_date || undefined);
            toast.success('Reminder created.');
            setShowModal(false);
            setForm({ reminder_type: 'one-time', title: '', description: '', reference_type: '', reference_id: '', scheduled_date: '' });
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    return (
        <div>
            <div className="admin-controls" style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> New Reminder</button>
            </div>
            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Title</th><th>Scheduled</th><th>Type</th><th>Sent</th><th>Reference</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} className="empty-table">Loading...</td></tr> :
                        reminders.length === 0 ? <tr><td colSpan={6} className="empty-table">No reminders.</td></tr> :
                        reminders.map(r => (
                            <tr key={r.id} style={r.is_sent ? { opacity: 0.5 } : {}}>
                                <td style={{ fontWeight: 600 }}><MdNotifications style={{ marginRight: '8px' }} />{r.title}</td>
                                <td>{new Date(r.scheduled_date).toLocaleString()}</td>
                                <td><span className="status-badge status-info">{r.reminder_type}</span></td>
                                <td>{r.is_sent ? <span className="status-badge">Yes</span> : <span className="status-badge status-active">Pending</span>}</td>
                                <td style={{ fontSize: '0.85rem' }}>{r.reference_type ? `${r.reference_type}:${r.reference_id?.slice(0, 8)}` : '-'}</td>
                                <td><button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(r.id)}><MdDelete /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>New Reminder</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label>Title *</label><input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
                            <div className="form-group"><label>Description</label><textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Scheduled Date</label><AppDatePicker value={form.scheduled_date} onChange={d => setForm({...form, scheduled_date: d})} placeholderText="Date" className="form-input" /></div>
                                <div className="form-group"><label>Type</label><select value={form.reminder_type} onChange={e => setForm({...form, reminder_type: e.target.value})}><option value="one-time">One-time</option><option value="recurring">Recurring</option><option value="follow-up">Follow-up</option></select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Reference Type</label><input value={form.reference_type} onChange={e => setForm({...form, reference_type: e.target.value})} placeholder="e.g. event, member" /></div>
                                <div className="form-group"><label>Reference ID</label><input value={form.reference_id} onChange={e => setForm({...form, reference_id: e.target.value})} /></div>
                            </div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Create</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Delete Reminder" message="Remove this reminder?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { reminderApi.deleteReminder(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

const AutoReminders: React.FC = () => {
    const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
    const [anniversaries, setAnniversaries] = useState<UpcomingAnniversary[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [b, a] = await Promise.all([reminderApi.getUpcomingBirthdays(7), reminderApi.getUpcomingAnniversaries(7)]);
            setBirthdays(b); setAnniversaries(a);
        } catch { toast.error('Failed to load.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    if (loading) return <p>Loading...</p>;

    return (
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
            <div>
                <h3>Upcoming Birthdays (7 days)</h3>
                {birthdays.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>None.</p> :
                birthdays.map((b, i) => (
                    <div key={i} className="member-card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                        <strong>{b.member_name}</strong>
                        <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>{new Date(b.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} (turns {b.age})</span>
                    </div>
                ))}
            </div>
            <div>
                <h3>Upcoming Anniversaries (7 days)</h3>
                {anniversaries.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>None.</p> :
                anniversaries.map((a, i) => (
                    <div key={i} className="member-card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                        <strong>{a.member_name}</strong>
                        <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>{new Date(a.joined_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} ({a.years} years)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminReminders;
