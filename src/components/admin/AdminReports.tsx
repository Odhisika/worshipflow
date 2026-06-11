import React, { useState, useEffect } from 'react';
import {
    MdFileDownload, MdPeople, MdAttachMoney, MdShowChart,
    MdRefresh, MdCheckCircle, MdPersonAdd, MdDateRange
} from 'react-icons/md';
import { reportsApi, AnalyticsReport } from '../../api/reports';
import { serviceApi } from '../../api/services';
import { attendanceApi, ServiceAttendanceSummary } from '../../api/attendance';
import { useDataRefresh } from '../../context/DataRefreshContext';
import './AdminViews.css';

const AdminReports: React.FC = () => {
    const { refreshSignal } = useDataRefresh();
    const [report, setReport] = useState<AnalyticsReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [serviceSummaries, setServiceSummaries] = useState<ServiceAttendanceSummary[]>([]);

    useEffect(() => { loadData(); }, [refreshSignal]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await reportsApi.getAnalyticsReport();
            setReport(data);

            const allServices = await serviceApi.getAllServices();

            const summaries: ServiceAttendanceSummary[] = [];
            for (const s of allServices.slice(0, 20)) {
                try {
                    const stats = await attendanceApi.getAttendanceSummary(s.id);
                    summaries.push(stats);
                } catch { /* skip */ }
            }
            setServiceSummaries(summaries);
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = (type: 'attendance' | 'giving' | 'growth' | 'service') => {
        if (!report) return;

        let csv = '';
        let filename = '';

        if (type === 'attendance') {
            csv = 'Month,Attendance\n' + report.attendance_trends.map(t => `${t.month},${t.count}`).join('\n');
            filename = 'attendance_trends.csv';
        } else if (type === 'giving') {
            csv = 'Category,Total\n' + report.giving_summaries.map(g => `"${g.category}",${g.total}`).join('\n');
            filename = 'giving_summary.csv';
        } else if (type === 'growth') {
            csv = 'Period,New Members\n' + report.growth_metrics.map(m => `${m.period},${m.new_members}`).join('\n');
            filename = 'growth_metrics.csv';
        } else if (type === 'service') {
            csv = 'Service,Date,Present,Absent,Excused,Total Members,Attendance %\n' +
                serviceSummaries.map(s =>
                    `"${s.service_title}",${s.service_date},${s.total_present},${s.total_absent},${s.total_excused},${s.total_members},${s.total_members > 0 ? Math.round((s.total_present / s.total_members) * 100) : 0}%`
                ).join('\n');
            filename = 'service_attendance.csv';
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const topServices = [...serviceSummaries].sort((a, b) => b.total_present - a.total_present).slice(0, 10);

    const totalPresentAll = serviceSummaries.reduce((a, s) => a + s.total_present, 0);
    const totalAttendanceAll = serviceSummaries.reduce((a, s) => a + s.total_present + s.total_absent + s.total_excused, 0);
    const avgAttendanceRate = totalAttendanceAll > 0 ? Math.round((totalPresentAll / totalAttendanceAll) * 100) : 0;

    if (loading) {
        return <div className="admin-loading">Synthesizing Analytics...</div>;
    }

    const maxAttendance = report ? Math.max(...report.attendance_trends.map(t => t.count), 1) : 1;
    const maxGrowth = report ? Math.max(...report.growth_metrics.map(m => m.new_members), 1) : 1;
    const totalGiving = report ? report.giving_summaries.reduce((a, g) => a + g.total, 0) : 0;
    const totalGrowth = report ? report.growth_metrics.reduce((a, m) => a + m.new_members, 0) : 0;

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Strategic Insights</h1>
                    <p>Leverage data-driven intelligence to understand attendance, stewardship, and community impact.</p>
                </div>
                <div className="admin-controls">
                    <button className="btn-primary" onClick={loadData}>
                        <MdRefresh size={20} /> Refresh Data
                    </button>
                </div>
            </div>

            {report && (
                <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper green">
                            <MdCheckCircle size={24} />
                        </div>
                        <div className="stat-details">
                            <h3>Avg Attendance Rate</h3>
                            <p className="stat-value">{avgAttendanceRate}%</p>
                            <span className="stat-trend positive">Across all services</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper blue">
                            <MdPeople size={24} />
                        </div>
                        <div className="stat-details">
                            <h3>Total Attendance</h3>
                            <p className="stat-value">{totalPresentAll}</p>
                            <span className="stat-trend">From {serviceSummaries.length} services</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper green">
                            <MdAttachMoney size={24} />
                        </div>
                        <div className="stat-details">
                            <h3>Total Giving</h3>
                            <p className="stat-value">Ghc{totalGiving.toLocaleString()}</p>
                            <span className="stat-trend positive">Across {report.giving_summaries.length} categories</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper purple">
                            <MdPersonAdd size={24} />
                        </div>
                        <div className="stat-details">
                            <h3>New Members</h3>
                            <p className="stat-value">{totalGrowth}</p>
                            <span className="stat-trend">Last 12 months</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="members-grid">
                <div className="member-card">
                    <div className="member-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Attendance Trajectory</h3>
                            <MdPeople style={{ color: 'var(--primary-blue)' }} size={24} />
                        </div>
                        {report && report.attendance_trends.length > 0 ? (
                            <div className="chart-container" style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '200px', paddingBottom: '2rem' }}>
                                {[...report.attendance_trends].reverse().map((trend, i) => (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{trend.count}</span>
                                        <div
                                            style={{
                                                width: '100%',
                                                height: `${Math.max((trend.count / maxAttendance) * 100, 4)}%`,
                                                background: `linear-gradient(to top, ${i === report.attendance_trends.length - 1 ? 'var(--accent-green)' : 'var(--primary-blue)'}, ${i === report.attendance_trends.length - 1 ? '#34d399' : '#4c8cf5'})`,
                                                borderRadius: '4px 4px 0 0',
                                                transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                                                minHeight: '4px',
                                            }}
                                            title={`${trend.count} attendees`}
                                        />
                                        <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {trend.month}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>No attendance data recorded yet.</p>
                        )}
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Giving Distribution</h3>
                            <MdAttachMoney style={{ color: 'var(--accent-green)' }} size={24} />
                        </div>
                        {report && report.giving_summaries.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {report.giving_summaries.map((giving, i) => {
                                    const pct = totalGiving > 0 ? (giving.total / totalGiving) * 100 : 0;
                                    return (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                                <span style={{ fontWeight: 600 }}>{giving.category}</span>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Ghc{giving.total.toLocaleString()}</span>
                                            </div>
                                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${pct}%`, height: '100%',
                                                    background: `linear-gradient(90deg, var(--accent-green), #34d399)`,
                                                    borderRadius: '4px', transition: 'width 0.6s ease'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{pct.toFixed(1)}% of total</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>No giving data recorded yet.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="members-table-container" style={{ marginTop: '2.5rem' }}>
                <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Community Expansion</h2>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Monthly member signups (last 12 months)</span>
                    </div>
                    <MdShowChart style={{ color: 'var(--primary-blue)' }} size={24} />
                </div>
                {report && report.growth_metrics.length > 0 ? (
                    <div style={{ padding: '2rem', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '160px' }}>
                        {[...report.growth_metrics].reverse().map((growth, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{growth.new_members}</span>
                                <div style={{
                                    width: '100%',
                                    height: `${Math.max((growth.new_members / maxGrowth) * 100, 4)}%`,
                                    background: `linear-gradient(to top, #8b5cf6, #a78bfa)`,
                                    borderRadius: '4px', transition: 'height 0.8s ease',
                                    minHeight: '4px',
                                }} title={`${growth.new_members} new members`} />
                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{growth.period}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>No growth data recorded yet.</p>
                )}
            </div>

            {topServices.length > 0 && (
                <div className="members-table-container" style={{ marginTop: '2.5rem' }}>
                    <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Service Attendance Breakdown</h2>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Attendance per service</span>
                        </div>
                        <MdDateRange style={{ color: 'var(--primary-blue)' }} size={24} />
                    </div>
                    <table className="members-table">
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Date</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Excused</th>
                                <th>Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topServices.map((s) => {
                                const rate = s.total_members > 0 ? Math.round((s.total_present / s.total_members) * 100) : 0;
                                return (
                                    <tr key={s.service_id}>
                                        <td style={{ fontWeight: 600 }}>{s.service_title}</td>
                                        <td style={{ color: '#94a3b8' }}>{new Date(s.service_date).toLocaleDateString()}</td>
                                        <td style={{ color: '#34d399', fontWeight: 600 }}>{s.total_present}</td>
                                        <td style={{ color: '#ef4444' }}>{s.total_absent}</td>
                                        <td style={{ color: '#f59e0b' }}>{s.total_excused}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px', maxWidth: '80px' }}>
                                                    <div style={{ width: `${rate}%`, height: '100%', background: rate >= 70 ? 'var(--accent-green)' : rate >= 40 ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: rate >= 70 ? '#34d399' : rate >= 40 ? '#f59e0b' : '#ef4444' }}>{rate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn-primary-small" onClick={() => exportCSV('attendance')}>
                    <MdFileDownload /> Export Attendance Trends
                </button>
                <button className="btn-primary-small" onClick={() => exportCSV('giving')}>
                    <MdFileDownload /> Export Giving Summary
                </button>
                <button className="btn-primary-small" onClick={() => exportCSV('growth')}>
                    <MdFileDownload /> Export Growth Metrics
                </button>
                <button className="btn-primary-small" onClick={() => exportCSV('service')}>
                    <MdFileDownload /> Export Service Breakdown
                </button>
            </div>
        </div>
    );
};

export default AdminReports;
