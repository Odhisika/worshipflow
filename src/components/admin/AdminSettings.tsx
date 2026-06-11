import React, { useState, useEffect } from 'react';
import {
    MdSettings, MdBusiness, MdLanguage, MdPalette,
    MdSave, MdRefresh, MdLocationOn, MdPhone, MdEmail, MdLanguage as MdLangIcon,
    MdLock, MdImage, MdDelete, MdCheckCircle, MdError
} from 'react-icons/md';
import { settingsApi, AppConfig } from '../../api/settings';
import { authApi } from '../../api/auth';
import { churchSettingsApi } from '../../api/churchSettings';
import { mediaApi } from '../../api/media';
import './AdminViews.css';

const AdminSettings: React.FC = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'profile' | 'localization' | 'system' | 'security'>('profile');

    const [logoPreview, setLogoPreview] = useState<string>('');
    const [logoPath, setLogoPath] = useState<string>('');
    const [logoLoading, setLogoLoading] = useState(false);

    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [changingEmail, setChangingEmail] = useState(false);
    const [emailData, setEmailData] = useState({ password: '', new_email: '' });
    const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        if (config?.church_logo) {
            setLogoPath(config.church_logo);
            mediaApi.getLocalImageUrl(config.church_logo).then(url => setLogoPreview(url));
        }
    }, [config?.church_logo]);

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
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleChooseLogo = async () => {
        try {
            const paths = await mediaApi.openMediaFileDialog('image');
            if (paths.length > 0) {
                const path = paths[0];
                setLogoLoading(true);
                setLogoPath(path);
                const url = await mediaApi.getLocalImageUrl(path);
                setLogoPreview(url);
                setLogoLoading(false);

                if (config) {
                    setConfig({ ...config, church_logo: path });
                }

                await settingsApi.updateSetting({ key: 'church_logo', value: path });
                churchSettingsApi.save({ churchLogoPath: path });
            }
        } catch (error) {
            console.error('Failed to choose logo:', error);
            setLogoLoading(false);
        }
    };

    const handleRemoveLogo = async () => {
        setLogoPath('');
        setLogoPreview('');
        if (config) {
            setConfig({ ...config, church_logo: undefined });
        }
        await settingsApi.updateSetting({ key: 'church_logo', value: '' });
        churchSettingsApi.save({ churchLogoPath: null });
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg(null);

        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        if (passwordData.new_password.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setChangingPassword(true);
        try {
            const msg = await authApi.changePassword({
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
            });
            setPasswordMsg({ type: 'success', text: msg });
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err: any) {
            setPasswordMsg({ type: 'error', text: err as string || 'Failed to change password' });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailMsg(null);

        if (!emailData.new_email.includes('@')) {
            setEmailMsg({ type: 'error', text: 'Please enter a valid email address' });
            return;
        }

        setChangingEmail(true);
        try {
            const msg = await authApi.changeEmail({
                password: emailData.password,
                new_email: emailData.new_email,
            });
            setEmailMsg({ type: 'success', text: msg });
            setEmailData({ password: '', new_email: '' });
        } catch (err: any) {
            setEmailMsg({ type: 'error', text: err as string || 'Failed to change email' });
        } finally {
            setChangingEmail(false);
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
                <button
                    className={`tab-btn ${activeSection === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveSection('security')}
                >
                    <MdLock /> Security
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
                                    <label>Church Logo</label>
                                    <div className="logo-upload-area">
                                        <div className="logo-preview-box">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Church Logo" className="logo-preview-img" />
                                            ) : (
                                                <div className="logo-placeholder">
                                                    <MdImage size={32} />
                                                    <span>No logo</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="logo-upload-actions">
                                            <button type="button" className="btn-primary-small" onClick={handleChooseLogo} disabled={logoLoading}>
                                                {logoLoading ? 'Loading...' : 'Choose Logo'}
                                            </button>
                                            {logoPath && (
                                                <button type="button" className="btn-outline-small" onClick={handleRemoveLogo} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                                                    <MdDelete size={16} /> Remove
                                                </button>
                                            )}
                                            <p className="logo-hint">Recommended: 256x256px PNG or SVG with transparent background</p>
                                        </div>
                                    </div>
                                </div>

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

                    {activeSection === 'security' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
                            <div className="member-card">
                                <div className="member-card-body">
                                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <MdLock color="var(--primary-blue)" /> Change Password
                                    </h3>
                                    {passwordMsg && (
                                        <div className={`msg-box ${passwordMsg.type}`}>
                                            {passwordMsg.type === 'success' ? <MdCheckCircle size={18} /> : <MdError size={18} />}
                                            {passwordMsg.text}
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Current Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.current_password}
                                            onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                            placeholder="Enter current password"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>New Password</label>
                                            <input
                                                type="password"
                                                value={passwordData.new_password}
                                                onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={passwordData.confirm_password}
                                                onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={handleChangePassword}
                                        disabled={changingPassword || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
                                        style={{ marginTop: '0.5rem' }}
                                    >
                                        {changingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>

                            <div className="member-card">
                                <div className="member-card-body">
                                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <MdEmail color="var(--primary-blue)" /> Change Admin Email
                                    </h3>
                                    {emailMsg && (
                                        <div className={`msg-box ${emailMsg.type}`}>
                                            {emailMsg.type === 'success' ? <MdCheckCircle size={18} /> : <MdError size={18} />}
                                            {emailMsg.text}
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Current Password</label>
                                        <input
                                            type="password"
                                            value={emailData.password}
                                            onChange={e => setEmailData({ ...emailData, password: e.target.value })}
                                            placeholder="Enter your password to confirm"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>New Email Address</label>
                                        <input
                                            type="email"
                                            value={emailData.new_email}
                                            onChange={e => setEmailData({ ...emailData, new_email: e.target.value })}
                                            placeholder="Enter new admin email"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={handleChangeEmail}
                                        disabled={changingEmail || !emailData.password || !emailData.new_email}
                                        style={{ marginTop: '0.5rem' }}
                                    >
                                        {changingEmail ? 'Updating...' : 'Update Email'}
                                    </button>
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
                .logo-upload-area {
                    display: flex;
                    gap: 1.5rem;
                    align-items: flex-start;
                    padding: 1.25rem;
                    background: rgba(0, 0, 0, 0.15);
                    border: 1px dashed rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                }
                .logo-preview-box {
                    width: 100px;
                    height: 100px;
                    border-radius: 10px;
                    overflow: hidden;
                    background: rgba(0, 0, 0, 0.3);
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .logo-preview-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .logo-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.3rem;
                    color: #64748b;
                    font-size: 0.75rem;
                }
                .logo-upload-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: flex-start;
                }
                .logo-hint {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin: 0;
                }
                .msg-box {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    margin-bottom: 1.25rem;
                }
                .msg-box.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                .msg-box.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
            `}</style>
        </div>
    );
};

export default AdminSettings;