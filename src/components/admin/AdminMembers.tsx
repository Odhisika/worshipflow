import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    MdSearch, MdMoreVert, MdMail, MdPhone,
    MdDelete, MdPersonAdd, MdBlock, MdCheckCircle, MdEdit, MdFileDownload, MdPerson
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchChurchAssets, drawChurchHeader, drawFooter } from '../../utils/pdfUtils';
import AppDatePicker from '../../components/AppDatePicker';
import { memberApi, Member, MemberRole } from '../../api/members';
import { saveFileWithDialog } from '../../api/export';
import { useDataRefresh } from '../../context/DataRefreshContext';
import ConfirmModal from './ConfirmModal';
import MemberDetail from './MemberDetail';
import './AdminViews.css';

const AdminMembers: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [confirmSuspend, setConfirmSuspend] = useState<Member | null>(null);
    const [viewingMember, setViewingMember] = useState<Member | null>(null);

    // Form state for Add/Edit
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        dob: '',
        gender: '',
        hometown: '',
        occupation: '',
        is_baptized: false,
        marital_status: '',
        emergency_contact: '',
        role: 'member' as MemberRole
    });

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const data = await memberApi.getMembers();
            setMembers(data);
        } catch (error) {
            console.error('Failed to fetch members:', error);
            toast.error('Failed to load members directory.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [refreshSignal]);

    const filteredMembers = useMemo(() => {
        if (!searchTerm) return members;
        const lowSearch = searchTerm.toLowerCase();
        return members.filter(m =>
            m.first_name.toLowerCase().includes(lowSearch) ||
            m.last_name.toLowerCase().includes(lowSearch) ||
            m.email?.toLowerCase().includes(lowSearch) ||
            m.phone?.includes(searchTerm)
        );
    }, [members, searchTerm]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await memberApi.createMember({
                ...formData,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                address: formData.address || undefined,
                dob: formData.dob || undefined,
                gender: formData.gender || undefined,
                hometown: formData.hometown || undefined,
                occupation: formData.occupation || undefined,
                marital_status: formData.marital_status || undefined,
                emergency_contact: formData.emergency_contact || undefined,
            });
            toast.success(`${formData.first_name} ${formData.last_name} has been registered successfully.`);
            setShowAddModal(false);
            resetForm();
            triggerRefresh();
        } catch (error) {
            console.error('Failed to add member:', error);
            toast.error('Failed to register member. Please try again.');
        }
    };

    const handleUpdateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember) return;
        try {
            await memberApi.updateMember(selectedMember.id, {
                ...formData,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                address: formData.address || undefined,
                dob: formData.dob || undefined,
                gender: formData.gender || undefined,
                hometown: formData.hometown || undefined,
                occupation: formData.occupation || undefined,
                marital_status: formData.marital_status || undefined,
                emergency_contact: formData.emergency_contact || undefined,
            });
            toast.success('Member profile updated successfully.');
            setShowEditModal(false);
            resetForm();
            triggerRefresh();
        } catch (error) {
            console.error('Failed to update member:', error);
            toast.error('Failed to update member. Please try again.');
        }
    };

    const handleDeleteMember = async (id: string) => {
        try {
            await memberApi.deleteMember(id);
            toast.success('Member has been removed from the directory.');
            setConfirmDelete(null);
            triggerRefresh();
        } catch (error) {
            console.error('Failed to delete member:', error);
            toast.error('Failed to delete member. Please try again.');
        }
    };

    const handlePromote = async (id: string, role: MemberRole) => {
        try {
            await memberApi.promoteMember(id, role);
            toast.success(`Member promoted to ${role.replace('_', ' ')}.`);
            setActiveMenuId(null);
            triggerRefresh();
        } catch (error) {
            console.error('Failed to promote member:', error);
            toast.error('Failed to promote member. Please try again.');
        }
    };

    const handleToggleStatus = async (member: Member) => {
        try {
            if (member.status === 'active') {
                await memberApi.suspendMember(member.id);
                toast.success('Member has been suspended.');
            } else {
                await memberApi.activateMember(member.id);
                toast.success('Member has been reactivated.');
            }
            setConfirmSuspend(null);
            setActiveMenuId(null);
            triggerRefresh();
        } catch (error) {
            console.error('Failed to toggle status:', error);
            toast.error('Failed to update member status. Please try again.');
        }
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            address: '',
            dob: '',
            gender: '',
            hometown: '',
            occupation: '',
            is_baptized: false,
            marital_status: '',
            emergency_contact: '',
            role: 'member'
        });
        setSelectedMember(null);
    };

    const openEditModal = (member: Member) => {
        setSelectedMember(member);
        setFormData({
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email || '',
            phone: member.phone || '',
            address: member.address || '',
            dob: member.dob || '',
            gender: member.gender || '',
            hometown: member.hometown || '',
            occupation: member.occupation || '',
            is_baptized: member.is_baptized,
            marital_status: member.marital_status || '',
            emergency_contact: member.emergency_contact || '',
            role: member.role
        });
        setShowEditModal(true);
        setActiveMenuId(null);
    };

    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleSearch = () => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    const handleExportExcel = async () => {
        if (members.length === 0) {
            toast.error('No members to export.');
            return;
        }
        try {
            const data = members.map(m => ({
                'First Name': m.first_name,
                'Last Name': m.last_name,
                'Email': m.email || '',
                'Phone': m.phone || '',
                'Gender': m.gender || '',
                'Date of Birth': m.dob || '',
                'Hometown': m.hometown || '',
                'Occupation': m.occupation || '',
                'Marital Status': m.marital_status || '',
                'Role': m.role.replace('_', ' '),
                'Status': m.status,
                'Is Baptized': m.is_baptized ? 'Yes' : 'No',
                'Address': m.address || '',
                'Emergency Contact': m.emergency_contact || '',
                'Joined': m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '',
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Members');
            const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            await saveFileWithDialog('members_directory.xlsx', blob);
            toast.success('Members exported to Excel successfully.');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export members to Excel.');
        }
    };

    const handleExportPDF = async () => {
        if (members.length === 0) {
            toast.error('No members to export.');
            return;
        }
        try {
            const doc = new jsPDF();
            const pageW = doc.internal.pageSize.getWidth();
            const margin = 20;

            const { config } = await fetchChurchAssets();
            const headerEnd = drawChurchHeader(doc, config, '');
            let y = headerEnd;

            doc.setFillColor(41, 98, 255);
            doc.rect(margin, y, pageW - margin * 2, 10, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('MEMBERSHIP DIRECTORY', pageW / 2, y + 7, { align: 'center' });
            y += 16;

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Exported: ${new Date().toLocaleDateString()}`, margin, y);
            y += 8;

            const tableData = members.map(m => [
                `${m.first_name} ${m.last_name}`,
                m.email || '-',
                m.phone || '-',
                m.role.replace('_', ' '),
                m.status,
            ]);
            autoTable(doc, {
                head: [['Name', 'Email', 'Phone', 'Role', 'Status']],
                body: tableData,
                startY: y,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 98, 255] },
            });
            drawFooter(doc, pageW);
            const blob = doc.output('blob');
            await saveFileWithDialog('members_directory.pdf', blob);
            toast.success('Members exported to PDF successfully.');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export members to PDF.');
        }
    };

    const stats = useMemo(() => {
        const total = members.length;
        const active = members.filter(m => m.status === 'active').length;
        const suspended = total - active;
        return { total, active, suspended };
    }, [members]);

    const handleViewEdit = (member: Member) => {
        setViewingMember(null);
        openEditModal(member);
    };

    if (viewingMember) {
        return (
            <div className="admin-view-container animate-fade-in">
                <MemberDetail
                    member={viewingMember}
                    onBack={() => { setViewingMember(null); fetchMembers(); }}
                    onEdit={handleViewEdit}
                />
            </div>
        );
    }

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Membership Directory</h1>
                    <p>Manage church members, leaders, and their roles.</p>
                </div>
                <div className="admin-controls">
                    <div className="search-bar">
                        <button type="button" onClick={handleSearch} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'pointer' }}>
                            <MdSearch className="admin-search-icon" size={20} />
                        </button>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-outline-small" onClick={handleExportExcel}>
                        <MdFileDownload size={18} /> Excel
                    </button>
                    <button className="btn-outline-small" onClick={handleExportPDF}>
                        <MdFileDownload size={18} /> PDF
                    </button>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <MdPersonAdd size={20} /> Add Member
                    </button>
                </div>
            </div>

            <div className="members-grid" style={{ marginBottom: '2rem' }}>
                <div className="member-card">
                    <div className="member-card-body">
                        <h3>Total Directory</h3>
                        <p className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--text-primary)' }}>{stats.total}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total registered persons</p>
                    </div>
                </div>
                <div className="member-card">
                    <div className="member-card-body">
                        <h3>Active Members</h3>
                        <p className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--accent-green)' }}>{stats.active}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Regularly attending</p>
                    </div>
                </div>
                <div className="member-card">
                    <div className="member-card-body">
                        <h3>Suspended</h3>
                        <p className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--accent-orange)' }}>{stats.suspended}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Membership on hold</p>
                    </div>
                </div>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead>
                        <tr>
                            <th>Member Details</th>
                            <th>Contact Info</th>
                            <th>Role</th>
                            <th>Ministry</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="empty-table">Loading directory...</td></tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr><td colSpan={7} className="empty-table">No members found.</td></tr>
                        ) : filteredMembers.map((member) => (
                            <tr key={member.id}>
                                <td>
                                    <div className="member-info-cell">
                                        <div className="table-avatar">
                                            {member.first_name[0]}{member.last_name[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{member.first_name} {member.last_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {member.id.substring(0, 8)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="member-contact">
                                        {member.email && <span><MdMail size={14} /> {member.email}</span>}
                                        {member.phone && <span><MdPhone size={14} /> {member.phone}</span>}
                                    </div>
                                </td>
                                <td>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        color: member.role === 'member' ? 'var(--text-secondary)' : 'var(--primary-blue)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {member.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td>
                                    {member.ministry && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '6px',
                                            background: 'rgba(99,102,241,0.12)',
                                            color: '#818cf8',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {member.ministry}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span className={`status-badge ${member.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                                        {member.status}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}
                                </td>
                                <td style={{ position: 'relative' }}>
                                    <button
                                        className="action-dot-btn"
                                        onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                                    >
                                        <MdMoreVert size={20} />
                                    </button>

                                    {activeMenuId === member.id && (
                                        <div className="dropdown-menu" style={{
                                            position: 'absolute',
                                            right: '1.5rem',
                                            top: '100%',
                                            zIndex: 100,
                                            background: 'var(--bg-modal)',
                                            border: '1px solid var(--border-light)',
                                            borderRadius: '8px',
                                            padding: '0.5rem',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                                            minWidth: '200px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px'
                                        }}>
                                            <button className="btn-text" style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setActiveMenuId(null); setViewingMember(member); }}>
                                                <MdPerson size={16} /> View Details
                                            </button>

                                            <button className="btn-text" style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => openEditModal(member)}>
                                                <MdEdit size={16} /> Edit Details
                                            </button>

                                            <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.25rem 0' }} />

                                            <div style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '700' }}>PROMOTE TO:</div>
                                            {(['youth_leader', 'mens_leader', 'deacon', 'pastor'] as MemberRole[]).map(role => (
                                                <button key={role} className="btn-text" style={{ textAlign: 'left', padding: '0.4rem 0.5rem', fontSize: '0.8rem', textTransform: 'capitalize' }} onClick={() => handlePromote(member.id, role)}>
                                                    {role.replace('_', ' ')}
                                                </button>
                                            ))}

                                            <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.25rem 0' }} />

                                            <button
                                                className="btn-text"
                                                style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: member.status === 'active' ? 'var(--accent-orange)' : 'var(--accent-green)' }}
                                                onClick={() => { setActiveMenuId(null); setConfirmSuspend(member); }}
                                            >
                                                {member.status === 'active' ? <><MdBlock size={16} /> Suspend</> : <><MdCheckCircle size={16} /> Activate</>}
                                            </button>
                                            <button
                                                className="btn-text"
                                                style={{ textAlign: 'left', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)' }}
                                                onClick={() => { setActiveMenuId(null); setConfirmDelete(member.id); }}
                                            >
                                                <MdDelete size={16} /> Delete Member
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Member Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => { setShowAddModal(false); resetForm(); }}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Register New Member</h2>
                        <form onSubmit={handleAddMember}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input required placeholder="e.g. Kojo" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input required placeholder="e.g. Mensah" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input type="email" placeholder="e.g. kojo.mensah@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input placeholder="e.g. (024) 000-0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date of Birth</label>
                                    <AppDatePicker value={formData.dob}
                                        onChange={(d) => setFormData({ ...formData, dob: d })}
                                        placeholderText="Select date of birth" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Hometown</label>
                                    <input placeholder="e.g. Kumasi" value={formData.hometown} onChange={e => setFormData({ ...formData, hometown: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Occupation</label>
                                    <input placeholder="e.g. Teacher, Engineer" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Marital Status</label>
                                    <select value={formData.marital_status} onChange={e => setFormData({ ...formData, marital_status: e.target.value })}>
                                        <option value="">Select Status</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as MemberRole })}>
                                        <option value="member">Regular Member</option>
                                        <option value="youth_leader">Youth Leader</option>
                                        <option value="mens_leader">Men's Leader</option>
                                        <option value="deacon">Deacon</option>
                                        <option value="pastor">Pastor</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Residential Address</label>
                                <input placeholder="e.g. 12 Independence Ave, Accra" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Emergency Contact (Name & Phone)</label>
                                <input placeholder="e.g. Akua Mensah - (024) 111-2222" value={formData.emergency_contact} onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={formData.is_baptized} onChange={e => setFormData({ ...formData, is_baptized: e.target.checked })} style={{ width: 'auto' }} />
                                    Is Baptized?
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-text" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</button>
                                <button type="submit" className="btn-primary">Register Member</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Member Modal */}
            {confirmDelete && (
                <ConfirmModal
                    title="Delete Member"
                    message="Are you sure you want to permanently delete this member? This action cannot be undone."
                    confirmLabel="Delete"
                    confirmStyle="danger"
                    onConfirm={() => handleDeleteMember(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}

            {confirmSuspend && (
                <ConfirmModal
                    title={confirmSuspend.status === 'active' ? 'Suspend Member' : 'Reactivate Member'}
                    message={confirmSuspend.status === 'active'
                        ? `Are you sure you want to suspend ${confirmSuspend.first_name} ${confirmSuspend.last_name}? They will no longer be able to participate until reactivated.`
                        : `Are you sure you want to reactivate ${confirmSuspend.first_name} ${confirmSuspend.last_name}?`}
                    confirmLabel={confirmSuspend.status === 'active' ? 'Suspend' : 'Reactivate'}
                    confirmStyle="warning"
                    onConfirm={() => handleToggleStatus(confirmSuspend)}
                    onCancel={() => setConfirmSuspend(null)}
                />
            )}

            {showEditModal && (
                <div className="modal-overlay" onClick={() => { setShowEditModal(false); resetForm(); }}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2>Edit Member Profile</h2>
                        <form onSubmit={handleUpdateMember}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date of Birth</label>
                                    <AppDatePicker value={formData.dob}
                                        onChange={(d) => setFormData({ ...formData, dob: d })}
                                        placeholderText="Select date of birth" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Hometown</label>
                                    <input placeholder="e.g. Kumasi" value={formData.hometown} onChange={e => setFormData({ ...formData, hometown: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Occupation</label>
                                    <input placeholder="e.g. Teacher, Engineer" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Marital Status</label>
                                    <select value={formData.marital_status} onChange={e => setFormData({ ...formData, marital_status: e.target.value })}>
                                        <option value="">Select Status</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '1.5rem' }}>
                                        <input type="checkbox" checked={formData.is_baptized} onChange={e => setFormData({ ...formData, is_baptized: e.target.checked })} style={{ width: 'auto' }} />
                                        Is Baptized?
                                    </label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Residential Address</label>
                                <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Emergency Contact</label>
                                <input value={formData.emergency_contact} onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-text" onClick={() => { setShowEditModal(false); resetForm(); }}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMembers;
