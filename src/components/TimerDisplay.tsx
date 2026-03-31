import React, { useEffect, useState } from 'react';
import { timerApi, TimerInfo, TimerState } from '../api/timer';
import { serviceApi, Service } from '../api';
import { listen } from '@tauri-apps/api/event';
import { MdTimer, MdMonitor, MdCheckCircle, MdPlayArrow, MdPause, MdStop, MdSkipNext, MdTrackChanges } from 'react-icons/md';
import './TimerDisplay.css';

const TimerDisplay: React.FC = () => {
  const [timerInfo, setTimerInfo] = useState<TimerInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadServices();
    loadTimerState();
    setupEventListeners();

    // Update clock every second
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(clockInterval);
    };
  }, []);

  // Update timer display every second when running
  // Also keeps presentation in sync if we are presenting the timer
  useEffect(() => {
    if (timerInfo?.current_timer?.is_running) {
       // We don't actually need to re-push the slide every second because
       // the output window will listen to 'timer-updated' natively in the next step.
      const interval = setInterval(() => {
        loadTimerState();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerInfo?.current_timer?.is_running]);

  const loadServices = async () => {
    try {
      const data = await serviceApi.getAll();
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const loadTimerState = async () => {
    try {
      const state = await timerApi.getState();
      setTimerInfo(state);
    } catch (error) {
      console.error('Failed to load timer state:', error);
    }
  };

  const setupEventListeners = async () => {
    await listen('timer-started', (event: any) => {
      setTimerInfo(event.payload);
    });

    await listen('timer-paused', (event: any) => {
      setTimerInfo(event.payload);
    });

    await listen('timer-resumed', (event: any) => {
      setTimerInfo(event.payload);
    });

    await listen('timer-updated', (event: any) => {
      setTimerInfo(event.payload);
    });
  };

  const handleLoadService = async () => {
    if (!selectedService) return;

    try {
      setLoading(true);
      const info = await timerApi.loadService(selectedService);
      setTimerInfo(info);
    } catch (error) {
      console.error('Failed to load service:', error);
      alert('Failed to load service to timer');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNext = async () => {
    try {
      const info = await timerApi.startNext();
      setTimerInfo(info);
    } catch (error) {
      console.error('Failed to start next activity:', error);
    }
  };

  const handlePause = async () => {
    try {
      const info = await timerApi.pause();
      setTimerInfo(info);
    } catch (error) {
      console.error('Failed to pause timer:', error);
    }
  };

  const handleResume = async () => {
    try {
      const info = await timerApi.resume();
      setTimerInfo(info);
    } catch (error) {
      console.error('Failed to resume timer:', error);
    }
  };

  const handleAddTime = async (seconds: number) => {
    try {
      const info = await timerApi.addTime(seconds);
      setTimerInfo(info);
    } catch (error) {
      console.error('Failed to add time:', error);
    }
  };

  const handleStop = async () => {
    try {
      const info = await timerApi.stop();
      setTimerInfo(info);
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatClock = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getProgressPercentage = (timer: TimerState): number => {
    return Math.min((timer.elapsed_seconds / timer.duration_seconds) * 100, 100);
  };

  const getTimerColor = (timer: TimerState): string => {
    if (timer.is_overrun) return '#ef4444'; // red
    const percentage = getProgressPercentage(timer);
    if (percentage > 90) return '#f59e0b'; // amber
    if (percentage > 75) return '#eab308'; // yellow
    return '#10b981'; // green
  };

  const currentTimer = timerInfo?.current_timer;

  return (
    <div className="timer-display">
      <header className="timer-header">
        <div className="header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdTimer size={28} color="#3b82f6" /> Service Timer
          </h1>
          <div className="current-time">{formatClock(currentTime)}</div>
        </div>
        <div className="header-actions">
          <button
            className="btn-leader-view"
            onClick={() => window.open('/leader.html', '_blank', 'width=1920,height=1080')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <MdMonitor size={18} /> Leader View
          </button>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{timerInfo?.completed_count || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Upcoming</span>
              <span className="stat-value">{timerInfo?.upcoming_count || 0}</span>
            </div>
          </div>
        </div>
      </header>

      {!currentTimer ? (
        <div className="timer-setup">
          <div className="setup-card">
            <div className="setup-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MdTrackChanges size={48} color="#3b82f6" />
            </div>
            <h2>Load Service to Start Timer</h2>
            <p>Select a service to begin tracking activities</p>

            <div className="service-selector">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="service-select"
              >
                <option value="">Select a service...</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.title} - {service.date}
                  </option>
                ))}
              </select>
              <button
                onClick={handleLoadService}
                disabled={!selectedService || loading}
                className="btn-load-service"
              >
                {loading ? 'Loading...' : 'Load Service'}
              </button>
            </div>

            {timerInfo && timerInfo.upcoming_count > 0 && (
              <div className="ready-to-start">
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <MdCheckCircle color="#10b981" /> Service loaded with {timerInfo.upcoming_count} activities
                </p>
                <button onClick={handleStartNext} className="btn-start-big">
                  Start First Activity
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="timer-active">
          {/* Main Timer Display */}
          <div className="timer-main">
            <div className="activity-name">{currentTimer.activity_name}</div>

            <div className={`countdown ${currentTimer.is_overrun ? 'overrun' : ''}`}>
              <div
                className="countdown-display"
                style={{ color: getTimerColor(currentTimer) }}
              >
                {currentTimer.is_overrun ? '+' : ''}
                {formatTime(
                  currentTimer.is_overrun
                    ? currentTimer.elapsed_seconds - currentTimer.duration_seconds
                    : currentTimer.duration_seconds - currentTimer.elapsed_seconds
                )}
              </div>
              <div className="countdown-label">
                {currentTimer.is_overrun ? 'OVERTIME' : 'Remaining'}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{
                  width: `${Math.min(getProgressPercentage(currentTimer), 100)}%`,
                  backgroundColor: getTimerColor(currentTimer)
                }}
              />
            </div>

            <div className="timer-stats-row">
              <div className="stat-box">
                <div className="stat-box-label">Elapsed</div>
                <div className="stat-box-value">{formatTime(currentTimer.elapsed_seconds)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Total</div>
                <div className="stat-box-value">{formatTime(currentTimer.duration_seconds)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Progress</div>
                <div className="stat-box-value">{getProgressPercentage(currentTimer).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="timer-controls">
            <div className="control-group">
              <button
                onClick={currentTimer.is_running ? handlePause : handleResume}
                className="btn-control primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {currentTimer.is_running ? <><MdPause size={20} /> Pause</> : <><MdPlayArrow size={20} /> Resume</>}
              </button>
              <button
                onClick={handleStop}
                className="btn-control danger"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <MdStop size={20} /> Stop
              </button>
              {timerInfo.upcoming_count > 0 && (
                <button
                  onClick={handleStartNext}
                  className="btn-control success"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <MdSkipNext size={20} /> Next Activity
                </button>
              )}
            </div>

            <div className="time-adjust">
              <span className="adjust-label">Adjust Time:</span>
              <button onClick={() => handleAddTime(60)} className="btn-time">+1m</button>
              <button onClick={() => handleAddTime(300)} className="btn-time">+5m</button>
              <button onClick={() => handleAddTime(-60)} className="btn-time">-1m</button>
            </div>
          </div>

          {/* Service Progress */}
          <div className="service-progress">
            <h3>Service Progress</h3>
            <div className="progress-grid">
              <div className="progress-item">
                <div className="progress-label">Total Elapsed</div>
                <div className="progress-value">{formatTime(timerInfo.total_elapsed)}</div>
              </div>
              <div className="progress-item">
                <div className="progress-label">Remaining</div>
                <div className="progress-value">{formatTime(timerInfo.total_remaining)}</div>
              </div>
              <div className="progress-item highlight">
                <div className="progress-label">Activities Left</div>
                <div className="progress-value">{timerInfo.upcoming_count}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerDisplay;
