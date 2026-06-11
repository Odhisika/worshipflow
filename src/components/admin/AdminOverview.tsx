import React, { useState, useEffect } from 'react';
import { MdPeople, MdAttachMoney, MdEvent, MdGroup, MdTrendingUp } from 'react-icons/md';
import { overviewApi, SystemStats, RecentActivity } from '../../api/overview';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

const AdminOverview: React.FC = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const { refreshSignal } = useDataRefresh();

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                try {
                    const statsData = await overviewApi.getSystemStats();
                    setStats(statsData);
                } catch (e) {
                    console.error('Failed to load system stats:', e);
                }
                try {
                    const activityData = await overviewApi.getRecentActivity();
                    setActivities(activityData);
                } catch (e) {
                    console.error('Failed to load recent activity:', e);
                }
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [refreshSignal]);

    const formatCurrency = (amount: number) => {
        const formatted = new Intl.NumberFormat('en-GH', {
            maximumFractionDigits: 0
        }).format(amount);
        return `Ghc ${formatted}`;
    };

    if (loading) {
        return <div className="admin-loading">Assembling Dashboard Data...</div>;
    }

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>System Overview</h1>
                    <p>Welcome back! Here's a summary of today's church activities.</p>
                </div>
                <div className="admin-controls">
                    <button className="btn-primary">
                        <MdTrendingUp size={20} /> Dashboard Insights
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="members-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="member-card">
                    <div className="member-card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="table-avatar" style={{ width: '56px', height: '56px', background: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary-blue)' }}>
                            <MdPeople size={28} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Total Members</p>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>{stats?.total_members.toLocaleString() || 0}</h3>
                            <p style={{ color: 'var(--accent-green)', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: '600' }}>
                                +{stats?.members_growth || 0} this month
                            </p>
                        </div>
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="table-avatar" style={{ width: '56px', height: '56px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}>
                            <MdAttachMoney size={28} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Weekly Giving</p>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>{formatCurrency(stats?.weekly_giving || 0)}</h3>
                            <p style={{ color: 'var(--accent-green)', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: '600' }}>
                                Trend: +{stats?.giving_trend}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="table-avatar" style={{ width: '56px', height: '56px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary-blue)' }}>
                            <MdEvent size={28} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Upcoming Events</p>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>{stats?.upcoming_events || 0}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                Next: {stats?.next_event_title}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="table-avatar" style={{ width: '56px', height: '56px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                            <MdGroup size={28} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Active Groups</p>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>{stats?.active_groups || 0}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{stats?.total_participants || 0} participants</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Sections */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="members-table-container">
                    <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Recent Activity</h2>
                        <button className="btn-outline-small">Log Insights</button>
                    </div>
                    <div style={{ padding: '0.5rem' }}>
                        {activities.length > 0 ? activities.map((item, idx) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: idx === activities.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                                <div className="table-avatar" style={{
                                    background: 'var(--bg-lighter)',
                                    color: item.type === 'finance' ? 'var(--accent-green)' : 'var(--primary-blue)',
                                    width: '40px',
                                    height: '40px',
                                    fontSize: '0.85rem'
                                }}>
                                    {item.type === 'finance' ? <MdAttachMoney /> : <MdPeople />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.9rem', margin: 0 }}>
                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.name}</span>
                                        <span style={{ color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>{item.action}</span>
                                    </p>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(item.time).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No recent activity found.
                            </div>
                        )}
                    </div>
                </div>

                <div className="members-table-container">
                    <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>System Priority</h2>
                    </div>
                    <div style={{ padding: '1rem' }}>
                        {[
                            { label: 'Verify recent member registrations', count: stats?.members_growth || 0, done: false },
                            { label: 'Check upcoming event logistics', done: false },
                            { label: 'Monitor weekly giving variance', done: true },
                            { label: 'Update group participation lists', done: false }
                        ].map((task, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.5rem', opacity: task.done ? 0.6 : 1 }}>
                                <input type="checkbox" checked={task.done} readOnly style={{ width: '18px', height: '18px', accentColor: 'var(--primary-blue)' }} />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', textDecoration: task.done ? 'line-through' : 'none' }}>
                                    {task.label} {task.count && task.count > 0 ? <span className="status-badge status-info" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', marginLeft: '0.5rem' }}>{task.count}</span> : null}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
