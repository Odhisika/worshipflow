import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdHome, MdSpa, MdPsychology, MdAdd, MdDelete, MdCheckCircle, MdVisibilityOff } from 'react-icons/md';
import AppDatePicker from '../../components/AppDatePicker';
import { pastoralApi, Visitation, PrayerRequest, CounsellingSession } from '../../api/pastoral';

import { useDataRefresh } from '../../context/DataRefreshContext';
import ConfirmModal from './ConfirmModal';
import './AdminViews.css';

type TabType = 'visitations' | 'prayer' | 'counselling';

const AdminPastoralCare: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('visitations');

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Pastoral Care</h1>
                    <p>Visitations, prayer requests, and counselling management.</p>
                </div>
            </div>
            <div className="tab-bar">
                <button className={activeTab === 'visitations' ? 'tab-active' : ''} onClick={() => setActiveTab('visitations')}><MdHome /> Visitations</button>
                                <button className={activeTab === 'prayer' ? 'tab-active' : ''} onClick={() => setActiveTab('prayer')}><MdSpa /> Prayer Requests</button>
                <button className={activeTab === 'counselling' ? 'tab-active' : ''} onClick={() => setActiveTab('counselling')}><MdPsychology /> Counselling</button>
            </div>
            {activeTab === 'visitations' && <VisitationsSection />}
            {activeTab === 'prayer' && <PrayerSection />}
            {activeTab === 'counselling' && <CounsellingSection />}
        </div>
    );
};

const VisitationsSection: React.FC = () => {
    const [visitations, setVisitations] = useState<Visitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const [form, setForm] = useState({ member_id: '', visitation_date: '', visitation_type: 'home', notes: '', conducted_by: '', follow_up_date: '' });

    const fetchData = async () => {
        setLoading(true);
        try { setVisitations(await pastoralApi.getVisitations()); } catch { toast.error('Failed to load visitations.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await pastoralApi.createVisitation({
                member_id: form.member_id || undefined,
                visitation_date: form.visitation_date,
                visitation_type: form.visitation_type,
                notes: form.notes || undefined,
                conducted_by: form.conducted_by || undefined,
                follow_up_date: form.follow_up_date || undefined,
            });
            toast.success('Visitation recorded.');
            setShowModal(false);
            setForm({ member_id: '', visitation_date: '', visitation_type: 'home', notes: '', conducted_by: '', follow_up_date: '' });
            triggerRefresh();
        } catch { toast.error('Failed to record visitation.'); }
    };

    const handleDelete = async (id: string) => {
        try { await pastoralApi.deleteVisitation(id); toast.success('Visitation removed.'); setConfirmDelete(null); triggerRefresh(); }
        catch { toast.error('Failed to delete.'); }
    };

    return (
        <div>
            <div className="admin-controls" style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Record Visitation</button>
            </div>
            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Person</th><th>Date</th><th>Type</th><th>Conducted By</th><th>Follow-up</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} className="empty-table">Loading...</td></tr> :
                        visitations.length === 0 ? <tr><td colSpan={6} className="empty-table">No visitations recorded.</td></tr> :
                        visitations.map(v => (
                            <tr key={v.id}>
                                <td style={{ fontWeight: 600 }}>{v.person_name || 'N/A'}</td>
                                <td>{new Date(v.visitation_date).toLocaleDateString()}</td>
                                <td><span className="status-badge status-info">{v.visitation_type}</span></td>
                                <td>{v.conducted_by || '-'}</td>
                                <td>{v.follow_up_needed ? <span className="status-badge status-warning">Due: {v.follow_up_date ? new Date(v.follow_up_date).toLocaleDateString() : 'Yes'}</span> : 'None'}</td>
                                <td><button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(v.id)}><MdDelete /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Record Visitation</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group"><label>Member ID</label><input placeholder="Member ID (optional)" value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})} /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Date *</label><AppDatePicker value={form.visitation_date} onChange={d => setForm({...form, visitation_date: d})} placeholderText="Select date" className="form-input" /></div>
                                <div className="form-group"><label>Type</label><select value={form.visitation_type} onChange={e => setForm({...form, visitation_type: e.target.value})}><option value="home">Home Visit</option><option value="hospital">Hospital</option><option value="office">Office Visit</option><option value="phone">Phone Call</option></select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Conducted By</label><input value={form.conducted_by} onChange={e => setForm({...form, conducted_by: e.target.value})} placeholder="Pastor/Minister name" /></div>
                                <div className="form-group"><label>Follow-up Date</label><AppDatePicker value={form.follow_up_date} onChange={d => setForm({...form, follow_up_date: d})} placeholderText="If needed" className="form-input" /></div>
                            </div>
                            <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Delete Visitation" message="Remove this visitation record?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

const PrayerSection: React.FC = () => {
    const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [form, setForm] = useState({ member_id: '', request: '', category: 'general', is_anonymous: false, notes: '' });

    const fetchData = async () => {
        setLoading(true);
        try { setPrayers(await pastoralApi.getPrayerRequests()); } catch { toast.error('Failed to load prayer requests.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await pastoralApi.createPrayerRequest({
                member_id: form.member_id || undefined,
                request: form.request,
                category: form.category,
                is_anonymous: form.is_anonymous,
                notes: form.notes || undefined,
            });
            toast.success('Prayer request added.');
            setShowModal(false);
            setForm({ member_id: '', request: '', category: 'general', is_anonymous: false, notes: '' });
            triggerRefresh();
        } catch { toast.error('Failed to add prayer request.'); }
    };

    const handleStatus = async (id: string, status: string) => {
        try { await pastoralApi.updatePrayerStatus(id, status); toast.success(`Marked as ${status}.`); triggerRefresh(); }
        catch { toast.error('Failed to update.'); }
    };

    return (
        <div>
            <div className="admin-controls" style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Add Prayer Request</button>
            </div>
            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Requester</th><th>Request</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} className="empty-table">Loading...</td></tr> :
                        prayers.length === 0 ? <tr><td colSpan={6} className="empty-table">No prayer requests.</td></tr> :
                        prayers.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.is_anonymous ? <><MdVisibilityOff /> Anonymous</> : p.requester_name || 'N/A'}</td>
                                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.request}</td>
                                <td><span className="status-badge status-info">{p.category}</span></td>
                                <td><span className={`status-badge ${p.status === 'active' ? 'status-warning' : p.status === 'prayed' ? 'status-active' : ''}`}>{p.status}</span></td>
                                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {p.status === 'active' && <button className="btn-text" style={{ color: 'var(--accent-green)' }} onClick={() => handleStatus(p.id, 'prayed')}><MdCheckCircle /> Prayed</button>}
                                        <button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(p.id)}><MdDelete /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Add Prayer Request</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group"><label>Member ID</label><input placeholder="Member ID (optional, leave blank for anonymous)" value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})} /></div>
                            <div className="form-group"><label>Prayer Request *</label><textarea required rows={3} value={form.request} onChange={e => setForm({...form, request: e.target.value})} /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="general">General</option><option value="healing">Healing</option><option value="finances">Finances</option><option value="family">Family</option><option value="guidance">Guidance</option><option value="thanksgiving">Thanksgiving</option></select></div>
                                <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem' }}><input type="checkbox" checked={form.is_anonymous} onChange={e => setForm({...form, is_anonymous: e.target.checked})} style={{ width: 'auto' }} /> Anonymous</label></div>
                            </div>
                            <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Submit</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Delete Prayer Request" message="Remove this prayer request?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { pastoralApi.deletePrayerRequest(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

const CounsellingSection: React.FC = () => {
    const [sessions, setSessions] = useState<CounsellingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [form, setForm] = useState({ member_id: '', session_date: '', session_type: 'individual', notes: '', is_confidential: false, conducted_by: '', follow_up_date: '' });

    const fetchData = async () => {
        setLoading(true);
        try { setSessions(await pastoralApi.getCounsellingSessions()); } catch { toast.error('Failed to load counselling sessions.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await pastoralApi.createCounsellingSession({
                member_id: form.member_id,
                session_date: form.session_date,
                session_type: form.session_type,
                notes: form.notes || undefined,
                is_confidential: form.is_confidential,
                conducted_by: form.conducted_by || undefined,
                follow_up_date: form.follow_up_date || undefined,
            });
            toast.success('Counselling session recorded.');
            setShowModal(false);
            setForm({ member_id: '', session_date: '', session_type: 'individual', notes: '', is_confidential: false, conducted_by: '', follow_up_date: '' });
            triggerRefresh();
        } catch { toast.error('Failed to record session.'); }
    };

    return (
        <div>
            <div className="admin-controls" style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Record Session</button>
            </div>
            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Member</th><th>Date</th><th>Type</th><th>Counselor</th><th>Follow-up</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={7} className="empty-table">Loading...</td></tr> :
                        sessions.length === 0 ? <tr><td colSpan={7} className="empty-table">No sessions recorded.</td></tr> :
                        sessions.map(s => (
                            <tr key={s.id}>
                                <td style={{ fontWeight: 600 }}>{s.member_name} {s.is_confidential && <MdVisibilityOff style={{ color: 'var(--accent-orange)' }} />}</td>
                                <td>{new Date(s.session_date).toLocaleDateString()}</td>
                                <td><span className="status-badge status-info">{s.session_type}</span></td>
                                <td>{s.conducted_by || '-'}</td>
                                <td>{s.follow_up_date ? new Date(s.follow_up_date).toLocaleDateString() : 'None'}</td>
                                <td><span className={`status-badge ${s.status === 'completed' ? 'status-active' : ''}`}>{s.status}</span></td>
                                <td><button className="btn-text" style={{ color: 'var(--accent-red)' }} onClick={() => setConfirmDelete(s.id)}><MdDelete /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Record Counselling Session</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group"><label>Member ID *</label><input required placeholder="Member ID" value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})} /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Date *</label><AppDatePicker value={form.session_date} onChange={d => setForm({...form, session_date: d})} placeholderText="Select date" className="form-input" /></div>
                                <div className="form-group"><label>Type</label><select value={form.session_type} onChange={e => setForm({...form, session_type: e.target.value})}><option value="individual">Individual</option><option value="marriage">Marriage</option><option value="family">Family</option><option value="grief">Grief</option><option value="spiritual">Spiritual</option><option value="other">Other</option></select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Conducted By</label><input value={form.conducted_by} onChange={e => setForm({...form, conducted_by: e.target.value})} placeholder="Counselor name" /></div>
                                <div className="form-group"><label>Follow-up Date</label><AppDatePicker value={form.follow_up_date} onChange={d => setForm({...form, follow_up_date: d})} placeholderText="If needed" className="form-input" /></div>
                            </div>
                            <div className="form-group"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                            <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={form.is_confidential} onChange={e => setForm({...form, is_confidential: e.target.checked})} style={{ width: 'auto' }} /> Confidential (only visible to authorized staff)</label></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete && <ConfirmModal title="Delete Session" message="Remove this counselling session record?" confirmLabel="Delete" confirmStyle="danger" onConfirm={() => { pastoralApi.deleteCounsellingSession(confirmDelete).then(() => { setConfirmDelete(null); triggerRefresh(); }).catch(() => toast.error('Failed.')); }} onCancel={() => setConfirmDelete(null)} />}
        </div>
    );
};

export default AdminPastoralCare;
