import React, { useState, useEffect } from 'react';
import { MdAdd, MdFormatListBulleted, MdCheckCircle, MdPending, MdCancel, MdPersonAdd } from 'react-icons/md';
import { volunteersApi, VolunteerRole, VolunteerAssignment } from '../../api/volunteers';
import { serviceApi, Service } from '../../api/services';
import { memberApi, Member } from '../../api/members';
import './AdminViews.css';

const AdminVolunteers: React.FC = () => {
    const [roles, setRoles] = useState<VolunteerRole[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [assignments, setAssignments] = useState<VolunteerAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [members, setMembers] = useState<Member[]>([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [roleFormData, setRoleFormData] = useState({
        name: '',
        description: '',
        required_count: 1
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedServiceId) {
            loadAssignments(selectedServiceId);
        }
    }, [selectedServiceId]);

    const loadInitialData = async () => {
        try {
            const [roleData, serviceData, memberData] = await Promise.all([
                volunteersApi.getVolunteerRoles(),
                serviceApi.getAllServices(),
                memberApi.getMembers()
            ]);
            setRoles(roleData);
            setServices(serviceData);
            setMembers(memberData);
            if (serviceData.length > 0) {
                setSelectedServiceId(serviceData[0].id);
            }
        } catch (error) {
            console.error('Failed to load initial volunteer data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAssignments = async (serviceId: string) => {
        try {
            const data = await volunteersApi.getVolunteerAssignments(serviceId);
            setAssignments(data);
        } catch (error) {
            console.error('Failed to load assignments:', error);
        }
    };

    const handleAssign = async (memberId: string) => {
        if (!selectedRoleId || !selectedServiceId) return;
        try {
            await volunteersApi.assignVolunteer(selectedRoleId, memberId, selectedServiceId);
            setShowAssignModal(false);
            loadAssignments(selectedServiceId);
        } catch (error) {
            console.error('Failed to assign volunteer:', error);
        }
    };

    const handleCreateRole = async () => {
        try {
            await volunteersApi.createVolunteerRole(
                roleFormData.name,
                roleFormData.description || undefined,
                roleFormData.required_count
            );
            setShowRoleModal(false);
            setRoleFormData({ name: '', description: '', required_count: 1 });
            const roleData = await volunteersApi.getVolunteerRoles();
            setRoles(roleData);
        } catch (error) {
            console.error('Failed to create role:', error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Confirmed': return <MdCheckCircle style={{ color: 'var(--accent-green)' }} />;
            case 'Pending': return <MdPending style={{ color: 'var(--accent-orange)' }} />;
            case 'Declined': return <MdCancel style={{ color: 'var(--accent-red)' }} />;
            default: return null;
        }
    };

    const filteredMembers = members.filter(m =>
        (m.first_name + ' ' + m.last_name).toLowerCase().includes(memberSearch.toLowerCase())
    ).slice(0, 5);

    if (loading) {
        return <div className="admin-loading">Orchestrating Teams...</div>;
    }

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Volunteer Orchestration</h1>
                    <p>Schedule teams, manage serving roles, and build a culture of participation.</p>
                </div>
                <div className="admin-controls">
                    <select
                        className="form-control"
                        style={{ width: '220px' }}
                        value={selectedServiceId}
                        onChange={e => setSelectedServiceId(e.target.value)}
                    >
                        {services.map(s => (
                            <option key={s.id} value={s.id}>{s.title} ({new Date(s.date).toLocaleDateString()})</option>
                        ))}
                    </select>
                    <button className="btn-primary" onClick={() => setShowRoleModal(true)}>
                        <MdAdd size={20} /> Define Role
                    </button>
                </div>
            </div>

            <div className="members-table-container" style={{ marginBottom: '2.5rem' }}>
                <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                            {services.find(s => s.id === selectedServiceId)?.title || 'Service'} Schedule
                        </h2>
                        <span className="status-badge status-info" style={{ fontSize: '0.75rem' }}>Active Orchestration</span>
                    </div>
                </div>
                <table className="members-table">
                    <thead>
                        <tr>
                            <th>Serving Role</th>
                            <th>Volunteer</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((role) => {
                            const roleAssignments = assignments.filter(a => a.role_id === role.id);
                            return (
                                <React.Fragment key={role.id}>
                                    {roleAssignments.length === 0 ? (
                                        <tr>
                                            <td><div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{role.name}</div></td>
                                            <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</td>
                                            <td><span className="status-badge status-pending" style={{ fontSize: '0.75rem' }}>Empty ({role.required_count} needed)</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn-outline-small" onClick={() => { setSelectedRoleId(role.id); setShowAssignModal(true); }}>
                                                    <MdPersonAdd /> Assign
                                                </button>
                                            </td>
                                        </tr>
                                    ) : roleAssignments.map((asgn, idx) => (
                                        <tr key={asgn.id}>
                                            <td>{idx === 0 ? <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{role.name}</div> : ''}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                                                    {asgn.member_name}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    {getStatusIcon(asgn.status)}
                                                    <span className={`status-badge status-${asgn.status.toLowerCase()}`}>{asgn.status}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn-outline-small">Notify</button>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                        {roles.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No roles defined yet. Create your first serving role to start scheduling.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="members-grid">
                <div className="member-card">
                    <div className="member-card-body">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>Role Inventory</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {roles.map(role => (
                                <div key={role.id} style={{ background: 'var(--bg-lighter)', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-light)' }}>
                                    <div>
                                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.2rem', fontWeight: '600' }}>{role.name}</h4>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{role.required_count} people required</span>
                                    </div>
                                    <div className="table-avatar" style={{ background: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary-blue)', width: '40px', height: '40px' }}>
                                        <MdFormatListBulleted size={20} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>Serving Insights</h3>
                        <div className="admin-empty-state" style={{ padding: '2rem 1rem', background: 'var(--bg-lighter)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                                {assignments.length} total assignments for this service.
                                <br />
                                {assignments.filter(a => a.status === 'Confirmed').length} confirmed.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Assign Volunteer</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Choose a member to serve in the {roles.find(r => r.id === selectedRoleId)?.name} role.</p>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label>Search Members</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Type member name..."
                                value={memberSearch}
                                onChange={e => setMemberSearch(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                            {filteredMembers.map(member => (
                                <div
                                    key={member.id}
                                    className="member-item-compact"
                                    style={{ padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-light)' }}
                                    onClick={() => handleAssign(member.id)}
                                >
                                    <span style={{ fontWeight: '600' }}>{member.first_name} {member.last_name}</span>
                                    <MdAdd style={{ color: 'var(--primary-blue)' }} />
                                </div>
                            ))}
                            {filteredMembers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No members found.</p>}
                        </div>

                        <div className="modal-actions">
                            <button className="btn-outline-small" onClick={() => setShowAssignModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showRoleModal && (
                <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Define Serving Role</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Create a new role for volunteers to serve in.</p>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label>Role Name</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Worship Team, Greeting Team"
                                value={roleFormData.name}
                                onChange={e => setRoleFormData({ ...roleFormData, name: e.target.value })}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label>Description</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="What does this role involve?"
                                value={roleFormData.description}
                                onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label>Required Count</label>
                            <input
                                type="number"
                                className="form-control"
                                value={roleFormData.required_count}
                                onChange={e => setRoleFormData({ ...roleFormData, required_count: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-outline-small" onClick={() => setShowRoleModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreateRole} disabled={!roleFormData.name}>Create Role</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVolunteers;
