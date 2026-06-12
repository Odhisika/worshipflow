import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [mediaSrc, setMediaSrc] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load logo whenever the path changes
  useEffect(() => {
    if (settings.churchLogoPath) {
      mediaApi.getLocalImageUrl(settings.churchLogoPath).then(url => setLogoUrl(url));
    } else {
      setLogoUrl('');
    }
  }, [settings.churchLogoPath]);

  // Load media blob URL for video/audio slides
  useEffect(() => {
    if (currentSlide?.slide_type === 'video' || currentSlide?.slide_type === 'audio') {
      if (currentSlide.media_path) {
        console.log(`[OutputWindow] Fetching media URL for ${currentSlide.slide_type}: ${currentSlide.media_path}`);
        mediaApi.getMediaUrl(currentSlide.media_path).then(url => {
          console.log(`[OutputWindow] Media URL resolved: ${url.substring(0, 80)}...`);
          setMediaSrc(url);
        });
      } else {
        console.warn('[OutputWindow] Media slide has no media_path');
        setMediaSrc('');
      }
    } else {
      setMediaSrc('');
    }
  }, [currentSlide]);

  const syncState = useCallback(async () => {
    try {
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
        // Pause video/audio when slide changes
        if (videoRef.current) { videoRef.current.pause(); }
        if (audioRef.current) { audioRef.current.pause(); }
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
        setSettings(churchSettingsApi.get());
      });
      unlisteners.push(unSettings);

      await syncState();
    };

    setup();

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

  const fontStyle = { '--presentation-font': settings.selectedFont } as React.CSSProperties;

  if (isBlank) {
    return <div className="output-window blank" style={fontStyle}><div className="drag-handle" data-tauri-drag-region /></div>;
  }

  if (!isLive || !currentSlide) {
    return (
      <div className="output-window" style={fontStyle}>
        <div className="drag-handle" data-tauri-drag-region />
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

  // Timer slide
  if (currentSlide.slide_type === 'timer') {
    return (
      <div className={`output-window timer-mode ${isOverrun ? 'overrun' : ''}`} style={fontStyle}>
        <div className="drag-handle" data-tauri-drag-region />
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

  // Image slide — full-bleed image
  if (currentSlide.slide_type === 'image' && currentSlide.media_path) {
    return (
      <div className={`output-window style-${settings.presentationStyle}`} style={fontStyle}>
        <div className="drag-handle" data-tauri-drag-region />
        {logoUrl && (
          <div className="church-watermark">
            <img src={logoUrl} alt="Church Logo" className="watermark-logo" />
            {settings.churchName && <span className="watermark-name">{settings.churchName}</span>}
          </div>
        )}
        <div className="media-slide-display image-slide-display">
          <img
            src={mediaApi.getAssetUrl(currentSlide.media_path)}
            alt={currentSlide.title || 'Image'}
            className="media-slide-image"
          />
          {currentSlide.title && (
            <div className="media-slide-caption">{currentSlide.title}</div>
          )}
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
  }

  // Video slide
  if (currentSlide.slide_type === 'video' && currentSlide.media_path) {
    return (
      <div className={`output-window style-${settings.presentationStyle}`} style={fontStyle}>
        <div className="drag-handle" data-tauri-drag-region />
        <div className="media-slide-display video-slide-display">
          <video
            ref={videoRef}
            src={mediaSrc || mediaApi.getAssetUrl(currentSlide.media_path)}
            className="media-slide-video"
            controls
            autoPlay
            loop
            playsInline
            onError={(e) => {
              const mediaError = (e.target as HTMLVideoElement).error;
              console.error(`[OutputWindow] Video error:`, {
                code: mediaError?.code,
                message: mediaError?.message,
                src: (e.target as HTMLVideoElement).src,
              });
              mediaApi.logTerminal('error', `[OutputWindow] Video error code=${mediaError?.code}: ${mediaError?.message}`);
            }}
            onLoadedMetadata={() => console.log(`[OutputWindow] Video metadata loaded, duration=${videoRef.current?.duration}s`)}
            onCanPlay={() => console.log('[OutputWindow] Video can play')}
            onWaiting={() => console.warn('[OutputWindow] Video waiting (buffering)')}
            onStalled={() => console.warn('[OutputWindow] Video stalled')}
          />
        </div>
        {logoUrl && (
          <div className="church-watermark">
            <img src={logoUrl} alt="Church Logo" className="watermark-logo" />
            {settings.churchName && <span className="watermark-name">{settings.churchName}</span>}
          </div>
        )}
      </div>
    );
  }

  // Audio slide
  if (currentSlide.slide_type === 'audio' && currentSlide.media_path) {
    return (
      <div className={`output-window style-${settings.presentationStyle}`} style={fontStyle}>
        <div className="drag-handle" data-tauri-drag-region />
        {bgLayer}
        {logoUrl && (
          <div className="church-watermark">
            <img src={logoUrl} alt="Church Logo" className="watermark-logo" />
            {settings.churchName && <span className="watermark-name">{settings.churchName}</span>}
          </div>
        )}
        <div className="audio-slide-display">
          <div className="audio-visualizer">
            <span className="audio-icon">♪</span>
          </div>
          <div className="audio-slide-title">{currentSlide.title || 'Audio'}</div>
          <audio
            ref={audioRef}
            src={mediaSrc || mediaApi.getAssetUrl(currentSlide.media_path)}
            controls
            autoPlay
            className="audio-slide-player"
            onError={(e) => {
              const mediaError = (e.target as HTMLAudioElement).error;
              console.error(`[OutputWindow] Audio error:`, {
                code: mediaError?.code,
                message: mediaError?.message,
                src: (e.target as HTMLAudioElement).src,
              });
              mediaApi.logTerminal('error', `[OutputWindow] Audio error code=${mediaError?.code}: ${mediaError?.message}`);
            }}
            onLoadedMetadata={() => console.log(`[OutputWindow] Audio metadata loaded, duration=${audioRef.current?.duration}s`)}
            onCanPlay={() => console.log('[OutputWindow] Audio can play')}
          />
        </div>
      </div>
    );
  }

  // Window capture slide
  if (currentSlide.slide_type === 'capture' && currentSlide.media_path) {
    return (
      <div className={`output-window style-${settings.presentationStyle}`} style={fontStyle}>
        <div className="drag-handle" data-tauri-drag-region />
        <div className="media-slide-display capture-slide-display">
          <img
            src={mediaApi.getAssetUrl(currentSlide.media_path)}
            alt={currentSlide.title || 'Window Capture'}
            className="media-slide-image"
          />
          {currentSlide.title && (
            <div className="media-slide-caption">{currentSlide.title}</div>
          )}
        </div>
        {logoUrl && (
          <div className="church-watermark">
            <img src={logoUrl} alt="Church Logo" className="watermark-logo" />
            {settings.churchName && <span className="watermark-name">{settings.churchName}</span>}
          </div>
        )}
      </div>
    );
  }

  // Bible web slide — display the URL as an iframe
  if (currentSlide.slide_type === 'capture' && !currentSlide.media_path && currentSlide.content.startsWith('http')) {
    return (
      <div className="output-window web-bible-display" style={fontStyle}>
        <div className="drag-handle" data-tauri-drag-region />
        <iframe
          src={currentSlide.content}
          className="web-bible-iframe"
          title={currentSlide.title || 'Online Bible'}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    );
  }

  // Default: text-based slides (text, song, bible, announcement)
  return (
    <div className={`output-window style-${settings.presentationStyle}`} style={fontStyle}>
      <div className="drag-handle" data-tauri-drag-region />
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
          <div className="output-content rich-text-render" dangerouslySetInnerHTML={{ __html: currentSlide.content }} />
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
