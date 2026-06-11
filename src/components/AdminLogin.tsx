import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdEmail, MdLock, MdArrowForward, MdHome } from 'react-icons/md';
import { authApi } from '../api/auth';
import './AdminLogin.css';

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await authApi.login(email, password);
            navigate('/admin/dashboard');
        } catch (err: any) {
            console.error("Login failed:", err);
            setError(err as string);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-login-page animate-fade-in">
            {/* Background elements */}
            <div className="bg-orb orb-1"></div>
            <div className="bg-orb orb-2"></div>
            <div className="bg-orb orb-3"></div>

            <button className="back-btn glass-panel" onClick={() => navigate('/')}>
                <MdHome size={20} /> Return to WorshipFlow
            </button>

            <div className="login-card glass-panel">
                <div className="login-header">
                    <div className="logo-icon"></div>
                    <h1>Manage Your Church</h1>
                    <p>Login to the administrative dashboard</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <MdEmail className="input-icon" />
                            <input
                                type="email"
                                id="email"
                                placeholder="admin@church.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <MdLock className="input-icon" />
                            <input
                                type="password"
                                id="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <div className="remember-me">
                            <input type="checkbox" id="remember" />
                            <label htmlFor="remember">Remember me</label>
                        </div>
                        <a href="#" className="forgot-password">Forgot password?</a>
                    </div>

                    <button
                        type="submit"
                        className={`btn-primary-elite login-btn ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading || !email || !password}
                    >
                        {isLoading ? (
                            <div className="spinner"></div>
                        ) : (
                            <>
                                Access Dashboard <MdArrowForward size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <div className="login-footer">
                <p>WorshipFlow Pro Administration &copy; {new Date().getFullYear()}</p>
            </div>
        </div>
    );
};

export default AdminLogin;
