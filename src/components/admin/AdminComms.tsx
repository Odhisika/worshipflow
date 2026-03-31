import React, { useState, useEffect } from 'react';
import { MdEmail, MdSms, MdCampaign, MdDelete, MdSend, MdSchedule } from 'react-icons/md';
import { communicationsApi, Campaign, SubscriberStats, CreateCampaignRequest } from '../../api/communications';
import './AdminViews.css';

const AdminComms: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [stats, setStats] = useState<SubscriberStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<CreateCampaignRequest>({
        name: '',
        campaign_type: 'Email',
        content: '',
        scheduled_at: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [campaignData, statData] = await Promise.all([
                communicationsApi.getCampaigns(),
                communicationsApi.getSubscriberStats()
            ]);
            setCampaigns(campaignData);
            setStats(statData);
        } catch (error) {
            console.error('Failed to load communications data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async () => {
        try {
            await communicationsApi.createCampaign({
                ...formData,
                scheduled_at: formData.scheduled_at || undefined
            });
            setShowModal(false);
            setFormData({ name: '', campaign_type: 'Email', content: '', scheduled_at: '' });
            loadData();
        } catch (error) {
            console.error('Failed to create campaign:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this campaign?')) return;
        try {
            await communicationsApi.deleteCampaign(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete campaign:', error);
        }
    };

    if (loading) {
        return <div className="admin-loading">Loading Communications Center...</div>;
    }

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>Communications Center</h1>
                    <p>Send targeted emails, SMS messages, and automated announcements to your congregation.</p>
                </div>
                <div className="admin-controls">
                    <button className="btn-outline-small" onClick={() => { setFormData({ ...formData, campaign_type: 'SMS' }); setShowModal(true); }}>
                        <MdSms size={20} /> New SMS
                    </button>
                    <button className="btn-primary" onClick={() => { setFormData({ ...formData, campaign_type: 'Email' }); setShowModal(true); }}>
                        <MdEmail size={20} /> New Campaign
                    </button>
                </div>
            </div>

            <div className="members-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="member-card">
                    <div className="member-card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div className="table-avatar" style={{ background: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary-blue)' }}>
                            <MdEmail size={22} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Email Subscribers</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>{stats?.email_subscribers || 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div className="table-avatar" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}>
                            <MdSms size={22} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>SMS Subscribers</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>{stats?.sms_subscribers || 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="member-card">
                    <div className="member-card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div className="table-avatar" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                            <MdCampaign size={22} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Avg. Open Rate</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>{(stats?.avg_open_rate || 0).toFixed(1)}%</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="members-table-container">
                <div className="table-header-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Recent Campaigns</h2>
                </div>
                <table className="members-table">
                    <thead>
                        <tr>
                            <th>Campaign Name</th>
                            <th>Type</th>
                            <th>Recipients</th>
                            <th>Engagement</th>
                            <th>Status/Date</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No campaigns found. Start by creating a new one.
                                </td>
                            </tr>
                        ) : campaigns.map((camp) => (
                            <tr key={camp.id}>
                                <td>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{camp.name}</div>
                                </td>
                                <td>
                                    <div className="status-badge status-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                                        {camp.campaign_type === 'Email' ? <MdEmail /> : <MdSms />}
                                        {camp.campaign_type}
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{camp.recipient_count}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Open: <b style={{ color: 'var(--text-primary)' }}>{(camp.open_rate * 100).toFixed(0)}%</b></span>
                                        <span style={{ color: 'var(--text-muted)' }}>Click: <b style={{ color: 'var(--text-primary)' }}>{(camp.click_rate * 100).toFixed(0)}%</b></span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        <span className={`status-badge ${camp.status === 'Sent' ? 'status-active' : 'status-info'}`} style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                                            {camp.status}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {camp.sent_at ? new Date(camp.sent_at).toLocaleDateString() : (camp.scheduled_at ? `Scheduled: ${new Date(camp.scheduled_at).toLocaleDateString()}` : 'Draft')}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-outline-small" style={{ padding: '0.3rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => handleDelete(camp.id)}>
                                        <MdDelete size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>New {formData.campaign_type} Campaign</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Draft your message and choose your delivery options.</p>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label>Campaign Name</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Weekly Announcement - Nov 5"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label>Message Content</label>
                            <textarea
                                className="form-control"
                                rows={6}
                                placeholder={formData.campaign_type === 'Email' ? 'Write your email body here...' : 'Compose your SMS message (max 160 chars recommended)...'}
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label>Schedule Delivery (Optional)</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={formData.scheduled_at}
                                onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                            />
                        </div>

                        <div className="modal-actions" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                            <button className="btn-outline-small" onClick={() => setShowModal(false)}>Cancel</button>
                            <button
                                className="btn-primary"
                                disabled={!formData.name || !formData.content}
                                onClick={handleCreateCampaign}
                            >
                                {formData.scheduled_at ? <><MdSchedule /> Schedule</> : <><MdSend /> Save Draft</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminComms;
