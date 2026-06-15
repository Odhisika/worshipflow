import React, { useState, useRef, useEffect, useCallback } from 'react';
import { mediaApi, LocalMediaFile } from '../api/media';
import {
    MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious,
    MdVolumeUp, MdVolumeOff, MdShuffle, MdRepeat, MdFullscreen,
    MdAudiotrack, MdMovie, MdGraphicEq, MdQueueMusic,
    MdPlaylistPlay, MdLibraryMusic, MdAdd, MdFolderOpen,
} from 'react-icons/md';
import './MediaPlayer.css';

type Tab = 'audio' | 'video';

const createLocalMediaFile = (path: string): LocalMediaFile => ({
    name: mediaApi.getFileName(path),
    path,
    extension: mediaApi.getFileExtension(path),
    size_bytes: 0,
});

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

// Log to both DevTools console AND the terminal (via Rust invoke)
const termLog = (level: 'info' | 'warn' | 'error', ...args: unknown[]) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
    if (level === 'error') console.error('[MediaPlayer]', ...args);
    else if (level === 'warn') console.warn('[MediaPlayer]', ...args);
    else console.log('[MediaPlayer]', ...args);
    mediaApi.logTerminal(level, msg).catch(() => {});
};

const MediaPlayer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('audio');

    // ── Audio ──────────────────────────────────────────────────────────────
    const [audioPlaylist, setAudioPlaylist] = useState<LocalMediaFile[]>([]);
    const [currentAudioIndex, setCurrentAudioIndex] = useState(-1);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [audioVolume, setAudioVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [trackDurations, setTrackDurations] = useState<Record<string, number>>({});

    // ── Video ──────────────────────────────────────────────────────────────
    const [videoPlaylist, setVideoPlaylist] = useState<LocalMediaFile[]>([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [showVideoControls, setShowVideoControls] = useState(true);
    const [videoVolume, setVideoVolume] = useState(1);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [playableFallbacks, setPlayableFallbacks] = useState<Record<string, string>>({});
    const [preparingPlayback, setPreparingPlayback] = useState<Record<string, boolean>>({});
    const [resolvedAudioUrl, setResolvedAudioUrl] = useState('');
    const [resolvedVideoUrl, setResolvedVideoUrl] = useState('');

    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const currentAudio = currentAudioIndex >= 0 ? audioPlaylist[currentAudioIndex] : null;
    const currentVideo = currentVideoIndex >= 0 ? videoPlaylist[currentVideoIndex] : null;

    // Resolve blob URLs asynchronously (streams file from disk in chunks)
    useEffect(() => {
        if (!currentAudio) { setResolvedAudioUrl(''); return; }
        let cancelled = false;
        const path = playableFallbacks[currentAudio.path] ?? currentAudio.path;
        mediaApi.getMediaUrl(path).then(url => {
            if (!cancelled) {
                termLog('info', 'audio blob URL resolved:', { path, url });
                setResolvedAudioUrl(url);
            }
        });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAudio?.path, playableFallbacks[currentAudio?.path ?? '']]);

    useEffect(() => {
        if (!currentVideo) { setResolvedVideoUrl(''); return; }
        // While ffmpeg is converting, do NOT set any src — prevents the browser from
        // showing its native loading spinner on a file it cannot decode.
        if (preparingPlayback[currentVideo.path] && !playableFallbacks[currentVideo.path]) {
            setResolvedVideoUrl('');
            return;
        }
        let cancelled = false;
        const path = playableFallbacks[currentVideo.path] ?? currentVideo.path;
        mediaApi.getMediaUrl(path).then(url => {
            if (!cancelled) {
                termLog('info', 'video url resolved:', { path, url });
                setResolvedVideoUrl(url);
            }
        });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentVideo?.path, playableFallbacks[currentVideo?.path ?? ''], preparingPlayback[currentVideo?.path ?? '']]);

    const audioSrc = resolvedAudioUrl;
    const videoSrc = resolvedVideoUrl;

    // ── Format probe — check BEFORE handing the file to the <video> element ──
    // On Linux/WebKit, MP4 H.264 requires GStreamer plugins that are often absent.
    // By probing first we avoid the browser silently buffering a file it can't play.
    const checkVideoCanPlay = (filePath: string): boolean => {
        const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
        const el = document.createElement('video');
        const probes: Record<string, string> = {
            webm : 'video/webm; codecs="vp8, vorbis"',
            ogv  : 'video/ogg; codecs="theora"',
            ogg  : 'video/ogg; codecs="theora"',
            mp4  : 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
            mov  : 'video/mp4',
        };
        const mime = probes[ext];
        if (!mime) return false;
        const r = el.canPlayType(mime);
        return r === 'probably' || r === 'maybe';
    };

    const describeMediaError = (
        label: 'Audio' | 'Video',
        el: HTMLMediaElement,
        file: LocalMediaFile | null,
    ) => {
        const err = el.error;
        const code = err?.code;
        const msgs: Record<number, string> = {
            1: 'Loading was aborted',
            2: 'Could not read the local media URL',
            3: 'The file was found, but this system cannot decode its codec',
            4: 'The file was not found, blocked, or the format is unsupported',
        };
        termLog('error', `${label} media error:`, {
            errorCode: code,
            errorMessage: err?.message || '(no message)',
            networkState: el.networkState,
            readyState: el.readyState,
            currentSrc: el.currentSrc,
            filePath: file?.path,
            originalError: err,
        });
        const detail = code ? msgs[code] : err?.message ?? 'Unknown playback error';
        const fileHint = file ? ` (${file.extension.toUpperCase()}: ${file.path})` : '';
        return `${label}: ${detail}${fileHint}`;
    };

    // Only called when the browser rejects the file (codec error codes 3 or 4).
    // For common formats (MP4, MP3, OGG, WebM, WAV) the browser plays them directly
    // and this is never needed.
    const convertAndRetry = useCallback(async (
        mediaType: 'audio' | 'video',
        file: LocalMediaFile,
    ) => {
        if (playableFallbacks[file.path] || preparingPlayback[file.path]) return;

        const label = mediaType === 'audio' ? 'Audio' : 'Video';
        setPreparingPlayback(prev => ({ ...prev, [file.path]: true }));
        setPlaybackError(`${label}: Converting unsupported format — this may take a minute…`);

        try {
            const convertedPath = await mediaApi.prepareForPlayback(file.path, mediaType);
            if (!convertedPath) throw new Error('Conversion returned no output file.');
            setPlayableFallbacks(prev => ({ ...prev, [file.path]: convertedPath }));
            setPlaybackError(null);
        } catch (error) {
            setPlaybackError(`${label}: Cannot play this file. ${errorMessage(error)}`);
        } finally {
            setPreparingPlayback(prev => { const n = { ...prev }; delete n[file.path]; return n; });
        }
    }, [playableFallbacks, preparingPlayback]);

    // ── Audio: load new track when index/src changes ───────────────────────
    useEffect(() => {
        const el = audioRef.current;
        if (!el || !audioSrc) return;
        setPlaybackError(null);
        setAudioProgress(0);
        setAudioDuration(0);
        el.load();
        if (isAudioPlaying) {
            el.play().catch(e => {
                termLog('error', 'Audio play() rejected:', e.message);
                setPlaybackError(`Audio: ${e.message}`);
                setIsAudioPlaying(false);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAudioIndex, audioSrc]);

    // ── Audio: event listeners ─────────────────────────────────────────────
    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;

        const onTime = () => setAudioProgress(el.currentTime);
        const onMeta = () => {
            setAudioDuration(el.duration);
            // Cache duration for the track list
            if (currentAudio) {
                setTrackDurations(prev => ({ ...prev, [currentAudio.path]: el.duration }));
            }
        };
        const onEnded = () => {
            if (isRepeat) {
                el.currentTime = 0;
                el.play().catch(console.error);
            } else {
                playNextAudio();
            }
        };
        const onPlay = () => setIsAudioPlaying(true);
        const onPause = () => setIsAudioPlaying(false);
        const onError = () => {
            if (!currentAudio) return; // Ignore empty/unset source load errors
            const code = el.error?.code;
            termLog('error', 'Audio error event:', {
                errorCode: code,
                errorMessage: el.error?.message || '(no message)',
                networkState: el.networkState,
                readyState: el.readyState,
                currentSrc: el.currentSrc,
                currentAudioPath: currentAudio.path,
                hasFallback: !!playableFallbacks[currentAudio.path],
            });
            // Codes 3 (decode) and 4 (not supported) → try FFmpeg conversion
            if ((code === 3 || code === 4) && !playableFallbacks[currentAudio.path]) {
                void convertAndRetry('audio', currentAudio);
            } else {
                setPlaybackError(describeMediaError('Audio', el, currentAudio));
                setIsAudioPlaying(false);
            }
        };

        el.addEventListener('timeupdate', onTime);
        el.addEventListener('loadedmetadata', onMeta);
        el.addEventListener('ended', onEnded);
        el.addEventListener('play', onPlay);
        el.addEventListener('pause', onPause);
        el.addEventListener('error', onError);
        return () => {
            el.removeEventListener('timeupdate', onTime);
            el.removeEventListener('loadedmetadata', onMeta);
            el.removeEventListener('ended', onEnded);
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('error', onError);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAudioIndex, isRepeat, isShuffle, audioPlaylist.length]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : audioVolume;
        }
    }, [audioVolume, isMuted]);

    // ── Audio controls ─────────────────────────────────────────────────────
    const playAudio = useCallback((index: number) => {
        if (index >= 0 && index < audioPlaylist.length) {
            setPlaybackError(null);
            setCurrentAudioIndex(index);
            setIsAudioPlaying(true);
        }
    }, [audioPlaylist.length]);

    const toggleAudioPlay = () => {
        const el = audioRef.current;
        if (!el || !audioSrc) return;
        if (isAudioPlaying) {
            el.pause();
        } else {
            el.play().catch(e => setPlaybackError(`Audio: ${e.message}`));
        }
    };

    const playNextAudio = useCallback(() => {
        if (audioPlaylist.length === 0) return;
        const next = isShuffle
            ? Math.floor(Math.random() * audioPlaylist.length)
            : (currentAudioIndex + 1) % audioPlaylist.length;
        playAudio(next);
    }, [audioPlaylist.length, currentAudioIndex, isShuffle, playAudio]);

    const playPrevAudio = () => {
        if (audioPlaylist.length === 0) return;
        playAudio(currentAudioIndex > 0 ? currentAudioIndex - 1 : audioPlaylist.length - 1);
    };

    const handleOpenFolder = async () => {
        try {
            const folderPath = await mediaApi.openFolderDialog();
            if (folderPath) {
                const files = await mediaApi.scanFolderForMedia(folderPath, 'audio');
                if (files.length > 0) {
                    setAudioPlaylist(files);
                    setCurrentAudioIndex(0);
                    setIsAudioPlaying(true);
                }
            }
        } catch (e) { termLog('error', 'handleOpenFolder failed:', errorMessage(e)); }
    };

    const handleOpenAudioFiles = async () => {
        try {
            const paths = await mediaApi.openMediaFileDialog('audio');
            if (paths.length > 0) {
                const newFiles = paths.map(createLocalMediaFile);
                setAudioPlaylist(prev => {
                    const merged = [...prev, ...newFiles];
                    return merged.filter((f, i, self) => i === self.findIndex(t => t.path === f.path));
                });
                if (currentAudioIndex === -1) {
                    setCurrentAudioIndex(0);
                    setIsAudioPlaying(true);
                }
            }
        } catch (e) { termLog('error', 'handleOpenAudioFiles failed:', errorMessage(e)); }
    };

    // ── Video: load new source ONLY when the source changes ───────────────
    // Do NOT put isVideoPlaying in deps — that would reload the video on every pause/play!
    useEffect(() => {
        const el = videoRef.current;
        if (!el || !videoSrc) return;
        termLog('info', 'Video loading useEffect fired:', {
            videoSrc,
            currentSrcBefore: el.currentSrc,
            networkStateBefore: el.networkState,
            readyStateBefore: el.readyState,
        });
        setPlaybackError(null);
        setVideoProgress(0);
        setVideoDuration(0);
        el.load();
        termLog('info', 'After el.load():', {
            currentSrc: el.currentSrc,
            networkState: el.networkState,
            readyState: el.readyState,
        });
        el.play().catch(e => {
            termLog('error', 'Video play() rejected:', e.message);
            setPlaybackError(`Video: ${e.message}`);
            setIsVideoPlaying(false);
        });
        setIsVideoPlaying(true);
    }, [videoSrc]);

    // ── Video: event listeners ─────────────────────────────────────────────
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;

        const onTime = () => setVideoProgress(el.currentTime);
        const onMeta = () => {
            termLog('info', 'Video loadedmetadata:', { duration: el.duration, videoWidth: el.videoWidth, videoHeight: el.videoHeight, currentSrc: el.currentSrc });
            setVideoDuration(el.duration);
        };
        const onCanPlay = () => {
            termLog('info', 'Video canplay fired:', { currentSrc: el.currentSrc, readyState: el.readyState });
        };
        const onEnded = () => {
            setIsVideoPlaying(false);
            // Auto-advance to next video
            if (currentVideoIndex < videoPlaylist.length - 1) {
                setCurrentVideoIndex(i => i + 1);
                setIsVideoPlaying(true);
            }
        };
        const onPlay = () => setIsVideoPlaying(true);
        const onPause = () => setIsVideoPlaying(false);
        const onError = () => {
            if (!currentVideo) return; // Ignore empty/unset source load errors
            const code = el.error?.code;
            termLog('error', 'Video error event:', {
                errorCode: code,
                errorMessage: el.error?.message || '(no message)',
                networkState: el.networkState,
                readyState: el.readyState,
                currentSrc: el.currentSrc,
                currentVideoPath: currentVideo.path,
                hasFallback: !!playableFallbacks[currentVideo.path],
            });
            if ((code === 3 || code === 4) && !playableFallbacks[currentVideo.path]) {
                void convertAndRetry('video', currentVideo);
            } else {
                setPlaybackError(describeMediaError('Video', el, currentVideo));
                setIsVideoPlaying(false);
            }
        };

        el.addEventListener('timeupdate', onTime);
        el.addEventListener('loadedmetadata', onMeta);
        el.addEventListener('canplay', onCanPlay);
        el.addEventListener('ended', onEnded);
        el.addEventListener('play', onPlay);
        el.addEventListener('pause', onPause);
        el.addEventListener('error', onError);
        return () => {
            el.removeEventListener('timeupdate', onTime);
            el.removeEventListener('loadedmetadata', onMeta);
            el.removeEventListener('canplay', onCanPlay);
            el.removeEventListener('ended', onEnded);
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('error', onError);
        };
    }, [currentVideoIndex, videoPlaylist.length]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = isVideoMuted ? 0 : videoVolume;
        }
    }, [videoVolume, isVideoMuted]);

    // ── Video controls ─────────────────────────────────────────────────────
    const toggleVideoPlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const el = videoRef.current;
        if (!el) return;
        if (isVideoPlaying) {
            el.pause();
        } else {
            el.play().catch(err => setPlaybackError(`Video: ${err.message}`));
        }
    };

    const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (videoRef.current) videoRef.current.currentTime = time;
        setVideoProgress(time);
    };

    const toggleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        videoRef.current?.requestFullscreen?.();
    };

    const handleMouseMove = () => {
        setShowVideoControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            if (isVideoPlaying) setShowVideoControls(false);
        }, 3000);
    };

    const handleOpenVideoFiles = async () => {
        try {
            const paths = await mediaApi.openMediaFileDialog('video');
            termLog('info', 'openVideoFiles returned paths:', paths);
            if (paths.length > 0) {
                const newFiles = paths.map(createLocalMediaFile);
                termLog('info', 'created LocalMediaFile entries:', newFiles);
                setVideoPlaylist(prev => {
                    const merged = [...prev, ...newFiles];
                    return merged.filter((f, i, self) => i === self.findIndex(t => t.path === f.path));
                });
                if (currentVideoIndex === -1) {
                    setCurrentVideoIndex(0);
                }
                setActiveTab('video');
            }
        } catch (e) { termLog('error', 'handleOpenVideoFiles error:', errorMessage(e)); }
    };

    const handleOpenVideoFolder = async () => {
        try {
            const folderPath = await mediaApi.openFolderDialog();
            termLog('info', 'openFolderDialog returned:', folderPath);
            if (folderPath) {
                const files = await mediaApi.scanFolderForMedia(folderPath, 'video');
                termLog('info', 'scanFolderForMedia returned files:', files);
                if (files.length > 0) {
                    setVideoPlaylist(files);
                    setCurrentVideoIndex(0);
                    setActiveTab('video');
                }
            }
        } catch (e) { termLog('error', 'handleOpenVideoFolder error:', errorMessage(e)); }
    };

    const playVideo = (index: number) => {
        if (index < 0 || index >= videoPlaylist.length) return;
        const file = videoPlaylist[index];
        setPlaybackError(null);
        setCurrentVideoIndex(index);

        // If the format is not natively supported AND we haven't converted it yet,
        // start conversion immediately so the converting overlay appears right away
        // rather than the browser's own blank loading spinner.
        const alreadyConverted = !!playableFallbacks[file.path];
        const alreadyConverting = !!preparingPlayback[file.path];
        if (!alreadyConverted && !alreadyConverting && !checkVideoCanPlay(file.path)) {
            termLog('info', 'Format not natively supported — starting proactive conversion', { path: file.path });
            void convertAndRetry('video', file);
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────
    const fmt = (t: number) => {
        if (!t || isNaN(t)) return '0:00';
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="spotify-container">

            {/* ── Sidebar ── */}
            <aside className="spotify-sidebar">
                <nav className="nav-group">
                    <button className={`nav-item ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
                        <MdQueueMusic size={24} /> <span>Music</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'video' ? 'active' : ''}`} onClick={() => setActiveTab('video')}>
                        <MdMovie size={24} /> <span>Videos</span>
                    </button>
                </nav>

                <div className="library-section">
                    <div className="library-header">
                        <MdLibraryMusic size={22} />
                        <span>{activeTab === 'audio' ? 'Audio Library' : 'Video Library'}</span>
                        <MdAdd className="add-icon" onClick={activeTab === 'audio' ? handleOpenAudioFiles : handleOpenVideoFiles} title="Add files" />
                    </div>

                    {activeTab === 'audio' ? (
                        <>
                            <div className="playlist-pill-container">
                                <button className="pill-btn" onClick={handleOpenFolder}><MdFolderOpen size={14}/> Folder</button>
                                <button className="pill-btn" onClick={handleOpenAudioFiles}><MdAdd size={14}/> Tracks</button>
                            </div>
                            <div className="sidebar-playlist">
                                {audioPlaylist.length === 0 && (
                                    <p className="empty-lib">No tracks yet.<br/>Add a folder or files.</p>
                                )}
                                {audioPlaylist.map((file, idx) => (
                                    <div
                                        key={file.path}
                                        className={`playlist-row ${currentAudioIndex === idx ? 'active' : ''}`}
                                        onClick={() => playAudio(idx)}
                                    >
                                        <div className="row-art">
                                            {currentAudioIndex === idx && isAudioPlaying
                                                ? <MdGraphicEq className="playing-anim" />
                                                : <MdAudiotrack />}
                                        </div>
                                        <div className="row-info">
                                            <span className="row-title">{file.name}</span>
                                            <span className="row-meta">{file.extension.toUpperCase()} · {fmt(trackDurations[file.path] ?? 0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="playlist-pill-container">
                                <button className="pill-btn" onClick={handleOpenVideoFolder}><MdFolderOpen size={14}/> Folder</button>
                                <button className="pill-btn" onClick={handleOpenVideoFiles}><MdAdd size={14}/> Files</button>
                            </div>
                            <div className="sidebar-playlist">
                                {videoPlaylist.length === 0 && (
                                    <p className="empty-lib">No videos yet.<br/>Add a folder or files.</p>
                                )}
                                {videoPlaylist.map((file, idx) => (
                                    <div
                                        key={file.path}
                                        className={`playlist-row ${currentVideoIndex === idx ? 'active' : ''}`}
                                        onClick={() => playVideo(idx)}
                                    >
                                        <div className="row-art"><MdMovie /></div>
                                        <div className="row-info">
                                            <span className="row-title">{file.name}</span>
                                            <span className="row-meta">{file.extension.toUpperCase()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </aside>

            {/* ── Main content ── */}
            <main className="spotify-main">
                <header className="main-header">
                    <div className="tab-switcher">
                        <button className={activeTab === 'audio' ? 'active' : ''} onClick={() => setActiveTab('audio')}>Music</button>
                        <button className={activeTab === 'video' ? 'active' : ''} onClick={() => setActiveTab('video')}>Video</button>
                    </div>
                </header>

                <div className="scroll-content">
                    {activeTab === 'audio' ? (
                        /* ── Audio tab ── */
                        <div className="music-hero">
                            <div className="hero-gradient" />
                            <div className="hero-content">
                                <div className={`hero-art ${isAudioPlaying ? 'pulse' : ''}`}>
                                    <MdQueueMusic size={80} />
                                </div>
                                <div className="hero-text">
                                    <span className="upper">PLAYLIST</span>
                                    <h1>Worship Flow Mix</h1>
                                    <p>{audioPlaylist.length} track{audioPlaylist.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>

                            {audioPlaylist.length === 0 ? (
                                <div className="empty-hero">
                                    <MdAudiotrack size={60} style={{ opacity: 0.2 }} />
                                    <h3>No audio loaded</h3>
                                    <p>Use "Add Folder" or "Add Tracks" in the sidebar to load music.</p>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button className="netflix-btn" onClick={handleOpenFolder}>Open Folder</button>
                                        <button className="netflix-btn" style={{ background: '#333', color: '#fff' }} onClick={handleOpenAudioFiles}>Add Tracks</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="tracks-list">
                                    <div className="list-header">
                                        <span>#</span>
                                        <span>Title</span>
                                        <span>Format</span>
                                        <span>Duration</span>
                                    </div>
                                    {audioPlaylist.map((file, idx) => (
                                        <div
                                            key={file.path}
                                            className={`track-item ${currentAudioIndex === idx ? 'active' : ''}`}
                                            onDoubleClick={() => playAudio(idx)}
                                            onClick={() => playAudio(idx)}
                                        >
                                            <span className="idx">
                                                {currentAudioIndex === idx && isAudioPlaying
                                                    ? <MdGraphicEq style={{ color: 'var(--spotify-green)' }} />
                                                    : idx + 1}
                                            </span>
                                            <div className="title-block">
                                                <span className="t-name">{file.name}</span>
                                                <span className="t-artist">Local File</span>
                                            </div>
                                            <span className="t-album">{file.extension.toUpperCase()}</span>
                                            <span className="t-duration">{fmt(trackDurations[file.path] ?? 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── Video tab ── */
                        <div className="video-hero">
                            {!currentVideo ? (
                                <div className="video-welcome">
                                    <MdMovie size={100} style={{ opacity: 0.2 }} />
                                    <h2>Ready for the Big Screen</h2>
                                    <p>Select a video file or folder to start playback.</p>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button className="netflix-btn" onClick={handleOpenVideoFolder}>Open Folder</button>
                                        <button className="netflix-btn" style={{ background: '#333', color: '#fff' }} onClick={handleOpenVideoFiles}>Browse Files</button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="netflix-player"
                                    onMouseMove={handleMouseMove}
                                    onClick={() => !preparingPlayback[currentVideo.path] && toggleVideoPlay()}
                                >
                                    {/* Converting overlay — shown while ffmpeg transcodes the file */}
                                    {preparingPlayback[currentVideo.path] ? (
                                        <div className="converting-overlay">
                                            <div className="converting-spinner" />
                                            <h3>Preparing Video…</h3>
                                            <p>
                                                <strong>{currentVideo.name}</strong>
                                            </p>
                                            <p className="converting-detail">
                                                {currentVideo.size_bytes > 0
                                                    ? `${(currentVideo.size_bytes / 1024 / 1024).toFixed(0)} MB — `
                                                    : ''}
                                                Converting to a browser-compatible format.
                                            </p>
                                            <p className="converting-hint">
                                                Large files can take several minutes.
                                                The video will play automatically when ready.
                                            </p>
                                        </div>
                                    ) : (
                                        <video
                                            ref={videoRef}
                                            src={videoSrc || undefined}
                                            preload="none"
                                            className="fullscreen-video"
                                        />
                                    )}

                                    <div className={`video-overlay ${showVideoControls ? 'visible' : ''}`}>
                                        <div className="overlay-top">
                                            <button className="back-btn" onClick={e => { e.stopPropagation(); setCurrentVideoIndex(-1); }}>
                                                ← Back
                                            </button>
                                            <h3>{currentVideo.name}</h3>
                                        </div>

                                        <div className="overlay-bottom" onClick={e => e.stopPropagation()}>
                                            <div className="video-seekbar-wrapper">
                                                <span className="time-info">{fmt(videoProgress)}</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={videoDuration || 100}
                                                    value={videoProgress}
                                                    onChange={handleVideoSeek}
                                                    className="video-seekbar"
                                                />
                                                <span className="time-info">{fmt(videoDuration)}</span>
                                            </div>

                                            <div className="video-controls-row">
                                                <div className="c-left">
                                                    <button onClick={e => { e.stopPropagation(); playVideo(Math.max(0, currentVideoIndex - 1)); }}>
                                                        <MdSkipPrevious size={32} />
                                                    </button>
                                                    <button onClick={e => toggleVideoPlay(e)}>
                                                        {isVideoPlaying ? <MdPause size={44} /> : <MdPlayArrow size={44} />}
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); playVideo(Math.min(videoPlaylist.length - 1, currentVideoIndex + 1)); }}>
                                                        <MdSkipNext size={32} />
                                                    </button>
                                                    <div className="vol-group" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => setIsVideoMuted(!isVideoMuted)}>
                                                            {isVideoMuted || videoVolume === 0 ? <MdVolumeOff size={26} /> : <MdVolumeUp size={26} />}
                                                        </button>
                                                        <input
                                                            type="range" min="0" max="1" step="0.01"
                                                            value={isVideoMuted ? 0 : videoVolume}
                                                            onChange={e => setVideoVolume(Number(e.target.value))}
                                                            className="vol-range"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="c-right">
                                                    <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                                        {currentVideoIndex + 1} / {videoPlaylist.length}
                                                    </span>
                                                    <button onClick={toggleFullscreen}><MdFullscreen size={32} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Persistent audio player bar ── */}
            <footer className="spotify-player-bar">
                <div className="now-playing-info">
                    {currentAudio ? (
                        <>
                            <div className="mini-art"><MdAudiotrack /></div>
                            <div className="mini-text">
                                <span className="m-title">{currentAudio.name}</span>
                                <span className="m-artist">{currentAudio.extension.toUpperCase()}</span>
                            </div>
                        </>
                    ) : (
                        <span className="no-track">No track selected</span>
                    )}
                </div>

                <div className="player-main-controls">
                    <div className="buttons-row">
                        <button className={`secondary-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)} title="Shuffle">
                            <MdShuffle size={20} />
                        </button>
                        <button className="main-btn" onClick={playPrevAudio} disabled={!currentAudio}>
                            <MdSkipPrevious size={28} />
                        </button>
                        <button className="play-pause-circle" onClick={toggleAudioPlay} disabled={!currentAudio}>
                            {isAudioPlaying ? <MdPause size={30} /> : <MdPlayArrow size={30} />}
                        </button>
                        <button className="main-btn" onClick={playNextAudio} disabled={!currentAudio}>
                            <MdSkipNext size={28} />
                        </button>
                        <button className={`secondary-btn ${isRepeat ? 'active' : ''}`} onClick={() => setIsRepeat(!isRepeat)} title="Repeat">
                            <MdRepeat size={20} />
                        </button>
                    </div>

                    <div className="progress-group">
                        <span className="p-time">{fmt(audioProgress)}</span>
                        <div className="bar-wrapper">
                            <input
                                type="range"
                                min="0"
                                max={audioDuration || 100}
                                value={audioProgress}
                                className="styled-range"
                                onChange={e => {
                                    const t = Number(e.target.value);
                                    setAudioProgress(t);
                                    if (audioRef.current) audioRef.current.currentTime = t;
                                }}
                            />
                        </div>
                        <span className="p-time">{fmt(audioDuration)}</span>
                    </div>
                </div>

                <div className="player-side-controls">
                    <MdPlaylistPlay size={24} title={`${audioPlaylist.length} tracks`} />
                    <div className="vol-group">
                        <button onClick={() => setIsMuted(!isMuted)}>
                            {isMuted || audioVolume === 0 ? <MdVolumeOff size={20} /> : <MdVolumeUp size={20} />}
                        </button>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            value={isMuted ? 0 : audioVolume}
                            onChange={e => setAudioVolume(Number(e.target.value))}
                            className="vol-range"
                        />
                    </div>
                </div>
            </footer>

            {/* Hidden audio element — no crossOrigin for local files */}
            <audio ref={audioRef} src={audioSrc} style={{ display: 'none' }} />

            {playbackError && (
                <div className="error-toast" onClick={() => setPlaybackError(null)}>
                    ⚠ {playbackError} <small style={{ opacity: 0.7 }}>(click to dismiss)</small>
                </div>
            )}
        </div>
    );
};

export default MediaPlayer;
