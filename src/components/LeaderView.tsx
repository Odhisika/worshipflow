import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { timerApi, TimerInfo } from '../api/timer';
import './LeaderView.css';

const LeaderView: React.FC = () => {
  const [timerInfo, setTimerInfo] = useState<TimerInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadTimerState();
    setupEventListeners();
    
    // Update clock and timer every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      loadTimerState();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    
    await listen('timer-stopped', (event: any) => {
      setTimerInfo(event.payload);
    });

    await listen('timer-updated', (event: any) => {
      setTimerInfo(event.payload);
    });
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
      second: '2-digit',
      hour12: true 
    });
  };

  const currentTimer = timerInfo?.current_timer;

  if (!currentTimer) {
    return (
      <div className="leader-view">
        <div className="waiting-state">
          <div className="clock-large">{formatClock(currentTime)}</div>
          <div className="waiting-message">
            <div className="waiting-icon">⏱️</div>
            <h2>Timer Ready</h2>
            <p>Start an activity to begin countdown</p>
          </div>
        </div>
      </div>
    );
  }

  const remaining = currentTimer.is_overrun 
    ? currentTimer.elapsed_seconds - currentTimer.duration_seconds
    : currentTimer.duration_seconds - currentTimer.elapsed_seconds;
  
  const isWarning = !currentTimer.is_overrun && remaining < 120; // 2 minutes
  const isOvertime = currentTimer.is_overrun;

  return (
    <div className={`leader-view ${isOvertime ? 'overtime' : isWarning ? 'warning' : ''}`}>
      {/* Top Bar */}
      <div className="leader-header">
        <div className="current-clock">{formatClock(currentTime)}</div>
        <div className="service-info">
          <div className="info-item">
            <span className="label">Completed:</span>
            <span className="value">{timerInfo.completed_count}</span>
          </div>
          <div className="info-item">
            <span className="label">Remaining:</span>
            <span className="value">{timerInfo.upcoming_count}</span>
          </div>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="timer-main-display">
        <div className="activity-title">{currentTimer.activity_name}</div>
        
        <div className={`countdown-massive ${!currentTimer.is_running ? 'paused' : ''}`}>
          {isOvertime && <div className="overtime-indicator">OVERTIME</div>}
          <div className="countdown-time">
            {isOvertime && '+'}
            {formatTime(remaining)}
          </div>
          {!currentTimer.is_running && (
            <div className="paused-indicator">⏸️ PAUSED</div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="time-indicators">
          <div className="indicator">
            <div className="indicator-label">Elapsed</div>
            <div className="indicator-value">{formatTime(currentTimer.elapsed_seconds)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Total</div>
            <div className="indicator-value">{formatTime(currentTimer.duration_seconds)}</div>
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="leader-footer">
        <div className="total-time">
          <span className="label">Total Service Time:</span>
          <span className="value">{formatTime(timerInfo.total_elapsed)}</span>
        </div>
        {timerInfo.upcoming_count > 0 && (
          <div className="remaining-time">
            <span className="label">Time Remaining:</span>
            <span className="value">{formatTime(timerInfo.total_remaining)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderView;
