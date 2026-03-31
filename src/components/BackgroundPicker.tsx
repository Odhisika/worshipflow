import React, { useState } from 'react';
import { mediaApi } from '../api/media';
import './BackgroundPicker.css';

export interface BackgroundOption {
  key: string;       // e.g. "builtin:heavenly-blue" or absolute file path
  label: string;
  cssClass?: string; // for builtin themes
}

interface BackgroundPickerProps {
  currentBackground: string | null;
  onApply: (bg: string | null) => void;
  onClose: () => void;
}

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
  const [activeTab, setActiveTab] = useState<'premade' | 'upload'>('premade');
  const [selected, setSelected] = useState<string | null>(currentBackground);
  const [uploadedPath, setUploadedPath] = useState<string | null>(
    currentBackground && !currentBackground.startsWith('builtin:')
      ? currentBackground
      : null
  );

  const handleBrowse = async () => {
    try {
      const paths = await mediaApi.openMediaFileDialog('image');
      if (paths && paths.length > 0) {
        const path = paths[0];
        setUploadedPath(path);
        setSelected(path);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleApply = () => {
    onApply(selected);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="bg-picker-overlay" onClick={handleOverlayClick}>
      <div className="bg-picker-modal">
        {/* Header */}
        <div className="bg-picker-header">
          <h2>🎨 Presentation Background</h2>
          <button className="bg-picker-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="bg-picker-tabs">
          <button
            className={`bg-tab ${activeTab === 'premade' ? 'active' : ''}`}
            onClick={() => setActiveTab('premade')}
          >
            ✨ Pre-made Designs
          </button>
          <button
            className={`bg-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            🖼 Your Images
          </button>
        </div>

        {/* Body */}
        <div className="bg-picker-body">
          {/* "None" option always visible */}
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
                <div className="bg-upload-icon">📂</div>
                <h3>Browse your images</h3>
                <p>JPG, PNG, WebP — any size works great</p>
                <button
                  className="bg-upload-btn"
                  onClick={e => { e.stopPropagation(); handleBrowse(); }}
                >
                  📤 Choose Image
                </button>
              </div>
              {uploadedPath && (
                <div
                  className={`bg-selected-image ${selected === uploadedPath ? 'selected-ring' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(uploadedPath)}
                >
                  <img
                    src={mediaApi.getAssetUrl(uploadedPath)}
                    alt="Selected background"
                  />
                  <div className="bg-selected-label">
                    ✓ {uploadedPath.split('/').pop()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-picker-footer">
          <button className="bg-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="bg-btn-apply" onClick={handleApply}>
            ✓ Apply Background
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundPicker;
export { BUILTIN_THEMES };
