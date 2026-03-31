import React, { useState, useEffect } from 'react';
import {
    MdSettings, MdBusiness, MdLanguage, MdPalette,
    MdSave, MdRefresh, MdLocationOn, MdPhone, MdEmail, MdLanguage as MdLangIcon
} from 'react-icons/md';
import { settingsApi, AppConfig } from '../../api/settings';
import './AdminViews.css';

const AdminSettings: React.FC = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'profile' | 'localization' | 'system'>('profile');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await settingsApi.getAppConfig();
            setConfig(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;

        setSaving(true);
        try {
            const batch = Object.entries(config).map(([key, value]) => ({
                key,
                value: String(value)
            }));
            await settingsApi.updateSettingsBatch(batch);
            // Show success (perhaps a toast in a real app)
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="admin-loading">Configuring System...</div>;
    if (!config) return <div>Error loading configuration.</div>;

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div>
                    <h1>System Settings</h1>
                    <p>Manage church branding, localization, and core application behavior.</p>
                </div>
                <div className="admin-controls">
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <MdRefresh className="animate-spin" /> : <MdSave size={20} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="view-tabs">
                <button
                    className={`tab-btn ${activeSection === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveSection('profile')}
                >
                    <MdBusiness /> Church Profile
                </button>
                <button
                    className={`tab-btn ${activeSection === 'localization' ? 'active' : ''}`}
                    onClick={() => setActiveSection('localization')}
                >
                    <MdLanguage /> Localization
                </button>
                <button
                    className={`tab-btn ${activeSection === 'system' ? 'active' : ''}`}
                    onClick={() => setActiveSection('system')}
                >
                    <MdSettings /> System Preferences
                </button>
            </div>

            <div className="settings-content animate-slide-up">
                <form onSubmit={handleSave}>
                    {activeSection === 'profile' && (
                        <div className="member-card" style={{ maxWidth: '800px' }}>
                            <div className="member-card-body">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MdBusiness color="var(--primary-blue)" /> Church Branding
                                </h3>

                                <div className="form-group">
                                    <label>Church Name</label>
                                    <input
                                        type="text"
                                        value={config.church_name}
                                        onChange={e => setConfig({ ...config, church_name: e.target.value })}
                                        placeholder="Enter church name"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label><MdPhone size={14} /> Phone Number</label>
                                        <input
                                            type="text"
                                            value={config.church_phone || ''}
                                            onChange={e => setConfig({ ...config, church_phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><MdEmail size={14} /> Official Email</label>
                                        <input
                                            type="email"
                                            value={config.church_email || ''}
                                            onChange={e => setConfig({ ...config, church_email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label><MdLocationOn size={14} /> Physical Address</label>
                                    <textarea
                                        rows={3}
                                        value={config.church_address || ''}
                                        onChange={e => setConfig({ ...config, church_address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'localization' && (
                        <div className="member-card" style={{ maxWidth: '800px' }}>
                            <div className="member-card-body">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MdLangIcon color="var(--primary-blue)" /> Regional Settings
                                </h3>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Primary Currency</label>
                                        <select
                                            value={config.currency}
                                            onChange={e => setConfig({ ...config, currency: e.target.value })}
                                        >
                                            <option value="Ghc">Ghanaian Cedi (Ghc)</option>
                                            <option value="USD">US Dollar ($)</option>
                                            <option value="EUR">Euro (€)</option>
                                            <option value="GBP">British Pound (£)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>System Language</label>
                                        <select
                                            value={config.language}
                                            onChange={e => setConfig({ ...config, language: e.target.value })}
                                        >
                                            <option value="English">English</option>
                                            <option value="French">French</option>
                                            <option value="Spanish">Spanish</option>
                                            <option value="Twi">Akan (Twi)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'system' && (
                        <div className="member-card" style={{ maxWidth: '800px' }}>
                            <div className="member-card-body">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MdPalette color="var(--primary-blue)" /> Application Behavior
                                </h3>

                                <div className="form-group">
                                    <label>UI Theme</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <button
                                            type="button"
                                            className={`btn-outline-small ${config.theme === 'dark' ? 'active' : ''}`}
                                            style={config.theme === 'dark' ? { borderColor: 'var(--primary-blue)', background: 'var(--primary-blue-light)' } : {}}
                                            onClick={() => setConfig({ ...config, theme: 'dark' })}
                                        >
                                            Dark Mode
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-outline-small ${config.theme === 'light' ? 'active' : ''}`}
                                            style={config.theme === 'light' ? { borderColor: 'var(--primary-blue)', background: 'var(--primary-blue-light)' } : {}}
                                            onClick={() => setConfig({ ...config, theme: 'light' })}
                                        >
                                            Light Mode
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            style={{ width: '20px', height: '20px' }}
                                            checked={config.checkin_proximity_enabled}
                                            onChange={e => setConfig({ ...config, checkin_proximity_enabled: e.target.checked })}
                                        />
                                        <div>
                                            <label style={{ margin: 0 }}>Enable Proximity Check-in</label>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Restrict child check-in to authorized locations only.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            <style>{`
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AdminSettings;
