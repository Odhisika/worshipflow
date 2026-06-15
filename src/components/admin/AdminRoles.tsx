import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdAdminPanelSettings, MdEdit, MdRefresh } from 'react-icons/md';
import { adminRoleApi, AdminRole } from '../../api/adminRoles';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

const AdminRoles: React.FC = () => {
    const [roles, setRoles] = useState<AdminRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<AdminRole | null>(null);
    const [form, setForm] = useState({ admin_id: '', role: 'admin', permissions: '' });
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const fetchData = async () => {
        setLoading(true);
        try { setRoles(await adminRoleApi.getAdminRoles()); }
        catch { toast.error('Failed to load admin roles.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminRoleApi.setAdminRole({ admin_id: form.admin_id, role: form.role, permissions: form.permissions || undefined });
            toast.success(editing ? 'Role updated.' : 'Role assigned.');
            setShowModal(false);
            setEditing(null);
            setForm({ admin_id: '', role: 'admin', permissions: '' });
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Admin Roles</h1><p>Manage administrator roles and permissions.</p></div>
                <div className="admin-controls">
                    <button className="btn-outline-small" onClick={fetchData}><MdRefresh /></button>
                    <button className="btn-primary" onClick={() => setShowModal(true)}><MdAdminPanelSettings /> Assign Role</button>
                </div>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead><tr><th>Admin ID</th><th>Role</th><th>Permissions</th><th>Assigned At</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={5} className="empty-table">Loading...</td></tr> :
                        roles.length === 0 ? <tr><td colSpan={5} className="empty-table">No admin roles assigned.</td></tr> :
                        roles.map(r => (
                            <tr key={r.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.admin_id.slice(0, 12)}...</td>
                                <td><span className="status-badge status-info">{r.role}</span></td>
                                <td>{r.permissions || '-'}</td>
                                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button className="btn-text" onClick={() => { setEditing(r); setForm({ admin_id: r.admin_id, role: r.role, permissions: r.permissions || '' }); setShowModal(true); }}><MdEdit /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setEditing(null); }}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>{editing ? 'Edit Admin Role' : 'Assign Admin Role'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label>Admin ID *</label><input required value={form.admin_id} onChange={e => setForm({...form, admin_id: e.target.value})} placeholder="Admin user ID" disabled={!!editing} /></div>
                            <div className="form-group"><label>Role *</label><select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                            </select></div>
                            <div className="form-group"><label>Permissions (JSON or comma-separated)</label><textarea rows={3} value={form.permissions} onChange={e => setForm({...form, permissions: e.target.value})} placeholder='e.g. members:read,members:write,events:read' /></div>
                            <div className="modal-actions"><button type="button" className="btn-text" onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button><button type="submit" className="btn-primary">{editing ? 'Update' : 'Assign'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRoles;
