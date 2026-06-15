import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdEdit, MdCampaign } from 'react-icons/md';
import AppDatePicker from '../../components/AppDatePicker';
import { announcementApi, Announcement } from '../../api/announcements';
import { useDataRefresh } from '../../context/DataRefreshContext';
import ConfirmModal from './ConfirmModal';
import './AdminViews.css';

const AdminAnnouncements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [showActive, setShowActive] = useState(false);
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const [form, setForm] = useState({
        title: '', content: '', category: 'general', priority: 'normal',
        start_date: '', end_date: '',
    });

    const fetchData = async () => {
        setLoading(true);
        try { setAnnouncements(await announcementApi.getAnnouncements(showActive)); }
        catch { toast.error('Failed to load announcements.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal, showActive]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await announcementApi.updateAnnouncement(editing.id, form);
                toast.success('Announcement updated.');
            } else {
                await announcementApi.createAnnouncement(form);
                toast.success('Announcement created.');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ title: '', content: '', category: 'general', priority: 'normal', start_date: '', end_date: '' });
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    const toggleActive = async (a: Announcement) => {
        try {
            await announcementApi.updateAnnouncement(a.id, { is_active: !a.is_active });
            toast.success(a.is_active ? 'Deactivated.' : 'Activated.');
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Announcements</h1><p>Create and manage church announcements.</p></div>
                <div className="admin-controls">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showActive} onChange={e => setShowActive(e.target.checked)} style={{ width: 'auto' }} />
                        Active only
                    </label>
                    <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> New Announcement</button>
                </div>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Title</th><th>Category</th><th>Priority</th><th>Start</th><th>End</th><th>Active</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={7} className="empty-table">Loading...</td></tr> :
                        announcements.length === 0 ? <tr><td colSpan={7} className="empty-table">No announcements.</td></tr> :
                        announcements.map(a => (
                            <tr key={a.id}>
                                <td style={{ fontWeight: 600 }}><MdCampaign style={{ marginRight: '8px' }} />{a.title}</td>
                                <td><span className="status-badge status-info">{a.category}</span></td>
                                <td><span className={`status-badge ${a.priority === 'high' ? 'status-warning' : a.priority === 'low' ? '' : 'status-info'}`}>{a.priority}</span></td>
                                <td>{new Date(a.start_date).toLocaleDateString()}</td>
                                <td>{a.end_date ? new Date(a.end_date).toLocaleDateString() : 'Ongoing'}</td>
                                <td><span className={`status-badge ${a.is_active ? 'status-active' : ''}`}>{a.is_active ? 'Yes' : 'No'}</span></td>
                                <td>
                                    <button className="btn-text" onClick={() => { setEditing(a); setForm({ title: a.title, content: a.content, category: a.category || 'general', priority: a.priority || 'normal', start_date: a.start_date, end_date: a.end_date || '' }); setShowModal(true); }}><MdEdit /></button>
                                    <button className="btn-text" onClick={() => toggleActive(a)}>{a.is_active ? 'Deactivate' : 'Activate'}</button>
                                    <button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(a.id)}><MdDelete /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setEditing(null); }}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <h2>{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label>Title *</label><input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
                            <div className="form-group"><label>Content *</label><textarea required rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="general">General</option><option value="events">Events</option><option value="emergency">Emergency</option><option value="opportunity">Opportunity</option><option value="pastoral">Pastoral</option></select></div>
                                <div className="form-group"><label>Priority</label><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Start Date *</label><AppDatePicker value={form.start_date} onChange={d => setForm({...form, start_date: d})} placeholderText="Start" className="form-input" /></div>
                                <div className="form-group"><label>End Date</label><AppDatePicker value={form.end_date} onChange={d => setForm({...form, end_date: d})} placeholderText="Optional" className="form-input" /></div>
                            </div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button><button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Delete Announcement" message="Remove this announcement?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { announcementApi.deleteAnnouncement(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

export default AdminAnnouncements;
