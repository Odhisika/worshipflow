import React, { useState, useEffect } from 'react';
import { MdEvent, MdShowChart, MdSearch, MdAdd } from 'react-icons/md';
import { serviceApi, Service } from '../../api/services';
import { memberApi, Member } from '../../api/members';
import { attendanceApi, AttendanceRecord, ServiceAttendanceSummary } from '../../api/attendance';
import './AdminViews.css';

const AdminAttendance: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<ServiceAttendanceSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [newService, setNewService] = useState({ title: '', date: new Date().toISOString().split('T')[0] });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedServiceId) {
            loadAttendance(selectedServiceId);
        }
    }, [selectedServiceId]);

    const loadData = async () => {
        try {
            const [servicesData, membersData] = await Promise.all([
                serviceApi.getAllServices(),
                memberApi.getMembers()
            ]);
            setServices(servicesData);
            setMembers(membersData);
            if (servicesData.length > 0 && !selectedServiceId) {
                setSelectedServiceId(servicesData[0].id);
            }
        } catch (error) {
            console.error('Failed to load attendance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAttendance = async (serviceId: string) => {
        try {
            const [records, stats] = await Promise.all([
                attendanceApi.getServiceAttendance(serviceId),
                attendanceApi.getAttendanceSummary(serviceId)
            ]);
            setAttendance(records);
            setSummary(stats);
        } catch (error) {
            console.error('Failed to load attendance records:', error);
        }
    };

    const handleMarkAttendance = async (memberId: string, status: 'present' | 'absent') => {
        if (!selectedServiceId) return;
        try {
            await attendanceApi.markAttendance({
                service_id: selectedServiceId,
                member_id: memberId,
                status
            });
            loadAttendance(selectedServiceId);
        } catch (error) {
            console.error('Failed to mark attendance:', error);
        }
    };

    const handleCreateService = async () => {
        try {
            const service = await serviceApi.createService(newService);
            setServices([service, ...services]);
            setSelectedServiceId(service.id);
            setShowServiceModal(false);
            setNewService({ title: '', date: new Date().toISOString().split('T')[0] });
        } catch (error) {
            console.error('Failed to create service:', error);
        }
    };

    const filteredMembers = members.filter(m =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatus = (memberId: string) => {
        return attendance.find(a => a.member_id === memberId)?.status;
    };

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
                    <button className="btn-outline-small" onClick={() => setShowServiceModal(true)}>
                        <MdAdd size={20} /> Create Service
                    </button>
                    <select
                        className="btn-outline-small"
                        style={{ padding: '0.4rem 1rem', background: 'var(--bg-lighter)', color: 'var(--text-primary)' }}
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                    >
                        {services.map(s => (
                            <option key={s.id} value={s.id}>{s.title} ({new Date(s.date).toLocaleDateString()})</option>
                        ))}
                    </select>
                </div>
            </div>

            {summary && (
                <div className="members-grid" style={{ marginBottom: '2.5rem' }}>
                    <div className="member-card">
                        <div className="member-card-body">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
                                <MdEvent size={20} style={{ color: 'var(--primary-blue)' }} /> Selected Service
                            </div>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>{summary.service_title}</h4>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-blue)', letterSpacing: '-0.02em' }}>
                                {summary.total_present}
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Present out of {summary.total_members} active members</p>
                        </div>
                    </div>

                    <div className="member-card">
                        <div className="member-card-body">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
                                <MdShowChart size={20} style={{ color: 'var(--accent-green)' }} /> Engagement Rate
                            </div>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Live Metric</h4>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--accent-green)', letterSpacing: '-0.02em' }}>
                                {summary.total_members > 0 ? Math.round((summary.total_present / summary.total_members) * 100) : 0}%
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Real-time service data</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="members-table-container">
                <div className="table-header-row" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Live Check-In Registry</h2>
                    <div className="search-bar">
                        <MdSearch size={20} />
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <table className="members-table">
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMembers.map(member => {
                            const status = getStatus(member.id);
                            return (
                                <tr key={member.id} className={status === 'present' ? 'row-active' : ''}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="table-avatar" style={{ background: 'var(--bg-lighter)' }}>
                                                {member.first_name[0]}{member.last_name[0]}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{member.first_name} {member.last_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${status === 'present' ? 'status-active' : 'status-pending'}`}>
                                            {status === 'present' ? 'Present' : 'Not Recorded'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {status !== 'present' ? (
                                            <button
                                                className="btn-primary"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                onClick={() => handleMarkAttendance(member.id, 'present')}
                                            >
                                                Mark Present
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-outline-small"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                                onClick={() => handleMarkAttendance(member.id, 'absent')}
                                            >
                                                Undo
                                            </button>
                                        )}
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
                        <h2>Create New Service</h2>
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label>Service Title</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Sunday Morning Worship"
                                value={newService.title}
                                onChange={e => setNewService({ ...newService, title: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label>Service Date</label>
                            <input
                                type="date"
                                className="form-control"
                                value={newService.date}
                                onChange={e => setNewService({ ...newService, date: e.target.value })}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-outline-small" onClick={() => setShowServiceModal(false)}>Cancel</button>
                            <button
                                className="btn-primary"
                                disabled={!newService.title}
                                onClick={handleCreateService}
                            >
                                Create Service
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAttendance;
