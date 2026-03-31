import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { MdDashboard, MdMonitor, MdLibraryMusic, MdBook, MdTimer, MdEvent, MdCheckCircle, MdImage } from 'react-icons/md';
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

  useEffect(() => {
    const unsub = churchSettingsApi.subscribe(settings => {
      setChurchSettings(settings);
    });
    return unsub;
  }, []);

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            {churchSettings.churchLogoPath ? (
              <img 
                src={mediaApi.getAssetUrl(churchSettings.churchLogoPath)} 
                alt="Church Logo" 
                style={{ height: '40px', objectFit: 'contain', marginBottom: '8px' }}
              />
            ) : (
              <h1>WorshipFlow Pro</h1>
            )}
            <h2 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {churchSettings.churchName}
            </h2>
          </div>

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
                Presentation
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
                to="/timer"
                className={activeView === 'timer' ? 'active' : ''}
                onClick={() => setActiveView('timer')}
              >
                <span className="icon"><MdTimer /></span>
                Timer
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

          <div className="sidebar-footer">
            <Link to="/admin/login" className="footer-status admin-btn" onClick={() => setActiveView('admin')}>
              <MdCheckCircle className="status-icon" color="#10b981" /> Manage Your Church
            </Link>
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
    </Router>
  );
}

export default App;
