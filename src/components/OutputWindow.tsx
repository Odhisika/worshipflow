import React, { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { presentationApi, PresentationInfo } from '../api/presentation';
import { timerApi, TimerInfo } from '../api/timer';
import { Slide } from '../api';
import { mediaApi } from '../api/media';
import { churchSettingsApi, ChurchSettings } from '../api/churchSettings';
import './OutputWindow.css';
import './BackgroundPicker.css';
import './PresentationStyles.css';

const OutputWindow: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const [isBlank, setIsBlank] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [settings, setSettings] = useState<ChurchSettings>(churchSettingsApi.get());
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number>(0);
  const [isOverrun, setIsOverrun] = useState(false);

  // Load logo whenever the path changes
  useEffect(() => {
    if (settings.churchLogoPath) {
      mediaApi.getLocalImageUrl(settings.churchLogoPath).then(url => setLogoUrl(url));
    } else {
      setLogoUrl('');
    }
  }, [settings.churchLogoPath]);

  // Sync state from backend AND from localStorage (settings).
  // Called on mount, on every event, and on the 500ms poll.
  // useCallback with no deps so the reference is stable across renders.
  const syncState = useCallback(async () => {
    try {
      // Always re-read branding settings from localStorage so changes made in
      // the control panel appear on screen within the next poll cycle.
      setSettings(churchSettingsApi.get());

      const state = await presentationApi.getState();
      setCurrentSlide(state.current_slide);
      setIsBlank(state.is_blank);
      setIsLive(state.is_live);

      if (state.current_slide?.slide_type === 'timer') {
        const tState = await timerApi.getState();
        if (tState.current_timer) {
          const remaining = tState.current_timer.duration_seconds - tState.current_timer.elapsed_seconds;
          setActiveTimerSeconds(Math.abs(remaining));
          setIsOverrun(tState.current_timer.is_overrun);
        }
      }
    } catch (err) {
      console.error('[OutputWindow] syncState failed:', err);
    }
  }, []);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    const setup = async () => {
      // Register all listeners first so no event is missed, then pull current state.
      const unSlideChanged = await listen('slide-changed', (event: any) => {
        const info: PresentationInfo = event.payload;
        setCurrentSlide(info.current_slide);
        setIsBlank(info.is_blank);
        setIsLive(info.is_live);
        if (info.current_slide?.slide_type === 'timer') {
          const secs = parseInt(info.current_slide.content || '0');
          setActiveTimerSeconds(Math.abs(secs));
          setIsOverrun(secs < 0);
        }
      });
      unlisteners.push(unSlideChanged);

      const unBlankToggled = await listen('blank-toggled', (event: any) => {
        const info: PresentationInfo = event.payload;
        setIsBlank(info.is_blank);
      });
      unlisteners.push(unBlankToggled);

      const unStarted = await listen('presentation-started', (event: any) => {
        const info: PresentationInfo = event.payload;
        setCurrentSlide(info.current_slide);
        setIsBlank(info.is_blank);
        setIsLive(true);
      });
      unlisteners.push(unStarted);

      const unStopped = await listen('presentation-stopped', () => {
        setIsLive(false);
        setIsBlank(false);
        setCurrentSlide(null);
      });
      unlisteners.push(unStopped);

      const unTimer = await listen('timer-updated', (event: any) => {
        const info: TimerInfo = event.payload;
        if (info.current_timer) {
          const remaining = info.current_timer.duration_seconds - info.current_timer.elapsed_seconds;
          setActiveTimerSeconds(Math.abs(remaining));
          setIsOverrun(info.current_timer.is_overrun);
        }
      });
      unlisteners.push(unTimer);

      const unSettings = await listen('settings-changed', () => {
        // Re-read from localStorage to get the canonical saved value
        setSettings(churchSettingsApi.get());
      });
      unlisteners.push(unSettings);

      // Pull current state after listeners are up — catches anything that fired before we loaded
      await syncState();
    };

    setup();

    // 500 ms safety-net poll: ensures the output window never stays stuck in standby
    // even if every single event is missed (e.g. window loaded after events fired).
    const pollInterval = setInterval(syncState, 500);

    const unsub = churchSettingsApi.subscribe(s => setSettings(s));

    return () => {
      clearInterval(pollInterval);
      unsub();
      unlisteners.forEach(fn => fn());
    };
  }, [syncState]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBuiltinBgClass = (bg: string | undefined | null): string => {
    if (!bg || !bg.startsWith('builtin:')) return '';
    return `bg-${bg.replace('builtin:', '')}`;
  };

  const getBgStyle = (bg: string | undefined | null): React.CSSProperties => {
    if (!bg || bg.startsWith('builtin:')) return {};
    return {
      backgroundImage: `url(${mediaApi.getAssetUrl(bg)})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  };

  if (isBlank) {
    return <div className="output-window blank"></div>;
  }

  if (!isLive || !currentSlide) {
    return (
      <div className="output-window">
        <div className="waiting-message">
          {logoUrl ? (
            <img src={logoUrl} alt="Church Logo" className="standby-logo" />
          ) : (
            <div className="logo">{settings.churchName || 'WorshipFlow Pro'}</div>
          )}
          {!logoUrl && settings.churchName && (
            <p className="standby-church-name">{settings.churchName}</p>
          )}
        </div>
      </div>
    );
  }

  const isImageBg = currentSlide.background_path && !currentSlide.background_path.startsWith('builtin:');
  const builtinClass = getBuiltinBgClass(currentSlide.background_path);
  const bgStyle = getBgStyle(currentSlide.background_path);

  const bgLayer = currentSlide.background_path && (
    <div className="output-bg-container">
      <div
        className={`output-bg-layer ${builtinClass} ${isImageBg ? 'is-image' : ''}`}
        style={bgStyle}
      />
      <div className="output-bg-overlay" />
    </div>
  );

  if (currentSlide.slide_type === 'timer') {
    return (
      <div className={`output-window timer-mode ${isOverrun ? 'overrun' : ''}`}>
        {bgLayer}
        {logoUrl && (
          <div className="church-watermark">
            <img src={logoUrl} alt="Church Logo" className="watermark-logo" />
            {settings.churchName && <span className="watermark-name">{settings.churchName}</span>}
          </div>
        )}
        <div className="timer-overlay">
          <div className="timer-activity-title">{currentSlide.title}</div>
          <div className="timer-ticking-display">
            {isOverrun && <span className="overrun-indicator">+</span>}
            {formatTime(activeTimerSeconds)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`output-window style-${settings.presentationStyle}`}>
      {bgLayer}

      {logoUrl && (
        <div className="church-watermark">
          <img src={logoUrl} alt="Church Logo" className="watermark-logo" />
          {settings.churchName && <span className="watermark-name">{settings.churchName}</span>}
        </div>
      )}

      <div className={`slide-display slide-${currentSlide.slide_type}`}>
        <div className="content-wrapper">
          {currentSlide.title && (
            <div className="output-title">{currentSlide.title}</div>
          )}
          <div className="output-content">
            {currentSlide.content}
          </div>
        </div>
      </div>

      {settings.tickerEnabled && settings.tickerText && (
        <div className="news-ticker">
          <div className="ticker-label">LATEST</div>
          <div className="ticker-text-container">
            <div className="ticker-text">{settings.tickerText}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputWindow;
