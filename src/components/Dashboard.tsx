import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdLibraryMusic, MdEvent, MdBook,
  MdAdd, MdPlayArrow, MdArrowForward, MdSchedule,
  MdStorage, MdVideocam, MdMonitor,
  MdMenuBook
} from 'react-icons/md';
import { songApi, serviceApi } from '../api';
import { overviewApi, SystemStats, RecentActivity as ActivityData } from '../api/overview';
import { bibleApi } from '../api/bible';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalServices: 0,
    churchStats: null as SystemStats | null,
    bibleVersions: 0,
    loading: true,
  });

  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [songs, services, churchStats, recentActivities, versions] = await Promise.all([
        songApi.getAll(),
        serviceApi.getAll(),
        overviewApi.getSystemStats(),
        overviewApi.getRecentActivity(),
        bibleApi.getVersions(),
      ]);

      setStats({
        totalSongs: songs.length,
        totalServices: services.length,
        churchStats,
        bibleVersions: versions.length,
        loading: false,
      });

      setActivities(recentActivities.slice(0, 6));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-service': navigate('/services', { state: { openModal: 'new-service' } }); break;
      case 'add-song': navigate('/songs', { state: { openModal: 'add-song' } }); break;
      case 'presentation': navigate('/presentation'); break;
      case 'bible': navigate('/bible'); break;
      default: break;
    }
  };

  const getTimeAgo = (timeStr: string) => {
    const diff = Date.now() - new Date(timeStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="dashboard">
      {/* Header Section */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-greeting">
            <h1>{greeting}</h1>
            <p className="dash-subtitle">Welcome to your worship command center</p>
          </div>
        </div>
        <div className="dash-header-right">
          <button className="dash-btn dash-btn-primary" onClick={() => handleQuickAction('new-service')}>
            <MdAdd size={20} />
            <span>New Service</span>
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="dash-stats">
        <div className="dash-stat-card" onClick={() => navigate('/songs')}>
          <div className="dash-stat-icon" style={{ '--stat-color': '#3b82f6', '--stat-bg': 'rgba(59,130,246,0.1)' } as React.CSSProperties}>
            <MdLibraryMusic size={24} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-label">Songs</span>
            <span className="dash-stat-value">{stats.loading ? '—' : stats.totalSongs}</span>
          </div>
          <div className="dash-stat-trend">Ready</div>
        </div>

        <div className="dash-stat-card" onClick={() => navigate('/services')}>
          <div className="dash-stat-icon" style={{ '--stat-color': '#8b5cf6', '--stat-bg': 'rgba(139,92,246,0.1)' } as React.CSSProperties}>
            <MdEvent size={24} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-label">Services</span>
            <span className="dash-stat-value">{stats.loading ? '—' : stats.totalServices}</span>
          </div>
          <div className="dash-stat-trend">Planned</div>
        </div>

        <div className="dash-stat-card" onClick={() => navigate('/bible')}>
          <div className="dash-stat-icon" style={{ '--stat-color': '#10b981', '--stat-bg': 'rgba(16,185,129,0.1)' } as React.CSSProperties}>
            <MdMenuBook size={24} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-label">Bible Versions</span>
            <span className="dash-stat-value">{stats.loading ? '—' : stats.bibleVersions}</span>
          </div>
          <div className="dash-stat-trend">Loaded</div>
        </div>

        <div className="dash-stat-card" onClick={() => navigate('/presentation')}>
          <div className="dash-stat-icon" style={{ '--stat-color': '#f59e0b', '--stat-bg': 'rgba(245,158,11,0.1)' } as React.CSSProperties}>
            <MdPlayArrow size={24} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-label">Members</span>
            <span className="dash-stat-value">
              {stats.loading || !stats.churchStats ? '—' : stats.churchStats.total_members.toLocaleString()}
            </span>
          </div>
          <div className="dash-stat-trend">Registered</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dash-content">
        {/* Quick Actions */}
        <div className="dash-card dash-quick-actions">
          <div className="dash-card-header">
            <h2>Quick Actions</h2>
            <span className="dash-card-sub">Jump to any feature</span>
          </div>
          <div className="dash-actions-grid">
            <button className="dash-action-card highlight" onClick={() => handleQuickAction('presentation')}>
              <div className="dash-action-icon" style={{ '--action-bg': 'rgba(59,130,246,0.15)', '--action-color': '#3b82f6' } as React.CSSProperties}>
                <MdPlayArrow size={28} />
              </div>
              <div className="dash-action-info">
                <strong>Start Presentation</strong>
                <span>Go live with slides</span>
              </div>
              <MdArrowForward className="dash-action-arrow" size={18} />
            </button>

            <button className="dash-action-card" onClick={() => handleQuickAction('new-service')}>
              <div className="dash-action-icon" style={{ '--action-bg': 'rgba(139,92,246,0.15)', '--action-color': '#8b5cf6' } as React.CSSProperties}>
                <MdSchedule size={28} />
              </div>
              <div className="dash-action-info">
                <strong>New Service</strong>
                <span>Plan your worship</span>
              </div>
              <MdArrowForward className="dash-action-arrow" size={18} />
            </button>

            <button className="dash-action-card" onClick={() => handleQuickAction('add-song')}>
              <div className="dash-action-icon" style={{ '--action-bg': 'rgba(16,185,129,0.15)', '--action-color': '#10b981' } as React.CSSProperties}>
                <MdLibraryMusic size={28} />
              </div>
              <div className="dash-action-info">
                <strong>Add Song</strong>
                <span>Expand your library</span>
              </div>
              <MdArrowForward className="dash-action-arrow" size={18} />
            </button>

            <button className="dash-action-card" onClick={() => handleQuickAction('bible')}>
              <div className="dash-action-icon" style={{ '--action-bg': 'rgba(245,158,11,0.15)', '--action-color': '#f59e0b' } as React.CSSProperties}>
                <MdBook size={28} />
              </div>
              <div className="dash-action-info">
                <strong>Browse Bible</strong>
                <span>Read scriptures</span>
              </div>
              <MdArrowForward className="dash-action-arrow" size={18} />
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="dash-right">

          {/* Recent Activity */}
          <div className="dash-card dash-activity">
            <div className="dash-card-header">
              <h2>Recent Activity</h2>
              <span className="dash-card-sub">Latest actions</span>
            </div>
            <div className="dash-activity-list">
              {stats.loading ? (
                <div className="dash-loading">Loading...</div>
              ) : activities.length > 0 ? (
                activities.map((item) => (
                  <div key={item.id} className="dash-activity-item">
                    <div className={`dash-activity-dot ${item.type}`} />
                    <div className="dash-activity-body">
                      <span className="dash-activity-name">{item.name}</span>
                      <span className="dash-activity-desc">{item.action}</span>
                    </div>
                    <span className="dash-activity-time">{getTimeAgo(item.time)}</span>
                  </div>
                ))
              ) : (
                <div className="dash-empty">No recent activity</div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="dash-card dash-sys-status">
            <div className="dash-card-header">
              <h2>System Status</h2>
              <span className="dash-card-sub">All systems nominal</span>
            </div>
            <div className="dash-sys-list">
              <div className="dash-sys-item">
                <MdStorage size={18} className="dash-sys-icon" />
                <span>Database</span>
                <span className="dash-status live"><span className="dash-pulse" />Online</span>
              </div>
              <div className="dash-sys-item">
                <MdVideocam size={18} className="dash-sys-icon" />
                <span>Presentation Engine</span>
                <span className="dash-status live"><span className="dash-pulse" />Active</span>
              </div>
              <div className="dash-sys-item">
                <MdMonitor size={18} className="dash-sys-icon" />
                <span>Output Window</span>
                <span className="dash-status live"><span className="dash-pulse" />Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
