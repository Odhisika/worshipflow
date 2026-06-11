import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authApi, AdminUser } from './api/auth';
import { settingsApi } from './api/settings';
import { mediaApi } from './api/media';
import AdminDashboard from './components/AdminDashboard';
import './index.css';
import './App.css';
import './components/AdminLogin.css';
import './components/AdminDashboard.css';
import './components/admin/AdminViews.css';

// Login form — self-contained so it works without the main window's router
const AdminLoginScreen: React.FC<{ onLogin: (user?: AdminUser) => void }> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [churchLogo, setChurchLogo] = React.useState<string>('');

  React.useEffect(() => {
    settingsApi.getAppConfig().then(async (config) => {
      if (config.church_logo) {
        const url = await mediaApi.getLocalImageUrl(config.church_logo);
        setChurchLogo(url);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const user = await authApi.login(email, password);
      onLogin(user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err as string ?? 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page animate-fade-in" style={{ minHeight: '100vh' }}>
      <div className="bg-orb orb-1" /><div className="bg-orb orb-2" /><div className="bg-orb orb-3" />
      <div className="login-card glass-panel">
        <div className="login-header">
          {churchLogo ? (
            <img src={churchLogo} alt="Church Logo" className="login-logo-img" />
          ) : (
            <div className="logo-icon" />
          )}
          <h1>Manage Your Church</h1>
          <p>Login to the administrative dashboard</p>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <input type="email" placeholder="admin@church.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <input type="password" placeholder="Enter your password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
          </div>
          <button type="submit"
            className={`btn-primary-elite login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? <div className="spinner" /> : 'Access Dashboard →'}
          </button>
        </form>
      </div>
      <div className="login-footer">
        <p>WorshipFlow Pro Administration © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

// Intercepts AdminDashboard's navigate('/admin/login') logout call
const LogoutRedirect: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  React.useEffect(() => {
    onLogout();
    navigate('/login', { replace: true });
  }, []);
  return null;
};

const AdminApp: React.FC = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  return (
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<AdminLoginScreen onLogin={(user?: AdminUser) => { setLoggedIn(true); if (user) setAdminUser(user); }} />} />
        <Route
          path="/dashboard"
          element={loggedIn ? <AdminDashboard userEmail={adminUser?.email} /> : <Navigate to="/login" replace />}
        />
        <Route path="/admin/login" element={<LogoutRedirect onLogout={() => setLoggedIn(false)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-card, #1e293b)',
            color: 'var(--text-primary, #f1f5f9)',
            border: '1px solid var(--border-light, #334155)',
            borderRadius: '10px',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#f1f5f9' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' },
          },
        }}
      />
    </MemoryRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
