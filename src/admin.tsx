import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from './api/auth';
import AdminDashboard from './components/AdminDashboard';
import './index.css';
import './App.css';
import './components/AdminLogin.css';
import './components/AdminDashboard.css';
import './components/admin/AdminViews.css';

// Login form — self-contained so it works without the main window's router
const AdminLoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authApi.login(email, password);
      onLogin();
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
          <div className="logo-icon" />
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

  return (
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<AdminLoginScreen onLogin={() => setLoggedIn(true)} />} />
        <Route
          path="/dashboard"
          element={loggedIn ? <AdminDashboard /> : <Navigate to="/login" replace />}
        />
        {/* Catch AdminDashboard's logout which calls navigate('/admin/login') */}
        <Route path="/admin/login" element={<LogoutRedirect onLogout={() => setLoggedIn(false)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </MemoryRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
