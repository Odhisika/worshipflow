import React, { useState, useEffect } from 'react';
import { MdCheckCircle, MdPrint, MdFamilyRestroom, MdChildCare, MdRefresh } from 'react-icons/md';
import { checkInApi, CheckIn } from '../../api/checkin';
import CheckInKiosk from './CheckInKiosk';
import './AdminViews.css';

const AdminCheckIn: React.FC = () => {
    const [showKiosk, setShowKiosk] = useState(false);
    const [activeCheckins, setActiveCheckins] = useState<CheckIn[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCheckins = async () => {
        setLoading(true);
        try {
            const data = await checkInApi.getActiveCheckins();
            setActiveCheckins(data);
        } catch (error) {
            console.error('Failed to fetch check-ins:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCheckins();
        // Poll every 30 seconds for real-time updates
        const interval = setInterval(fetchCheckins, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Check-In Security</h1>
                    <p>Secure child and ministry check-in system with integrated tag printing and safety monitoring.</p>
                </div>
                <div className="admin-controls">
                    <button className="btn-outline-small" onClick={fetchCheckins}>
                        <MdRefresh size={20} /> Refresh
                    </button>
                    <button className="btn-outline-small">
                        <MdPrint size={20} /> Printer Setup
                    </button>
                    <button className="btn-primary" style={{ background: '#f59e0b' }} onClick={() => setShowKiosk(true)}>
                        <MdCheckCircle size={20} /> Launch Kiosk
                    </button>
                </div>
            </div>

            <div className="members-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="member-card">
                    <div className="member-card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            <div className="table-avatar" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                                <MdChildCare size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Active Check-Ins</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Current Session Overview</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(120px, 1fr)', gap: '1rem' }}>
                            <div style={{ background: 'var(--bg-lighter)', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                                <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary-blue)', marginBottom: '0.25rem' }}>{activeCheckins.length}</p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Active</span>
                            </div>
                            <div style={{ background: 'var(--bg-lighter)', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                                <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#8b5cf6', marginBottom: '0.25rem' }}>{new Set(activeCheckins.map(c => c.member_id)).size}</p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Unique Children</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            <div className="table-avatar" style={{ background: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary-blue)' }}>
                                <MdFamilyRestroom size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Infrastructure Health</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Peripheral & Security status</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { name: 'Lobby Kiosk 1 Printer', status: 'Online & Ready', color: 'var(--accent-green)' },
                                { name: 'Kids Area Printer', status: 'Online & Ready', color: 'var(--accent-green)' },
                                { name: 'Background Checks Sync', status: 'Last synced 2h ago', color: 'var(--text-muted)' }
                            ].map((item, idx) => (
                                <div key={idx} style={{ background: 'var(--bg-lighter)', padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-light)' }}>
                                    <div>
                                        <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.name}</p>
                                        <span style={{ fontSize: '0.8rem', color: item.color }}>{item.status}</span>
                                    </div>
                                    <MdCheckCircle size={18} style={{ color: item.color === 'var(--accent-green)' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="member-card">
                <div className="member-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Live Check-In Registry</h3>
                        {loading && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Refreshing...</span>}
                    </div>
                    <div className="members-table-container">
                        <table className="members-table">
                            <thead>
                                <tr>
                                    <th>Child Name</th>
                                    <th>Location</th>
                                    <th>Check-In Time</th>
                                    <th>Security Code</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeCheckins.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            No children currently checked in.
                                        </td>
                                    </tr>
                                ) : (
                                    activeCheckins.map(checkin => (
                                        <tr key={checkin.id}>
                                            <td style={{ fontWeight: '600' }}>{checkin.member_name}</td>
                                            <td>{checkin.location || 'N/A'}</td>
                                            <td>{new Date(checkin.check_in_time).toLocaleTimeString()}</td>
                                            <td>
                                                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                    {checkin.security_code}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="status-badge status-active">Active</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showKiosk && (
                <CheckInKiosk onClose={() => {
                    setShowKiosk(false);
                    fetchCheckins();
                }} />
            )}
        </div>
    );
};

export default AdminCheckIn;
