import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import { FiHome, FiActivity, FiUsers, FiDollarSign } from 'react-icons/fi';
import { MdLibraryMusic, MdEvent, MdBook, MdAdd, MdPlayArrow, MdMonitor } from 'react-icons/md';
import { songApi, serviceApi } from '../api';
import { overviewApi, SystemStats, RecentActivity as ActivityData } from '../api/overview';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalServices: 0,
    churchStats: null as SystemStats | null,
    loading: true,
  });

  const [activities, setActivities] = useState<ActivityData[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [songs, services, churchStats, recentActivities] = await Promise.all([
        songApi.getAll(),
        serviceApi.getAll(),
        overviewApi.getSystemStats(),
        overviewApi.getRecentActivity()
      ]);

      setStats({
        totalSongs: songs.length,
        totalServices: services.length,
        churchStats,
        loading: false,
      });

      setActivities(recentActivities.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-service':
        navigate('/services', { state: { openModal: 'new-service' } });
        break;
      case 'add-song':
        navigate('/songs', { state: { openModal: 'add-song' } });
        break;
      case 'presentation':
        navigate('/presentation');
        break;
      case 'bible':
        navigate('/bible');
        break;
      default:
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="dashboard animate-fade-in">
      <header className="page-header">
        <div className="header-content">
          <div className="header-icon-container">
            <FiHome className="header-icon" />
          </div>
          <div>
            <h1>WorshipFlow Pro</h1>
            <p>Professional Worship Presentation System</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => handleQuickAction('new-service')}>
            <MdAdd size={20} /> New Service
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-container bg-blue">
            <MdLibraryMusic className="stat-icon" />
          </div>
          <div className="stat-content">
            <h3>Songs</h3>
            <p className="stat-value">
              {stats.loading ? '...' : stats.totalSongs}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container bg-purple">
            <MdEvent className="stat-icon" />
          </div>
          <div className="stat-content">
            <h3>Services</h3>
            <p className="stat-value">
              {stats.loading ? '...' : stats.totalServices}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container bg-emerald">
            <FiUsers className="stat-icon" />
          </div>
          <div className="stat-content">
            <h3>Church Members</h3>
            <p className="stat-value">
              {stats.loading || !stats.churchStats ? '...' : stats.churchStats.total_members.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container bg-gold">
            <FiDollarSign className="stat-icon" />
          </div>
          <div className="stat-content">
            <h3>Weekly Giving</h3>
            <p className="stat-value">
              {stats.loading || !stats.churchStats ? '...' : formatCurrency(stats.churchStats.weekly_giving)}
            </p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn primary" onClick={() => handleQuickAction('new-service')}>
            <div className="action-icon-wrapper">
              <MdAdd size={24} />
            </div>
            <span>New Service</span>
          </button>
          <button className="action-btn" onClick={() => handleQuickAction('add-song')}>
            <div className="action-icon-wrapper">
              <MdLibraryMusic size={24} />
            </div>
            <span>Add Song</span>
          </button>
          <button className="action-btn" onClick={() => handleQuickAction('presentation')}>
            <div className="action-icon-wrapper">
              <MdPlayArrow size={24} />
            </div>
            <span>Start Presentation</span>
          </button>
          <button className="action-btn" onClick={() => handleQuickAction('bible')}>
            <div className="action-icon-wrapper">
              <MdBook size={24} />
            </div>
            <span>Browse Bible</span>
          </button>
        </div>
      </div>

      <div className="dashboard-columns">
        <div className="recent-activity">
          <div className="section-header">
            <h2>Recent Activity</h2>
            <button className="btn-text">View All</button>
          </div>
          <div className="activity-list">
            {stats.loading ? (
              <div className="loading-placeholder">Loading activities...</div>
            ) : activities.length > 0 ? (
              activities.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className={`activity-icon bg-${item.type === 'finance' ? 'emerald' : item.type === 'member' ? 'blue' : 'purple'}-light`}>
                    {item.type === 'finance' ? <FiDollarSign /> : item.type === 'member' ? <FiUsers /> : <MdEvent />}
                  </div>
                  <div className="activity-content">
                    <h4>{item.name}</h4>
                    <p>{item.action} • {new Date(item.time).toLocaleDateString()}</p>
                  </div>
                  <FaChevronRight className="activity-arrow" />
                </div>
              ))
            ) : (
              <div className="empty-activity">No recent activity recorded.</div>
            )}
          </div>
        </div>

        <div className="system-status">
          <h2>System Status</h2>
          <div className="status-grid">
            <div className="status-item">
              <div className="status-icon bg-gray-dark">
                <FiActivity size={18} />
              </div>
              <div className="status-content">
                <h4>Database</h4>
                <p className="status-indicator online">Online</p>
              </div>
            </div>
            <div className="status-item">
              <div className="status-icon bg-gray-dark">
                <MdPlayArrow size={20} />
              </div>
              <div className="status-content">
                <h4>Presentation Engine</h4>
                <p className="status-indicator online">Active</p>
              </div>
            </div>
            <div className="status-item">
              <div className="status-icon bg-gray-dark">
                <MdMonitor size={20} />
              </div>
              <div className="status-content">
                <h4>Output Window</h4>
                <p className="status-indicator online">Connected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
