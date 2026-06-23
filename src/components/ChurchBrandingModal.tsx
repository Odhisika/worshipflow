import React, { useState } from 'react';
import { emit } from '@tauri-apps/api/event';
import { churchSettingsApi, ChurchSettings, PresentationStyle } from '../api/churchSettings';
import { mediaApi } from '../api/media';
import { MdCameraAlt, MdClose, MdPalette, MdSubtitles, MdTextFields, MdCheckCircle, MdColorLens } from 'react-icons/md';
import './ChurchBrandingModal.css';

interface Props {
  onClose: () => void;
}

const styles: { id: PresentationStyle; name: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'classic', name: 'Classic Full', desc: 'Centered text, large font. Standard projection.', icon: <MdTextFields /> },
  { id: 'lower-third', name: 'Lower Third', desc: 'Text at the bottom. Great for live streams.', icon: <MdSubtitles /> },
  { id: 'cinematic', name: 'Cinematic', desc: 'Elegant small-caps, cinematic aspect ratio.', icon: <MdPalette /> },
];

const ChurchBrandingModal: React.FC<Props> = ({ onClose }) => {
  const [settings, setSettings] = useState<ChurchSettings>(churchSettingsApi.get());
  const [activeTab, setActiveTab] = useState<'profile' | 'style' | 'ticker'>('profile');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Load preview blob URL when modal opens (if logo was already saved)
  React.useEffect(() => {
    if (settings.churchLogoPath) {
      mediaApi.getLocalImageUrl(settings.churchLogoPath).then(url => setPreviewUrl(url));
    }
  }, []);

  const handleSave = () => {
    churchSettingsApi.save(settings);
    // Notify the output window immediately so it doesn't have to wait for the next poll
    emit('settings-changed', settings).catch(() => {});
    onClose();
  };

  const handleLogoUpload = async () => {
    try {
      const paths = await mediaApi.openMediaFileDialog('image');
      if (paths && paths.length > 0) {
        const path = paths[0];
        // Preload the blob URL first, then update state so preview immediately shows
        const url = await mediaApi.getLocalImageUrl(path);
        setSettings(prev => ({ ...prev, churchLogoPath: path }));
        setPreviewUrl(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="branding-modal-overlay">
      <div className="branding-modal">
        <div className="branding-header">
          <h2>Church Identity & Styles</h2>
          <button className="close-btn" onClick={onClose}><MdClose /></button>
        </div>

        <div className="branding-tabs">
          <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Identity</button>
          <button className={`tab ${activeTab === 'style' ? 'active' : ''}`} onClick={() => setActiveTab('style')}>Presentation Style</button>
          <button className={`tab ${activeTab === 'ticker' ? 'active' : ''}`} onClick={() => setActiveTab('ticker')}>News Ticker</button>
        </div>

        <div className="branding-body">
          {activeTab === 'profile' && (
            <div className="profile-tab slide-in">
              <div className="logo-upload-section">
                <div 
                  className="logo-preview" 
                  onClick={handleLogoUpload}
                >
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Church Logo Preview" 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                    />
                  ) : (
                    <MdCameraAlt size={32} />
                  )}
                </div>
                <div className="logo-instructions">
                  <h4>Church Logo</h4>
                  <p>Upload a high-res PNG with transparent background. This appears on standby screens.</p>
                  <button className="btn-upload" onClick={handleLogoUpload}>Choose Image</button>
                  {settings.churchLogoPath && (
                    <button className="btn-remove" onClick={() => setSettings({ ...settings, churchLogoPath: null })}>Remove</button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Church Display Name</label>
                <input 
                  type="text" 
                  value={settings.churchName}
                  onChange={e => setSettings({ ...settings, churchName: e.target.value })}
                  placeholder="e.g. Grace Community Church"
                />
              </div>
            </div>
          )}

          {activeTab === 'style' && (
            <div className="style-tab slide-in">
              <p className="tab-desc">Choose how lyrics and scriptures appear on screen.</p>
              <div className="style-grid">
                {styles.map(style => (
                  <div 
                    key={style.id} 
                    className={`style-card ${settings.presentationStyle === style.id ? 'active' : ''}`}
                    onClick={() => setSettings({ ...settings, presentationStyle: style.id })}
                  >
                    <div className="style-icon">{style.icon}</div>
                    <div className="style-info">
                      <h4>{style.name}</h4>
                      <p>{style.desc}</p>
                    </div>
                    {settings.presentationStyle === style.id && <MdCheckCircle className="check-icon" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ticker' && (
            <div className="ticker-tab slide-in">
              <div className="toggle-row">
                <div>
                  <h4>News Ticker Crawl</h4>
                  <p>Display scrolling announcements at the bottom of the screen.</p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={settings.tickerEnabled}
                    onChange={e => setSettings({ ...settings, tickerEnabled: e.target.checked })}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {settings.tickerEnabled && (
                <>
                  <div className="form-group">
                    <label>Ticker Label</label>
                    <input
                      type="text"
                      className="branding-input"
                      value={settings.tickerLabel}
                      onChange={e => setSettings({ ...settings, tickerLabel: e.target.value })}
                      placeholder="e.g. Alert!, News, Announcement"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ticker Custom Text</label>
                    <textarea 
                      rows={4}
                      value={settings.tickerText}
                      onChange={e => setSettings({ ...settings, tickerText: e.target.value })}
                      placeholder="e.g. Welcome to Sunday Service! Join our mid-week Bible study..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Ticker Font Size ({Math.round(settings.tickerFontSize * 100)}%)</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={settings.tickerFontSize}
                      onChange={e => setSettings({ ...settings, tickerFontSize: parseFloat(e.target.value) })}
                      className="branding-slider"
                    />
                  </div>
                  <div className="ticker-color-row">
                    <div className="form-group">
                      <label>Ticker Background</label>
                      <label className="ticker-color-label">
                        <input
                          type="color"
                          value={settings.tickerBgColor}
                          onChange={e => setSettings({ ...settings, tickerBgColor: e.target.value })}
                          className="ticker-color-input"
                        />
                        <span className="ticker-color-swatch" style={{ background: settings.tickerBgColor }}>
                          <MdColorLens size={14} />
                        </span>
                        <span className="ticker-color-hex">{settings.tickerBgColor}</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Ticker Text Color</label>
                      <label className="ticker-color-label">
                        <input
                          type="color"
                          value={settings.tickerTextColor}
                          onChange={e => setSettings({ ...settings, tickerTextColor: e.target.value })}
                          className="ticker-color-input"
                        />
                        <span className="ticker-color-swatch" style={{ background: settings.tickerTextColor }}>
                          <MdColorLens size={14} />
                        </span>
                        <span className="ticker-color-hex">{settings.tickerTextColor}</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="branding-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default ChurchBrandingModal;
