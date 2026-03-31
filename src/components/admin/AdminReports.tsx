import React, { useState, useEffect } from 'react';
import { MdTrendingUp, MdFileDownload, MdPeople, MdAttachMoney, MdShowChart } from 'react-icons/md';
import { reportsApi, AnalyticsReport } from '../../api/reports';
import './AdminViews.css';

const AdminReports: React.FC = () => {
    const [report, setReport] = useState<AnalyticsReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        try {
            const data = await reportsApi.getAnalyticsReport();
            setReport(data);
        } catch (error) {
            console.error('Failed to load analytics report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (type: string) => {
        if (!report) return;
        let data: any = [];
        let filename = 'report.json';

        if (type === 'attendance') {
            data = report.attendance_trends;
            filename = 'attendance_trends.json';
        } else if (type === 'giving') {
            data = report.giving_summaries;
            filename = 'giving_summary.json';
        } else if (type === 'growth') {
            data = report.growth_metrics;
            filename = 'growth_metrics.json';
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="admin-loading">Synthesizing Analytics...</div>;
    }

    const maxAttendance = report ? Math.max(...report.attendance_trends.map(t => t.count), 1) : 1;
    const maxGrowth = report ? Math.max(...report.growth_metrics.map(m => m.new_members), 1) : 1;

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Strategic Insights</h1>
                    <p>Leverage data-driven intelligence to understand attendance, stewardship, and community impact.</p>
                </div>
                <div className="admin-controls">
                    <button className="btn-primary" onClick={loadReport}>
                        <MdTrendingUp size={20} /> Refresh Data
                    </button>
                </div>
            </div>

            <div className="members-grid">
                <div className="member-card">
                    <div className="member-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Attendance Trajectory</h3>
                            <MdPeople style={{ color: 'var(--primary-blue)' }} size={24} />
                        </div>
                        <div className="chart-container" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '180px', paddingBottom: '2rem' }}>
                            {report?.attendance_trends.map((trend, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <div
                                        style={{
                                            width: '100%',
                                            height: `${(trend.count / maxAttendance) * 100}%`,
                                            background: 'linear-gradient(to top, var(--primary-blue), #4c8cf5)',
                                            borderRadius: '6px 6px 0 0',
                                            transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }}
                                        title={`${trend.count} attendees`}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', transform: 'rotate(-45deg)', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                                        {trend.month}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Giving Distribution</h3>
                            <MdAttachMoney style={{ color: 'var(--accent-green)' }} size={24} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {report?.giving_summaries.map((giving, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                                        <span style={{ fontWeight: '600' }}>{giving.category}</span>
                                        <span style={{ color: 'var(--text-primary)' }}>Ghc{giving.total.toLocaleString()}</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'var(--bg-lighter)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                width: `${(giving.total / (report.giving_summaries.reduce((acc, curr) => acc + curr.total, 0) || 1)) * 100}%`,
                                                height: '100%',
                                                background: 'var(--accent-green)',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {report?.giving_summaries.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '2rem' }}>No giving data recorded.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="members-table-container" style={{ marginTop: '2.5rem' }}>
                <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Community Expansion (Monthly Signups)</h2>
                        <span className="status-badge status-info" style={{ fontSize: '0.75rem' }}>Growth Metrics</span>
                    </div>
                    <MdShowChart style={{ color: 'var(--primary-blue)' }} size={24} />
                </div>
                <div style={{ padding: '2rem', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '150px' }}>
                    {report?.growth_metrics.map((growth, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                                style={{
                                    width: '100%',
                                    height: `${(growth.new_members / maxGrowth) * 100}%`,
                                    background: 'rgba(26, 115, 232, 0.1)',
                                    border: '1px solid var(--primary-blue)',
                                    borderRadius: '4px',
                                    transition: 'height 0.8s ease'
                                }}
                                title={`${growth.new_members} new members`}
                            />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{growth.period}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={() => handleExport('attendance')}>
                    <MdFileDownload /> Export Attendance
                </button>
                <button className="btn-secondary" onClick={() => handleExport('giving')}>
                    <MdFileDownload /> Export Stewardship
                </button>
                <button className="btn-secondary" onClick={() => handleExport('growth')}>
                    <MdFileDownload /> Export Growth
                </button>
            </div>
        </div>
    );
};

export default AdminReports;
