import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdLibraryMusic, MdEvent,
  MdAdd, MdPlayArrow, MdSchedule,
  MdMonitor,
  MdMenuBook, MdAccessTime, MdSkipNext, MdSkipPrevious,
  MdVisibilityOff, MdHighlightOff, MdRefresh,
  MdOutlineWbSunny, MdWbTwilight, MdNightsStay, MdEdit
} from 'react-icons/md';
import { songApi, serviceApi, activityApi, Service, Activity, Song } from '../api';
import { bibleApi } from '../api/bible';
import { presentationApi, PresentationInfo } from '../api/presentation';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalServices: 0,
    bibleVersions: 0,
    loading: true,
  });

  const [nextService, setNextService] = useState<Service | null>(null);
  const [nextServiceActivities, setNextServiceActivities] = useState<Activity[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [presentation, setPresentation] = useState<PresentationInfo | null>(null);

  const loadPresentationState = useCallback(async () => {
    try {
      const state = await presentationApi.getState();
      setPresentation(state);
    } catch (err) {
      console.error('Failed to get presentation state:', err);
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      const [songs, services, versions] = await Promise.all([
        songApi.getAll(),
        serviceApi.getAll(),
        bibleApi.getVersions(),
      ]);

      setStats({
        totalSongs: songs.length,
        totalServices: services.length,
        bibleVersions: versions.length,
        loading: false,
      });

      // Find next upcoming service (today or in future)
      const upcoming = services
        .map(s => ({ ...s, dateObj: new Date(s.date) }))
        .filter(s => {
          // Keep if it is today or in the future (ignore historical dates)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return s.dateObj >= today;
        })
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

      const next = upcoming[0] || null;
      setNextService(next);

      if (next) {
        let acts = next.activities || [];
        if (!acts || acts.length === 0) {
          try {
            acts = await activityApi.getByService(next.id);
          } catch (err) {
            console.error('Failed to get service activities:', err);
          }
        }
        const sortedActs = [...acts].sort((a, b) => a.order_index - b.order_index);
        setNextServiceActivities(sortedActs);
      } else {
        setNextServiceActivities([]);
      }

      // Recent songs
      const sortedSongs = [...songs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentSongs(sortedSongs.slice(0, 4));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Live clock timer
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Presentation state polling (every 3 seconds)
    loadPresentationState();
    const presentationTimer = setInterval(loadPresentationState, 3000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(presentationTimer);
    };
  }, [loadPresentationState]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-service': navigate('/services', { state: { openModal: 'new-service' } }); break;
      case 'add-song': navigate('/songs', { state: { openModal: 'add-song' } }); break;
      case 'presentation': navigate('/presentation'); break;
      case 'bible': navigate('/bible'); break;
      default: break;
    }
  };

  const handlePresentationControl = async (action: string) => {
    try {
      let newState: PresentationInfo;
      switch (action) {
        case 'prev':
          newState = await presentationApi.previousSlide();
          break;
        case 'next':
          newState = await presentationApi.nextSlide();
          break;
        case 'blank':
          newState = await presentationApi.toggleBlank();
          break;
        case 'stop':
          newState = await presentationApi.stopPresentation();
          break;
        case 'refresh':
          newState = await presentationApi.getState();
          break;
        default:
          return;
      }
      setPresentation(newState);
    } catch (err) {
      console.error(`Failed to execute presentation action ${action}:`, err);
    }
  };

  const handleQuickPresentSong = async (songId: string) => {
    try {
      await presentationApi.loadSong(songId);
      const { churchSettingsApi } = await import('../api/churchSettings');
      const bg = churchSettingsApi.get().defaultSongBackground;
      if (bg) {
        await presentationApi.setBackground(bg);
      }
      await presentationApi.startPresentation();
      loadPresentationState();
      navigate('/presentation');
    } catch (err) {
      console.error('Failed to quick present song:', err);
    }
  };

  const getGreetingData = () => {
    const hour = currentTime.getHours();
    if (hour < 12) {
      return { text: 'Good Morning', icon: <MdOutlineWbSunny className="greeting-icon morning" /> };
    } else if (hour < 17) {
      return { text: 'Good Afternoon', icon: <MdWbTwilight className="greeting-icon afternoon" /> };
    } else {
      return { text: 'Good Evening', icon: <MdNightsStay className="greeting-icon evening" /> };
    }
  };

  const greetingData = getGreetingData();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getActiveSlidePreviewText = () => {
    if (!presentation || !presentation.is_live) {
      return 'Display Output Inactive';
    }
    if (presentation.is_blank) {
      return 'Display Blanked';
    }
    if (!presentation.current_slide) {
      return 'No slide loaded';
    }
    const content = presentation.current_slide.content || '';
    // Strip HTML tags for clean text preview
    return content.replace(/<[^>]*>/g, ' ');
  };

  return (
    <div className="dashboard">
      {/* Redesigned Premium Header Section */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-greeting-container">
            <span className="dash-greeting-icon-badge">{greetingData.icon}</span>
            <div className="dash-greeting-text">
              <h1>{greetingData.text}</h1>
              <p className="dash-subtitle">Worship Command Center | Live Monitor</p>
            </div>
          </div>
        </div>
        
        {/* Dynamic Digital Clock Widget */}
        <div className="dash-header-right">
          <div className="dash-clock-widget">
            <div className="dash-clock-time">
              <MdAccessTime className="dash-clock-icon" />
              <span>{formatTime(currentTime)}</span>
            </div>
            <div className="dash-clock-date">{formatDate(currentTime)}</div>
          </div>
        </div>
      </header>

      {/* Netflix-style Featured Service Billboard */}
      <div className="dash-billboard">
        <div className="billboard-overlay" />
        <div className="billboard-content">
          <span className="billboard-badge">NEXT WORSHIP PLAN</span>
          {nextService ? (
            <>
              <h1 className="billboard-title">{nextService.title}</h1>
              <p className="billboard-theme">
                {nextService.theme ? `Theme: "${nextService.theme}"` : 'Theme: Worship & Praise'}
              </p>
              <div className="billboard-meta">
                <span className="meta-item">
                  <MdSchedule size={16} />
                  <span>{new Date(nextService.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <span className="meta-item">
                  <MdLibraryMusic size={16} />
                  <span>{nextServiceActivities.length} Plan Items</span>
                </span>
              </div>
              {nextService.notes && <p className="billboard-notes">{nextService.notes}</p>}
              <div className="billboard-actions">
                <button className="billboard-btn billboard-btn-primary" onClick={() => navigate('/presentation')}>
                  <MdPlayArrow size={22} />
                  <span>Launch Live Console</span>
                </button>
                <button className="billboard-btn billboard-btn-secondary" onClick={() => navigate('/services', { state: { editServiceId: nextService.id } })}>
                  <MdEdit size={18} />
                  <span>Edit Plan</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="billboard-title">Worship Flow  is Ready</h1>
              <p className="billboard-theme">Prepare your song lyrics, scriptures, and media slides for projection</p>
              <div className="billboard-actions">
                <button className="billboard-btn billboard-btn-primary" onClick={() => handleQuickAction('new-service')}>
                  <MdAdd size={22} />
                  <span>Plan Next Service</span>
                </button>
                <button className="billboard-btn billboard-btn-secondary" onClick={() => navigate('/presentation')}>
                  <MdMonitor size={18} />
                  <span>Live Console</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards Grid (Google Workspace Style) */}
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

        {/* Projection Status Card */}
        <div className="dash-stat-card" onClick={() => navigate('/presentation')} 
             style={{ 
               '--stat-color': presentation?.is_live ? (presentation.is_blank ? '#f59e0b' : '#10b981') : '#ef4444', 
               '--stat-bg': presentation?.is_live ? (presentation.is_blank ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)') : 'rgba(239,68,68,0.1)'
             } as React.CSSProperties}>
          <div className="dash-stat-icon">
            <MdMonitor size={24} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-label">Projection</span>
            <span className="dash-stat-value" style={{ fontSize: '1.25rem' }}>
              {stats.loading ? '—' : (presentation?.is_live ? (presentation.is_blank ? 'BLANKED' : 'LIVE') : 'STANDBY')}
            </span>
          </div>
          <div className="dash-stat-trend" style={{ color: 'white', background: presentation?.is_live ? (presentation.is_blank ? '#f59e0b' : '#10b981') : '#ef4444' }}>
            {presentation?.is_live ? 'ON AIR' : 'OFF LINE'}
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Layout */}
      <div className="dash-content">
        {/* Left Column: Live Control & Quick Links */}
        <div className="dash-left-column">
          
          {/* Live Presentation Monitor Widget */}
          <div className="dash-card dash-live-monitor">
            <div className="dash-card-header">
              <div className="dash-live-header-info">
                <h2>Live Presentation Monitor</h2>
                <span className="dash-card-sub">Active Slide Preview</span>
              </div>
              <div className="dash-live-badge-group">
                {presentation?.is_live && <span className="dash-badge live-pulse-badge">LIVE</span>}
                {presentation?.is_blank && <span className="dash-badge blank-badge">BLANK</span>}
                <button className="dash-monitor-refresh" onClick={() => handlePresentationControl('refresh')} title="Sync Slide State">
                  <MdRefresh size={16} />
                </button>
              </div>
            </div>
            
            <div className="dash-monitor-body">
              {/* Virtual Output Screen Screen */}
              <div className={`dash-monitor-screen ${presentation?.is_blank ? 'blanked' : ''} ${!presentation?.is_live ? 'inactive' : ''}`}>
                <div className="dash-monitor-screen-glare" />
                <div className="dash-monitor-screen-text">
                  {getActiveSlidePreviewText()}
                </div>
                {presentation?.is_live && presentation?.current_slide && (
                  <div className="dash-monitor-screen-meta">
                    Slide {presentation.current_index + 1} of {presentation.total_slides} · Type: {presentation.current_slide.slide_type.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Presentation Live Controls Panel */}
              <div className="dash-monitor-controls">
                <button 
                  className="monitor-ctrl-btn" 
                  disabled={!presentation?.is_live || presentation.current_index <= 0}
                  onClick={() => handlePresentationControl('prev')}
                  title="Previous Slide"
                >
                  <MdSkipPrevious size={22} />
                  <span>Prev</span>
                </button>
                <button 
                  className="monitor-ctrl-btn" 
                  disabled={!presentation?.is_live || presentation.current_index >= presentation.total_slides - 1}
                  onClick={() => handlePresentationControl('next')}
                  title="Next Slide"
                >
                  <span>Next</span>
                  <MdSkipNext size={22} />
                </button>
                <button 
                  className={`monitor-ctrl-btn toggle-btn ${presentation?.is_blank ? 'active' : ''}`}
                  disabled={!presentation?.is_live}
                  onClick={() => handlePresentationControl('blank')}
                  title="Toggle Screen Blank"
                >
                  <MdVisibilityOff size={18} />
                  <span>{presentation?.is_blank ? 'Unblank' : 'Blank'}</span>
                </button>
                <button 
                  className="monitor-ctrl-btn stop-btn" 
                  disabled={!presentation?.is_live}
                  onClick={() => handlePresentationControl('stop')}
                  title="Close Presentation"
                >
                  <MdHighlightOff size={18} />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel removed as requested */}
        </div>

        {/* Right Column: Order of Worship & System Status */}
        <div className="dash-right">
          
          {/* Order of Worship Timeline (Netflix Playlist Style) */}
          <div className="dash-card dash-timeline-card">
            <div className="dash-card-header">
              <h2>Order of Worship</h2>
              <span className="dash-card-sub">Next Service Timeline</span>
            </div>
            
            <div className="dash-timeline-body">
              {nextService ? (
                nextServiceActivities.length > 0 ? (
                  <div className="dash-timeline-list">
                    {nextServiceActivities.map((act, idx) => (
                      <div key={act.id} className="dash-timeline-item">
                        <div className="dash-timeline-connector-line" />
                        <div className="dash-timeline-dot">
                          <span>{idx + 1}</span>
                        </div>
                        <div className="dash-timeline-content">
                          <div className="dash-timeline-item-title-row">
                            <span className="dash-timeline-item-name">{act.name}</span>
                            <span className="dash-timeline-item-time">{act.duration_minutes}m</span>
                          </div>
                          {act.leader && <span className="dash-timeline-item-leader">Lead: {act.leader}</span>}
                          {act.notes && <p className="dash-timeline-item-notes">{act.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dash-empty">
                    No items scheduled for this service.<br />
                    <button className="timeline-empty-btn" onClick={() => navigate('/services', { state: { editServiceId: nextService.id } })}>
                      Add Items
                    </button>
                  </div>
                )
              ) : (
                <div className="dash-empty">
                  No upcoming services.<br />
                  <button className="timeline-empty-btn" onClick={() => handleQuickAction('new-service')}>
                    Create Service
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Present Songs Widget */}
          {recentSongs.length > 0 && (
            <div className="dash-card dash-quick-songs">
              <div className="dash-card-header">
                <h2>Quick Launch Songs</h2>
                <span className="dash-card-sub">Present recently added songs</span>
              </div>
              <div className="dash-quick-songs-list">
                {recentSongs.map((song) => (
                  <div key={song.id} className="dash-quick-song-row" onClick={() => handleQuickPresentSong(song.id)}>
                    <div className="dash-quick-song-icon">
                      <MdLibraryMusic size={18} />
                    </div>
                    <div className="dash-quick-song-details">
                      <span className="dash-quick-song-title">{song.title}</span>
                      <span className="dash-quick-song-key">{song.key ? `Key: ${song.key}` : 'Lyrics'}</span>
                    </div>
                    <button className="dash-quick-song-play-btn" title="Present Live">
                      <MdPlayArrow size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Status Widget removed as requested */}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
