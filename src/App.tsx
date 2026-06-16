import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MdDashboard, MdMonitor, MdLibraryMusic, MdBook, MdEvent, MdCheckCircle, MdImage } from 'react-icons/md';
import './App.css';
import SongLibrary from './components/SongLibrary';
import ServiceManager from './components/ServiceManager';
import Dashboard from './components/Dashboard';
import PresentationControl from './components/PresentationControl';
import TimerDisplay from './components/TimerDisplay';
import BibleBrowser from './components/BibleBrowser';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import MediaPlayer from './components/MediaPlayer';
import { churchSettingsApi, ChurchSettings } from './api/churchSettings';
import { mediaApi } from './api/media';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>(churchSettingsApi.get());
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    const unsub = churchSettingsApi.subscribe(settings => {
      setChurchSettings(settings);
    });
    return unsub;
  }, []);

  useEffect(() => {
    setImageError(false);
    let active = true;
    if (churchSettings.churchLogoPath) {
      mediaApi.getLocalImageUrl(churchSettings.churchLogoPath)
        .then(url => {
          if (active) {
            setLogoUrl(url || '');
          }
        })
        .catch(() => {
          if (active) setLogoUrl('');
        });
    } else {
      setLogoUrl('');
    }
    return () => {
      active = false;
    };
  }, [churchSettings.churchLogoPath]);

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="sidebar-header">
            <div className="logo-container">
              {logoUrl && !imageError ? (
                <img 
                  src={logoUrl} 
                  alt="Church Logo" 
                  className="sidebar-logo-img"
                  onError={() => setImageError(true)}
                />
              ) : (
                <h1 className="sidebar-title">WorshipFlow Pro</h1>
              )}
            </div>
            <h2 className="church-name">
              {churchSettings.churchName}
            </h2>
          </div>
          <div className="sidebar-separator" />

          <ul className="nav-menu">
            <li>
              <Link
                to="/"
                className={activeView === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveView('dashboard')}
              >
                <span className="icon"><MdDashboard /></span>
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/presentation"
                className={activeView === 'presentation' ? 'active' : ''}
                onClick={() => setActiveView('presentation')}
              >
                <span className="icon"><MdMonitor /></span>
                Live Console
              </Link>
            </li>
            <li>
              <Link
                to="/songs"
                className={activeView === 'songs' ? 'active' : ''}
                onClick={() => setActiveView('songs')}
              >
                <span className="icon"><MdLibraryMusic /></span>
                Song Library
              </Link>
            </li>
            <li>
              <Link
                to="/bible"
                className={activeView === 'bible' ? 'active' : ''}
                onClick={() => setActiveView('bible')}
              >
                <span className="icon"><MdBook /></span>
                Bible
              </Link>
            </li>
            <li>
              <Link
                to="/services"
                className={activeView === 'services' ? 'active' : ''}
                onClick={() => setActiveView('services')}
              >
                <span className="icon"><MdEvent /></span>
                Services
              </Link>
            </li>
            <li>
              <Link
                to="/media"
                className={activeView === 'media' ? 'active' : ''}
                onClick={() => setActiveView('media')}
              >
                <span className="icon"><MdImage /></span>
                Media
              </Link>
            </li>
          </ul>
          <div className="sidebar-separator" />
          <div className="sidebar-footer">
            <button
              className="footer-status admin-btn"
              onClick={() => invoke('open_admin_window').catch(console.error)}
              title="Open Church Management in a separate window"
            >
              <MdCheckCircle className="status-icon" color="#10b981" /> Manage Your Church
            </button>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/presentation" element={<PresentationControl />} />
            <Route path="/songs" element={<SongLibrary />} />
            <Route path="/bible" element={<BibleBrowser />} />
            <Route path="/timer" element={<TimerDisplay />} />
            <Route path="/services" element={<ServiceManager />} />
            <Route path="/media" element={<MediaPlayer />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#383838',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
          },
        }}
      />
    </Router>
  );
}

export default App;
