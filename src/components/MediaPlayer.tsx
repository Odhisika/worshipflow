import React, { useState, useRef, useEffect } from 'react';
import { mediaApi, LocalMediaFile } from '../api/media';
import {
    MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious,
    MdVolumeUp, MdVolumeOff, MdShuffle, MdRepeat, MdFullscreen,
    MdAudiotrack, MdMovie, MdGraphicEq, MdQueueMusic,
    MdPlaylistPlay, MdHome, MdExplore, MdLibraryMusic,
    MdAdd
} from 'react-icons/md';
import './MediaPlayer.css';

type Tab = 'audio' | 'video';

const MediaPlayer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('audio');

    // Audio State
    const [audioPlaylist, setAudioPlaylist] = useState<LocalMediaFile[]>([]);
    const [currentAudioIndex, setCurrentAudioIndex] = useState(-1);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [audioVolume, setAudioVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);

    // Video State
    const [currentVideo, setCurrentVideo] = useState<LocalMediaFile | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [showVideoControls, setShowVideoControls] = useState(true);

    const [playbackError, setPlaybackError] = useState<string | null>(null);

    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsTimeoutRef = useRef<any>(null);

    // --- Audio Handlers ---
    const handleOpenFolder = async () => {
        try {
            const folderPath = await mediaApi.openFolderDialog();
            if (folderPath) {
                const files = await mediaApi.scanFolderForMedia(folderPath, 'audio');
                if (files.length > 0) {
                   setAudioPlaylist(files);
                   setCurrentAudioIndex(0);
                }
            }
        } catch (error) {
            console.error("Failed to open folder:", error);
        }
    };

    const handleOpenAudioFiles = async () => {
        try {
            const paths = await mediaApi.openMediaFileDialog('audio');
            if (paths.length > 0) {
                const newFiles: LocalMediaFile[] = paths.map(path => {
                    const name = path.split(/[/\\]/).pop()?.split('.')[0] || 'Unknown';
                    const ext = path.split('.').pop() || '';
                    return { name, path, extension: ext, size_bytes: 0 };
                });

                setAudioPlaylist(prev => {
                    const merged = [...prev, ...newFiles];
                    const unique = merged.filter((file, index, self) =>
                        index === self.findIndex((t) => t.path === file.path)
                    );
                    return unique;
                });

                if (currentAudioIndex === -1 && newFiles.length > 0) {
                    setCurrentAudioIndex(0);
                }
            }
        } catch (error) {
            console.error("Failed to open audio files:", error);
        }
    };

    const playAudio = (index: number) => {
        if (index >= 0 && index < audioPlaylist.length) {
            setPlaybackError(null);
            setCurrentAudioIndex(index);
            setIsAudioPlaying(true);
        }
    };

    const toggleAudioPlay = () => {
        if (!audioRef.current) return;
        if (isAudioPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => {
               setPlaybackError(`Playback failed: ${e.message}`);
            });
        }
        setIsAudioPlaying(!isAudioPlaying);
    };

    const playNextAudio = () => {
        if (audioPlaylist.length === 0) return;
        if (isShuffle) {
            const nextIdx = Math.floor(Math.random() * audioPlaylist.length);
            playAudio(nextIdx);
        } else {
            playAudio((currentAudioIndex + 1) % audioPlaylist.length);
        }
    };

    const playPrevAudio = () => {
        if (audioPlaylist.length === 0) return;
        if (currentAudioIndex > 0) {
            playAudio(currentAudioIndex - 1);
        } else {
            playAudio(audioPlaylist.length - 1);
        }
    };

    const currentAudio = currentAudioIndex >= 0 ? audioPlaylist[currentAudioIndex] : null;
    const audioSrc = currentAudio ? mediaApi.getAssetUrl(currentAudio.path) : '';

    // --- Audio Effects & Listeners ---
    useEffect(() => {
        if (audioRef.current && audioSrc) {
            console.log(`[Audio] Source: ${audioSrc}, Playing: ${isAudioPlaying}`);
            audioRef.current.load(); // Explicitly load the new source
            
            if (isAudioPlaying) {
                audioRef.current.play().catch(e => {
                   console.error("[Audio] Play failed:", e);
                   setPlaybackError(`Playback failed: ${e.message}`);
                });
            }
        }
    }, [currentAudioIndex, audioSrc]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setAudioProgress(audio.currentTime);
        const updateDuration = () => setAudioDuration(audio.duration);
        const handleEnded = () => {
            if (isRepeat) {
                audio.currentTime = 0;
                audio.play().catch(console.error);
            } else {
                playNextAudio();
            }
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [currentAudioIndex, isRepeat, audioPlaylist.length, isShuffle]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : audioVolume;
        }
    }, [audioVolume, isMuted]);

    // --- Video Handlers ---
    const handleOpenVideo = async () => {
        try {
            const paths = await mediaApi.openMediaFileDialog('video');
            if (paths.length > 0) {
                const path = paths[0];
                const name = path.split(/[/\\]/).pop()?.split('.')[0] || 'Unknown';
                const ext = path.split('.').pop() || '';

                setCurrentVideo({ name, path, extension: ext, size_bytes: 0 });
                setActiveTab('video');
                setIsVideoPlaying(true);
            }
        } catch (error) {
            console.error("Failed to open video file:", error);
        }
    };

    const toggleVideoPlay = () => {
        if (!videoRef.current) return;
        if (isVideoPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsVideoPlaying(!isVideoPlaying);
    };

    const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setVideoProgress(time);
        }
    };

    const handleVideoProgress = () => {
        if (videoRef.current) {
            setVideoProgress(videoRef.current.currentTime);
        }
    };

    const handleVideoLoaded = () => {
        if (videoRef.current) {
            setVideoDuration(videoRef.current.duration);
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            }
        }
    };

    const handleMouseMove = () => {
        setShowVideoControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isVideoPlaying) {
                setShowVideoControls(false);
            }
        }, 3000);
    };

    const videoSrc = currentVideo ? mediaApi.getAssetUrl(currentVideo.path) : '';

    // Video Playback Effect
    useEffect(() => {
        if (videoRef.current && videoSrc) {
            console.log(`[Video] Source: ${videoSrc}, Playing: ${isVideoPlaying}`);
            videoRef.current.load(); // Explicitly load the new source
            
            if (isVideoPlaying) {
                videoRef.current.play().catch(e => {
                    console.error("[Video] Play failed:", e);
                    setPlaybackError(`Video playback failed: ${e.message}`);
                });
            }
        }
    }, [videoSrc, isVideoPlaying]);

    // Error monitoring
    useEffect(() => {
        const audio = audioRef.current;
        const video = videoRef.current;
        
        const handlePlaybackError = (e: any) => {
            const target = e.target;
            const error = target.error;
            console.error(`[Media] Playback error on ${target.tagName}:`, error);
            
            let message = "Playback failed";
            if (error) {
                switch (error.code) {
                    case 1: message = "Aborted"; break;
                    case 2: message = "Network error"; break;
                    case 3: message = "Decoding failed (Check codecs)"; break;
                    case 4: message = "Source not supported or file not found"; break;
                }
            }
            
            setPlaybackError(`${target.tagName === 'AUDIO' ? 'Audio' : 'Video'}: ${message} (${error?.message || 'Unknown'}) - Source: ${target.src}`);
        };

        if (audio) audio.addEventListener('error', handlePlaybackError);
        if (video) video.addEventListener('error', handlePlaybackError);
        
        return () => {
            if (audio) audio.removeEventListener('error', handlePlaybackError);
            if (video) video.removeEventListener('error', handlePlaybackError);
        };
    }, [audioSrc, videoSrc]);

    // Helpers
    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="spotify-container">
            {/* Sidebar like Spotify */}
            <aside className="spotify-sidebar">
                <nav className="nav-group">
                    <button className={`nav-item ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
                        <MdHome size={24} /> <span>Home</span>
                    </button>
                    <button className="nav-item">
                        <MdExplore size={24} /> <span>Browse</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'video' ? 'active' : ''}`} onClick={() => setActiveTab('video')}>
                        <MdMovie size={24} /> <span>Videos</span>
                    </button>
                </nav>

                <div className="library-section">
                    <div className="library-header">
                        <MdLibraryMusic size={24} /> <span>Your Library</span>
                        <MdAdd className="add-icon" />
                    </div>
                    
                    <div className="playlist-pill-container">
                       <button className="pill-btn" onClick={handleOpenFolder}>Add Folder</button>
                       <button className="pill-btn" onClick={handleOpenAudioFiles}>Add Tracks</button>
                    </div>

                    <div className="sidebar-playlist">
                        {audioPlaylist.map((file, idx) => (
                            <div 
                                key={file.path} 
                                className={`playlist-row ${currentAudioIndex === idx ? 'active' : ''}`}
                                onClick={() => playAudio(idx)}
                            >
                                <div className="row-art">
                                    {currentAudioIndex === idx && isAudioPlaying ? (
                                        <MdGraphicEq className="playing-anim" />
                                    ) : (
                                        <MdAudiotrack />
                                    )}
                                </div>
                                <div className="row-info">
                                    <span className="row-title">{file.name}</span>
                                    <span className="row-meta">Track • {file.extension.toUpperCase()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="spotify-main">
                <header className="main-header" style={{ opacity: activeTab === 'video' && currentVideo ? 0 : 1 }}>
                   <div className="tab-switcher">
                       <button className={activeTab === 'audio' ? 'active' : ''} onClick={() => setActiveTab('audio')}>Music</button>
                       <button className={activeTab === 'video' ? 'active' : ''} onClick={() => setActiveTab('video')}>Video</button>
                   </div>
                </header>

                <div className="scroll-content">
                    {activeTab === 'audio' ? (
                        <div className="music-hero">
                            <div className="hero-gradient"></div>
                            <div className="hero-content">
                                <div className={`hero-art ${isAudioPlaying ? 'pulse' : ''}`}>
                                    <MdQueueMusic size={80} />
                                </div>
                                <div className="hero-text">
                                    <span className="upper">PLAYLIST</span>
                                    <h1>Worship Flow Mix</h1>
                                    <p>{audioPlaylist.length} tracks • {formatTime(audioPlaylist.reduce((acc) => acc + 180, 0))} duration</p>
                                </div>
                            </div>
                            
                            <div className="tracks-list">
                                <div className="list-header">
                                    <span>#</span>
                                    <span>Title</span>
                                    <span>Album</span>
                                    <span>Added</span>
                                    <span>Time</span>
                                </div>
                                {audioPlaylist.map((file, idx) => (
                                    <div 
                                        key={file.path} 
                                        className={`track-item ${currentAudioIndex === idx ? 'active' : ''}`}
                                        onDoubleClick={() => playAudio(idx)}
                                    >
                                        <span className="idx">{idx + 1}</span>
                                        <div className="title-block">
                                            <span className="t-name">{file.name}</span>
                                            <span className="t-artist">Local File</span>
                                        </div>
                                        <span className="t-album">Worship Library</span>
                                        <span className="t-date">Recently</span>
                                        <span className="t-duration">3:00</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="video-hero">
                            {!currentVideo ? (
                                <div className="video-welcome">
                                    <MdMovie size={100} style={{ opacity: 0.2 }} />
                                    <h2>Ready for the Big Screen</h2>
                                    <p>Select a video to start your cinematic spiritual experience.</p>
                                    <button className="netflix-btn" onClick={handleOpenVideo}>Browse Files</button>
                                </div>
                            ) : (
                                <div 
                                    className="netflix-player" 
                                    onMouseMove={handleMouseMove}
                                    onClick={toggleVideoPlay}
                                >
                                    <video 
                                        ref={videoRef}
                                        src={videoSrc}
                                        onTimeUpdate={handleVideoProgress}
                                        onLoadedMetadata={handleVideoLoaded}
                                        onEnded={() => setIsVideoPlaying(false)}
                                        className="fullscreen-video"
                                        crossOrigin="anonymous"
                                    />
                                    
                                    <div className={`video-overlay ${showVideoControls ? 'visible' : ''}`}>
                                        <div className="overlay-top">
                                            <button className="back-btn" onClick={() => setCurrentVideo(null)}>
                                                <MdSkipPrevious /> Back
                                            </button>
                                            <h3>{currentVideo.name}</h3>
                                        </div>

                                        <div className="overlay-bottom" onClick={(e) => e.stopPropagation()}>
                                            <div className="video-seekbar-wrapper">
                                                <input 
                                                    type="range"
                                                    min="0"
                                                    max={videoDuration || 100}
                                                    value={videoProgress}
                                                    onChange={handleVideoSeek}
                                                    className="video-seekbar"
                                                />
                                                <div className="time-info">
                                                    {formatTime(videoProgress)} / {formatTime(videoDuration)}
                                                </div>
                                            </div>

                                            <div className="video-controls-row">
                                                <div className="c-left">
                                                    <button onClick={toggleVideoPlay}>
                                                        {isVideoPlaying ? <MdPause size={40} /> : <MdPlayArrow size={40} />}
                                                    </button>
                                                    <button><MdSkipNext size={32} /></button>
                                                    <button onClick={() => setIsMuted(!isMuted)}>
                                                        {isMuted ? <MdVolumeOff size={32} /> : <MdVolumeUp size={32} />}
                                                    </button>
                                                </div>
                                                <div className="c-right">
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

            {/* Persistent Audio Bar (Spotify style) */}
            <footer className="spotify-player-bar">
                <div className="now-playing-info">
                    {currentAudio ? (
                        <>
                            <div className="mini-art">
                                <MdAudiotrack />
                            </div>
                            <div className="mini-text">
                                <span className="m-title">{currentAudio.name}</span>
                                <span className="m-artist">Loaded Media</span>
                            </div>
                        </>
                    ) : (
                        <span className="no-track">No track selected</span>
                    )}
                </div>

                <div className="player-main-controls">
                    <div className="buttons-row">
                        <button className={`secondary-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)}>
                            <MdShuffle size={20} />
                        </button>
                        <button className="main-btn" onClick={playPrevAudio}>
                            <MdSkipPrevious size={28} />
                        </button>
                        <button className="play-pause-circle" onClick={toggleAudioPlay}>
                            {isAudioPlaying ? <MdPause size={30} /> : <MdPlayArrow size={30} />}
                        </button>
                        <button className="main-btn" onClick={playNextAudio}>
                            <MdSkipNext size={28} />
                        </button>
                        <button className={`secondary-btn ${isRepeat ? 'active' : ''}`} onClick={() => setIsRepeat(!isRepeat)}>
                            <MdRepeat size={20} />
                        </button>
                    </div>
                    
                    <div className="progress-group">
                        <span className="p-time">{formatTime(audioProgress)}</span>
                        <div className="bar-wrapper">
                           <input 
                                type="range"
                                min="0"
                                max={audioDuration || 100}
                                value={audioProgress}
                                className="styled-range"
                                onChange={(e) => {
                                    const time = Number(e.target.value);
                                    setAudioProgress(time);
                                    if (audioRef.current) audioRef.current.currentTime = time;
                                }}
                           />
                        </div>
                        <span className="p-time">{formatTime(audioDuration)}</span>
                    </div>
                </div>

                <div className="player-side-controls">
                    <MdPlaylistPlay size={24} />
                    <MdQueueMusic size={24} />
                    <div className="vol-group">
                        <button onClick={() => setIsMuted(!isMuted)}>
                           {isMuted || audioVolume === 0 ? <MdVolumeOff size={20} /> : <MdVolumeUp size={20} />}
                        </button>
                        <input 
                            type="range"
                            min="0" max="1" step="0.01"
                            value={isMuted ? 0 : audioVolume}
                            onChange={(e) => setAudioVolume(Number(e.target.value))}
                            className="vol-range"
                        />
                    </div>
                </div>
            </footer>

            <audio ref={audioRef} src={audioSrc} style={{ display: 'none' }} crossOrigin="anonymous" />

            {playbackError && (
                <div className="error-toast" onClick={() => setPlaybackError(null)}>
                    {playbackError}
                </div>
            )}
        </div>
    );
};

export default MediaPlayer;
