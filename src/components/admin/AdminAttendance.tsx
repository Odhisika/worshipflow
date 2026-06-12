import React, { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdCheckCircle, MdCancel, MdBlock, MdPeople, MdSearch } from 'react-icons/md';
import { serviceApi, Service } from '../../api/services';
import { attendanceApi, MemberAttendanceRecord, ServiceAttendanceSummary, AttendanceStatus } from '../../api/attendance';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

type StatusFilter = 'all' | 'present' | 'absent' | 'excused' | 'unmarked';

const STATUS_ORDER: (AttendanceStatus | null)[] = [null, 'present', 'absent', 'excused'];

const nextStatus = (current: AttendanceStatus | null): AttendanceStatus | null => {
    const idx = STATUS_ORDER.indexOf(current);
    return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
};

const AdminAttendance: React.FC = () => {
    const { refreshSignal, triggerRefresh } = useDataRefresh();
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [memberRecords, setMemberRecords] = useState<MemberAttendanceRecord[]>([]);
    const [summary, setSummary] = useState<ServiceAttendanceSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [loading, setLoading] = useState(true);

    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editService, setEditService] = useState<Service | null>(null);
    const [serviceForm, setServiceForm] = useState({ title: '', date: new Date().toISOString().split('T')[0] });

    useEffect(() => { loadData(); }, [refreshSignal]);

    useEffect(() => {
        if (selectedServiceId) {
            loadAttendance(selectedServiceId);
        }
    }, [selectedServiceId]);

    const loadData = async () => {
        try {
            const servicesData = await serviceApi.getAllServices();
            setServices(servicesData);
            if (servicesData.length > 0 && !selectedServiceId) {
                setSelectedServiceId(servicesData[0].id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to load services:', error);
            setLoading(false);
        }
    };

    const loadAttendance = async (serviceId: string) => {
        try {
            const [records, stats] = await Promise.all([
                attendanceApi.getAllMemberAttendanceForService(serviceId),
                attendanceApi.getAttendanceSummary(serviceId),
            ]);
            setMemberRecords(records);
            setSummary(stats);
        } catch (error) {
            console.error('Failed to load attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (memberId: string, currentStatus: AttendanceStatus | null) => {
        if (!selectedServiceId) return;
        const newStatus = nextStatus(currentStatus);
        if (newStatus === null) {
            await attendanceApi.unmarkAttendance(selectedServiceId, memberId);
        } else {
            await attendanceApi.markAttendance({ service_id: selectedServiceId, member_id: memberId, status: newStatus });
        }
        triggerRefresh();
        loadAttendance(selectedServiceId);
    };

    const handleBulkMark = async (status: 'present' | 'absent') => {
        if (!selectedServiceId) return;
        for (const record of filteredRecords) {
            if (record.status !== status) {
                await attendanceApi.markAttendance({ service_id: selectedServiceId, member_id: record.member_id, status });
            }
        }
        triggerRefresh();
        loadAttendance(selectedServiceId);
    };

    const openCreateService = () => {
        setEditService(null);
        setServiceForm({ title: '', date: new Date().toISOString().split('T')[0] });
        setShowServiceModal(true);
    };

    const openEditService = (service: Service) => {
        setEditService(service);
        setServiceForm({ title: service.title, date: service.date });
        setShowServiceModal(true);
    };

    const handleSaveService = async () => {
        try {
            if (editService) {
                await serviceApi.updateService(editService.id, serviceForm);
            } else {
                const created = await serviceApi.createService(serviceForm);
                setSelectedServiceId(created.id);
            }
            setShowServiceModal(false);
            triggerRefresh();
        } catch (error) {
            console.error('Failed to save service:', error);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!window.confirm('Delete this service and all its attendance records?')) return;
        try {
            await serviceApi.deleteService(id);
            if (selectedServiceId === id && services.length > 0) {
                const remaining = services.filter(s => s.id !== id);
                if (remaining.length > 0) setSelectedServiceId(remaining[0].id);
            } else if (services.length <= 1) {
                setSelectedServiceId('');
                setMemberRecords([]);
                setSummary(null);
            }
            triggerRefresh();
        } catch (error) {
            console.error('Failed to delete service:', error);
        }
    };

    const filteredRecords = memberRecords.filter(r => {
        const matchSearch = r.member_name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchSearch) return false;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'unmarked') return r.status === null;
        return r.status === statusFilter;
    });

    const selectedService = services.find(s => s.id === selectedServiceId);
    const presentCount = memberRecords.filter(r => r.status === 'present').length;
    const absentCount = memberRecords.filter(r => r.status === 'absent').length;
    const excusedCount = memberRecords.filter(r => r.status === 'excused').length;
    const unmarkedCount = memberRecords.filter(r => r.status === null).length;
    const totalCount = memberRecords.length;

    if (loading) {
        return <div className="admin-loading">Initializing System...</div>;
    }

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Attendance Management</h1>
                    <p>Track live service engagement and manage congregational presence.</p>
                </div>
                <div className="admin-controls">
                    <button className="btn-primary-small" onClick={openCreateService}>
                        <MdAdd size={18} /> New Service
                    </button>
                    <select
                        className="btn-outline-small"
                        style={{ padding: '0.4rem 1rem', background: 'var(--bg-lighter)', color: 'var(--text-primary)', minWidth: '220px' }}
                        value={selectedServiceId}
                        onChange={e => setSelectedServiceId(e.target.value)}
                    >
                        {services.length === 0 && <option value="">No services</option>}
                        {services.map(s => (
                            <option key={s.id} value={s.id}>{s.title} — {new Date(s.date).toLocaleDateString()}</option>
                        ))}
                    </select>
                    {selectedService && (
                        <>
                            <button className="btn-outline-small" onClick={() => openEditService(selectedService)} title="Edit service">
                                <MdEdit size={16} />
                            </button>
                            <button className="btn-outline-small" onClick={() => handleDeleteService(selectedService.id)} title="Delete service" style={{ color: '#ef4444' }}>
                                <MdDelete size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {summary && (
                <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper blue">
                            <MdPeople size={24} />
                        </div>
                        <div className="stat-details">
                            <h3>Total Members</h3>
                            <p className="stat-value">{summary.total_members}</p>
                            <span className="stat-trend">{summary.service_title}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper green">
                            <MdCheckCircle size={24} />
                        </div>
                        <div className="stat-details">
                            <h3>Present</h3>
                            <p className="stat-value">{summary.total_present}</p>
                            <span className="stat-trend positive">
                                {summary.total_members > 0 ? Math.round((summary.total_present / summary.total_members) * 100) : 0}% attendance
                            </span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                            <MdCancel size={24} />
                        </div>
                        <div className="stat-details">
                            <h3>Absent</h3>
                            <p className="stat-value">{summary.total_absent}</p>
                            <span className="stat-trend">
                                {summary.total_members > 0 ? Math.round((summary.total_absent / summary.total_members) * 100) : 0}% absent
                            </span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                            <MdBlock size={24} />
                        </div>
                        <div className="stat-details">
                            <h3>Excused</h3>
                            <p className="stat-value">{summary.total_excused}</p>
                            <span className="stat-trend">
                                {summary.total_members > 0 ? Math.round((summary.total_excused / summary.total_members) * 100) : 0}% excused
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="members-table-container">
                <div className="table-header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Member Registry</h2>
                        <div className="status-filter-tabs">
                            {(['all', 'present', 'absent', 'excused', 'unmarked'] as StatusFilter[]).map(f => (
                                <button
                                    key={f}
                                    className={`status-tab ${statusFilter === f ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(f)}
                                >
                                    {f === 'all' ? 'All' : f === 'unmarked' ? 'Unmarked' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    <span className="status-count">
                                        {f === 'all' ? totalCount :
                                         f === 'present' ? presentCount :
                                         f === 'absent' ? absentCount :
                                         f === 'excused' ? excusedCount : unmarkedCount}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="search-bar" style={{ minWidth: '200px' }}>
                            <MdSearch size={18} />
                            <input type="text" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <button className="btn-primary-small" onClick={() => handleBulkMark('present')} title="Mark all filtered as Present">
                            <MdCheckCircle size={16} /> All Present
                        </button>
                        <button className="btn-outline-small" onClick={() => handleBulkMark('absent')} title="Mark all filtered as Absent" style={{ color: '#ef4444' }}>
                            <MdCancel size={16} /> All Absent
                        </button>
                    </div>
                </div>

                <table className="members-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>Member</th>
                            <th style={{ width: '25%' }}>Role</th>
                            <th style={{ width: '20%' }}>Status</th>
                            <th style={{ width: '15%', textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 && (
                            <tr>
                                <td colSpan={4} className="empty-table">No members match your filter.</td>
                            </tr>
                        )}
                        {filteredRecords.map(record => {
                            const statusColors: Record<string, { bg: string; color: string }> = {
                                present: { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
                                absent: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
                                excused: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
                            };
                            const sc = record.status ? statusColors[record.status] : { bg: 'rgba(100,116,139,0.08)', color: '#64748b' };

                            return (
                                <tr key={record.member_id}>
                                    <td>
                                        <div className="member-info-cell">
                                            <div className="table-avatar" style={{ background: sc.bg, color: sc.color }}>
                                                {record.member_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{record.member_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="role-badge">{record.role.replace('_', ' ')}</span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${record.status === 'present' ? 'status-active' : record.status === 'absent' ? 'status-inactive' : record.status === 'excused' ? 'status-warning' : ''}`}
                                            style={record.status === null ? { background: 'rgba(100,116,139,0.1)', color: '#64748b' } : {}}>
                                            {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Not Recorded'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="btn-outline-small"
                                            onClick={() => handleMark(record.member_id, record.status)}
                                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', minWidth: '90px' }}
                                        >
                                            {record.status === null ? 'Mark Present' :
                                             record.status === 'present' ? 'Mark Absent' :
                                             record.status === 'absent' ? 'Excuse' : 'Reset'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showServiceModal && (
                <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <h2>{editService ? 'Edit Service' : 'Create New Service'}</h2>
                        <div className="form-group">
                            <label>Service Title</label>
                            <input type="text" placeholder="e.g. Sunday Morning Worship"
                                value={serviceForm.title}
                                onChange={e => setServiceForm({ ...serviceForm, title: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Service Date</label>
                            <input type="date" value={serviceForm.date}
                                onChange={e => setServiceForm({ ...serviceForm, date: e.target.value })} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-outline-small" onClick={() => setShowServiceModal(false)}>Cancel</button>
                            <button className="btn-primary" disabled={!serviceForm.title} onClick={handleSaveService}>
                                {editService ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .status-filter-tabs {
                    display: flex;
                    gap: 0.25rem;
                    background: rgba(0, 0, 0, 0.15);
                    padding: 0.2rem;
                    border-radius: 8px;
                }
                .status-tab {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.35rem 0.75rem;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    color: #94a3b8;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                    white-space: nowrap;
                }
                .status-tab:hover {
                    color: #f8fafc;
                    background: rgba(255, 255, 255, 0.05);
                }
                .status-tab.active {
                    background: var(--primary-blue);
                    color: white;
                }
                .status-count {
                    font-size: 0.7rem;
                    opacity: 0.7;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.05rem 0.4rem;
                    border-radius: 4px;
                }
                .status-tab.active .status-count {
                    background: rgba(255, 255, 255, 0.2);
                }
                .status-badge.status-warning {
                    background: rgba(245, 158, 11, 0.12);
                    color: #f59e0b;
                }
                .status-badge.status-inactive {
                    background: rgba(239, 68, 68, 0.12);
                    color: #ef4444;
                }
            `}</style>
        </div>
    );
};

export default AdminAttendance;
