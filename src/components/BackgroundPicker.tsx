import React, { useState } from 'react';
import { mediaApi } from '../api/media';
import { churchSettingsApi, ChurchSettings } from '../api/churchSettings';
import { useAppState } from '../context/AppStateContext';
import { MdPalette, MdAutoAwesome, MdImage, MdFolderOpen, MdCheckCircle, MdClose, MdMovie, MdLibraryMusic, MdBook, MdAnnouncement, MdEvent, MdExpandMore, MdExpandLess } from 'react-icons/md';
import './BackgroundPicker.css';

export interface BackgroundOption {
  key: string;
  label: string;
  cssClass?: string;
}

interface BackgroundPickerProps {
  currentBackground: string | null;
  onApply: (bg: string | null) => void;
  onClose: () => void;
}

type ContentType = 'song' | 'bible' | 'announcement' | 'activity';

const CONTENT_TYPES: { key: ContentType; label: string; icon: React.ReactNode; settingsKey: keyof ChurchSettings }[] = [
  { key: 'song', label: 'Hymns / Songs', icon: <MdLibraryMusic size={18} />, settingsKey: 'defaultSongBackground' },
  { key: 'bible', label: 'Bible Verses', icon: <MdBook size={18} />, settingsKey: 'defaultBibleBackground' },
  { key: 'announcement', label: 'Announcements', icon: <MdAnnouncement size={18} />, settingsKey: 'defaultAnnouncementBackground' },
  { key: 'activity', label: 'Service Activities', icon: <MdEvent size={18} />, settingsKey: 'defaultActivityBackground' },
];

const BUILTIN_THEMES: Array<{
  key: string;
  name: string;
  desc: string;
  cssClass: string;
}> = [
  {
    key: 'builtin:heavenly-blue',
    name: 'Heavenly Blue',
    desc: 'Slow shifting indigo & violet',
    cssClass: 'bg-heavenly-blue',
  },
  {
    key: 'builtin:sunset-fire',
    name: 'Sunset Fire',
    desc: 'Warm amber, orange & red',
    cssClass: 'bg-sunset-fire',
  },
  {
    key: 'builtin:aurora',
    name: 'Aurora Borealis',
    desc: 'Northern-lights color sweeps',
    cssClass: 'bg-aurora',
  },
  {
    key: 'builtin:starfield',
    name: 'Starfield',
    desc: 'Cosmic dark with twinkling stars',
    cssClass: 'bg-starfield',
  },
  {
    key: 'builtin:holy-light',
    name: 'Holy Light',
    desc: 'Soft white & gold radial glow',
    cssClass: 'bg-holy-light',
  },
  {
    key: 'builtin:ocean-waves',
    name: 'Ocean Waves',
    desc: 'Deep animated ocean blues',
    cssClass: 'bg-ocean-waves',
  },
  {
    key: 'builtin:golden-hour',
    name: 'Golden Hour',
    desc: 'Rich gold & honey tones',
    cssClass: 'bg-golden-hour',
  },
  {
    key: 'builtin:deep-forest',
    name: 'Deep Forest',
    desc: 'Dark emerald & teal depths',
    cssClass: 'bg-deep-forest',
  },
];

const BackgroundPicker: React.FC<BackgroundPickerProps> = ({
  currentBackground,
  onApply,
  onClose,
}) => {
  const { state, updateState } = useAppState();
  const [activeTab, setActiveTab] = useState<'premade' | 'upload' | 'video'>('premade');
  const [selected, setSelected] = useState<string | null>(currentBackground);
  const [showDefaults, setShowDefaults] = useState(false);
  const [defaultSettings, setDefaultSettings] = useState<ChurchSettings>(churchSettingsApi.get());

  const handleBrowse = async () => {
    try {
      const paths = await mediaApi.openMediaFileDialog('image');
      if (paths && paths.length > 0) {
        const path = paths[0];
        updateState({ backgroundUploadImagePath: path });
        setSelected(path);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleBrowseVideo = async () => {
    try {
      const paths = await mediaApi.openMediaFileDialog('video');
      if (paths && paths.length > 0) {
        const path = paths[0];
        updateState({ backgroundUploadVideoPath: path });
        setSelected(path);
      }
    } catch (err) {
      console.error('Failed to open video file dialog:', err);
    }
  };

  const handleApply = () => {
    onApply(selected);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSetDefault = (key: ContentType) => {
    if (selected === null) return;
    const entry = CONTENT_TYPES.find(c => c.key === key)!;
    const updated = churchSettingsApi.save({ [entry.settingsKey]: selected });
    setDefaultSettings(updated);
  };

  const handleClearDefault = (key: ContentType) => {
    const entry = CONTENT_TYPES.find(c => c.key === key)!;
    const updated = churchSettingsApi.save({ [entry.settingsKey]: null });
    setDefaultSettings(updated);
  };

  const currentDefaultBg = (key: ContentType): string | null => {
    const entry = CONTENT_TYPES.find(c => c.key === key)!;
    return defaultSettings[entry.settingsKey] as string | null;
  };

  return (
    <div className="bg-picker-overlay" onClick={handleOverlayClick}>
      <div className="bg-picker-modal">
        {/* Header */}
        <div className="bg-picker-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdPalette size={20} /> Presentation Background
          </h2>
          <button className="bg-picker-close" onClick={onClose}><MdClose size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="bg-picker-tabs">
          <button
            className={`bg-tab ${activeTab === 'premade' ? 'active' : ''}`}
            onClick={() => setActiveTab('premade')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <MdAutoAwesome size={16} /> Pre-made Designs
          </button>
          <button
            className={`bg-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <MdImage size={16} /> Your Images
          </button>
          <button
            className={`bg-tab ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <MdMovie size={16} /> Your Videos
          </button>
        </div>

        {/* Body — now scrolls everything including defaults */}
        <div className="bg-picker-body">
          {/* None option */}
          <div
            className={`bg-none-option ${selected === null ? 'selected' : ''}`}
            onClick={() => setSelected(null)}
          >
            <div className="bg-none-swatch" />
            <div>
              <strong>No Background</strong>
              <br />
              <span style={{ fontSize: '0.78rem' }}>Plain dark background</span>
            </div>
          </div>

          {activeTab === 'premade' && (
            <div className="bg-premade-grid">
              {BUILTIN_THEMES.map(theme => (
                <div
                  key={theme.key}
                  className={`bg-premade-card ${selected === theme.key ? 'selected' : ''}`}
                  onClick={() => setSelected(theme.key)}
                >
                  <div className={`bg-premade-preview ${theme.cssClass}`} />
                  <div className="bg-premade-info">
                    <p className="bg-premade-name">{theme.name}</p>
                    <p className="bg-premade-desc">{theme.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div>
              <div className="bg-upload-zone" onClick={handleBrowse}>
                <div className="bg-upload-icon">
                  <MdFolderOpen size={48} />
                </div>
                <h3>Browse your images</h3>
                <p>JPG, PNG, WebP — any size works great</p>
                <button
                  className="bg-upload-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={e => { e.stopPropagation(); handleBrowse(); }}
                >
                  <MdFolderOpen size={16} /> Choose Image
                </button>
              </div>
              {state.backgroundUploadImagePath && (
                <div
                  className={`bg-selected-image ${selected === state.backgroundUploadImagePath ? 'selected-ring' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(state.backgroundUploadImagePath)}
                >
                  <img
                    src={mediaApi.getAssetUrl(state.backgroundUploadImagePath)}
                    alt="Selected background"
                  />
                  <div className="bg-selected-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MdCheckCircle size={14} /> {state.backgroundUploadImagePath.split('/').pop()}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'video' && (
            <div>
              <div className="bg-upload-zone" onClick={handleBrowseVideo}>
                <div className="bg-upload-icon">
                  <MdMovie size={48} />
                </div>
                <h3>Browse your videos</h3>
                <p>MP4, WebM, MOV — plays as a looping background</p>
                <button
                  className="bg-upload-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={e => { e.stopPropagation(); handleBrowseVideo(); }}
                >
                  <MdFolderOpen size={16} /> Choose Video
                </button>
              </div>
              {state.backgroundUploadVideoPath && (
                <div
                  className={`bg-selected-image ${selected === state.backgroundUploadVideoPath ? 'selected-ring' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(state.backgroundUploadVideoPath)}
                >
                  <video
                    src={mediaApi.getAssetUrl(state.backgroundUploadVideoPath)}
                    muted
                    autoPlay
                    loop
                    playsInline
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                  />
                  <div className="bg-selected-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MdCheckCircle size={14} /> {state.backgroundUploadVideoPath.split('/').pop()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- Default Backgrounds Section --- */}
          <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0', userSelect: 'none' }}
              onClick={() => setShowDefaults(!showDefaults)}
            >
              {showDefaults ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.85 }}>
                Default Backgrounds per Content Type
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.35 }}>— saved for everyday use</span>
            </div>

            {showDefaults && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CONTENT_TYPES.map(({ key, label, icon }) => {
                  const defBg = currentDefaultBg(key);
                  const hasSelection = selected !== null;
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                      <div style={{ opacity: 0.55 }}>{icon}</div>
                      <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{label}</div>

                      {/* Preview of saved default */}
                      <div style={{
                        width: 42, height: 28, borderRadius: 4, overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: defBg ? '#222' : 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)',
                        flexShrink: 0,
                      }}>
                        {defBg ? (
                          defBg.startsWith('builtin:') ? (
                            <div className={defBg.replace('builtin:', 'bg-')} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <img src={mediaApi.getAssetUrl(defBg)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )
                        ) : (
                          '—'
                        )}
                      </div>

                      {/* Add button: saves currently selected bg as default */}
                      <button
                        className="bg-tab"
                        style={{
                          padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600,
                          border: hasSelection ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 6, cursor: hasSelection ? 'pointer' : 'not-allowed',
                          opacity: hasSelection ? 1 : 0.35,
                          background: hasSelection ? 'rgba(167,139,250,0.1)' : 'transparent',
                          color: hasSelection ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                        }}
                        onClick={() => hasSelection && handleSetDefault(key)}
                        disabled={!hasSelection}
                        title={hasSelection ? 'Save the currently selected background as default' : 'First select a background above'}
                      >
                        <MdCheckCircle size={13} /> Add
                      </button>

                      {/* Remove button: clears the default */}
                      <button
                        className="bg-tab"
                        style={{
                          padding: '4px 10px', fontSize: '0.75rem',
                          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                          cursor: defBg ? 'pointer' : 'not-allowed',
                          opacity: defBg ? 1 : 0.25,
                          background: defBg ? 'rgba(239,68,68,0.08)' : 'transparent',
                          color: '#ef4444',
                          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                        }}
                        onClick={() => defBg && handleClearDefault(key)}
                        disabled={!defBg}
                        title={defBg ? 'Remove this default background' : 'No default set'}
                      >
                        <MdClose size={13} /> Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-picker-footer">
          <button className="bg-btn-cancel" onClick={onClose}>Cancel</button>
          <button 
            className="bg-btn-apply" 
            onClick={handleApply}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <MdCheckCircle size={16} /> Apply Background
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundPicker;
export { BUILTIN_THEMES };
