import React, { useCallback, useEffect, useState, useRef } from 'react';
import { presentationApi, PresentationInfo } from '../api/presentation';
import { timerApi } from '../api/timer';
import { songApi, Song, Slide, serviceApi, Service, activityApi, Activity } from '../api';
import { bibleApi, BibleVerse } from '../api/bible';
import { listen, emitTo } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { 
  MdMonitor, MdPlayArrow, MdStop, MdSkipNext, 
  MdSkipPrevious, MdVisibilityOff, MdDelete, 
  MdAdd, MdSearch, MdEdit, MdClose, 
  MdPalette, MdBook, MdLibraryMusic, MdImage, MdFolderOpen,
  MdEvent, MdSlideshow, MdTv,
  MdMovie, MdMusicNote, MdPublic, MdWallpaper, MdCreate, MdLandscape,
  MdCheckCircle, MdTextFields, MdFormatAlignLeft, MdFormatAlignCenter, MdFormatAlignRight,
  MdFormatBold, MdFormatItalic
} from 'react-icons/md';
import { FiRefreshCw, FiHeart } from 'react-icons/fi';
import ChurchBrandingModal from './ChurchBrandingModal';
import { churchSettingsApi, ChurchSettings } from '../api/churchSettings';
import { mediaApi } from '../api/media';
import BackgroundPicker from './BackgroundPicker';
import RichTextEditor from './RichTextEditor';
import './PresentationControl.css';

type SavedTextSlide = {
  id: string;
  title: string;
  content: string;
  savedAt: string;
};

const SAVED_SLIDES_KEY = 'worshipflow_saved_text_slides';
const FAVORITES_KEY = 'worshipflow_favorite_media_paths';

const PresentationControl: React.FC = () => {
  // Service & Schedule states
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Active Presentation states
  const [presentationInfo, setPresentationInfo] = useState<PresentationInfo | null>(null);
  const [slidesList, setSlidesList] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);

  
  // Library Explorer states
  const [activeTab, setActiveTab] = useState<'songs' | 'bible' | 'media' | 'announcements' | 'capture' | 'fonts'>('songs');
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>(churchSettingsApi.get());
  
  // Library - Songs states
  const [songsList, setSongsList] = useState<Song[]>([]);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [selectedLibrarySong, setSelectedLibrarySong] = useState<Song | null>(null);
  
  // Library - Bible states
  const [bibleBooks, setBibleBooks] = useState<[string, string, number][]>([]);
  const [selectedBibleBook, setSelectedBibleBook] = useState<string>('');
  const [selectedBibleChapter, setSelectedBibleChapter] = useState<number>(1);
  const [bibleVerses, setBibleVerses] = useState<BibleVerse[]>([]);
  const [selectedBibleVerse, setSelectedBibleVerse] = useState<BibleVerse | null>(null);
  const [selectedVerseNumber, setSelectedVerseNumber] = useState<number>(1);
  const [bibleSearchQuery, setBibleSearchQuery] = useState('');
  const [bibleSearchResults, setBibleSearchResults] = useState<BibleVerse[]>([]);
  const [isBibleSearching, setIsBibleSearching] = useState(false);
  const [activeBibleVersion, setActiveBibleVersion] = useState('KJV');
  const [bibleVersions, setBibleVersions] = useState<string[]>([]);
  const [bibleContext, setBibleContext] = useState<{ book: string; chapter: number; verse: number } | null>(null);
  const bibleContextRef = useRef(bibleContext);
  const bibleVersesRef = useRef(bibleVerses);
  const isAdvancingRef = useRef(false);
  const monitorContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bibleContextRef.current = bibleContext; }, [bibleContext]);
  useEffect(() => { bibleVersesRef.current = bibleVerses; }, [bibleVerses]);
  
  // Library - Media states
  const [mediaFiles, setMediaFiles] = useState<Array<{ name: string; path: string; isVideo: boolean; mediaType: 'image' | 'video' | 'audio' }>>([]);
  const [selectedMediaFile, setSelectedMediaFile] = useState<{ name: string; path: string; isVideo: boolean; mediaType: 'image' | 'video' | 'audio' } | null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'image' | 'video' | 'audio'>('image');

  // Window Capture states
  const [capturableWindows, setCapturableWindows] = useState<Array<{ id: string; title: string; app_name: string }>>([]);
  const [captureState, setCaptureState] = useState<{ is_capturing: boolean; window_title: string; current_frame_path: string | null }>({ is_capturing: false, window_title: '', current_frame_path: null });
  const [selectedWindowId, setSelectedWindowId] = useState<string>('');
  const [selectedWindowTitle, setSelectedWindowTitle] = useState<string>('');
  const [isListingWindows, setIsListingWindows] = useState(false);
  const [bibleWebUrl, setBibleWebUrl] = useState('https://www.biblegateway.com');

  // Background picker & Branding modal states
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const [showBgPicker, setShowBgPicker] = useState<boolean>(false);
  const [showBrandingModal, setShowBrandingModal] = useState<boolean>(false);

  // Custom slide Modal states
  const [showTextModal, setShowTextModal] = useState(false);
  const [customTextTitle, setCustomTextTitle] = useState('');
  const [customTextContent, setCustomTextContent] = useState('');
  const [editingSavedSlideId, setEditingSavedSlideId] = useState<string | null>(null);
  const [savedTextSlides, setSavedTextSlides] = useState<SavedTextSlide[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_SLIDES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<SavedTextSlide | null>(null);
  const [favoritePaths, setFavoritePaths] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    loadServices();
    loadSongs();
    loadBibleBooks();
    loadBibleVersions();
    loadPresentationState();
    loadSlidesList();
    setupKeyboardShortcuts();
    
    // Subscribe to church settings changes
    const unsubBranding = churchSettingsApi.subscribe(settings => {
      setChurchSettings(settings);
    });
    
    // Setup Presentation state event listeners from Tauri backend
    const setupPresentationListeners = async () => {
      const unlistenSlide = await listen<PresentationInfo>('slide-changed', (event) => {
        setPresentationInfo(event.payload);
        loadSlidesList();
      });
      
      const unlistenBlank = await listen<PresentationInfo>('blank-toggled', (event) => {
        setPresentationInfo(event.payload);
      });
      
      const unlistenStarted = await listen<PresentationInfo>('presentation-started', (event) => {
        setPresentationInfo(event.payload);
        loadSlidesList();
      });
      
      const unlistenStopped = await listen<PresentationInfo>('presentation-stopped', (event) => {
        setPresentationInfo(event.payload);
      });

      return () => {
        unlistenSlide();
        unlistenBlank();
        unlistenStarted();
        unlistenStopped();
      };
    };

    let presentationUnlisten: any;

    setupPresentationListeners().then(un => presentationUnlisten = un);
    
    return () => {
      unsubBranding();
      if (presentationUnlisten) presentationUnlisten();
    };
  }, []);

  // Update activities & load timer when a service is selected
  useEffect(() => {
    if (selectedService) {
      loadActivities(selectedService.id);
      timerApi.loadService(selectedService.id).catch(err =>
        console.error('Failed to load service into timer:', err)
      );
    } else {
      setActivities([]);
    }
  }, [selectedService]);

  // Keep local background state in sync with current slide background
  useEffect(() => {
    if (presentationInfo?.current_slide) {
      const slideBg = presentationInfo.current_slide.background_path;
      if (slideBg !== undefined) {
        setCurrentBackground(slideBg);
      }
    }
  }, [presentationInfo?.current_slide]);

  // Load verses when bible book or chapter changes
  useEffect(() => {
    if (selectedBibleBook && selectedBibleChapter) {
      loadBibleVerses(selectedBibleBook, selectedBibleChapter);
    }
  }, [selectedBibleBook, selectedBibleChapter, activeBibleVersion]);

  // Sync verse number dropdown when selected verse changes
  useEffect(() => {
    if (selectedBibleVerse) {
      setSelectedVerseNumber(selectedBibleVerse.verse);
    }
  }, [selectedBibleVerse]);

  // Reload Bible versions when the Bible tab becomes active
  useEffect(() => {
    if (activeTab === 'bible') {
      loadBibleVersions();
    }
  }, [activeTab]);

  // Reload books when version changes (fixes Twi book names)
  useEffect(() => {
    loadBibleBooks();
  }, [activeBibleVersion]);

  // Load functions
  const loadServices = async () => {
    try {
      const data = await serviceApi.getAll();
      setServices(data);
      if (data.length > 0 && !selectedService) {
        setSelectedService(data[0]);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const loadActivities = async (serviceId: string) => {
    try {
      const data = await activityApi.getByService(serviceId);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load service activities:', error);
    }
  };

  const loadSongs = async () => {
    try {
      const data = await songApi.getAll();
      setSongsList(data);
    } catch (error) {
      console.error('Failed to load songs:', error);
    }
  };

  const loadBibleBooks = async () => {
    try {
      await bibleApi.initializeBooks();
      const books = await bibleApi.getBooks(activeBibleVersion);
      setBibleBooks(books);
      if (books.length > 0 && !selectedBibleBook) {
        setSelectedBibleBook(books[0][0]);
      } else if (books.length > 0) {
        const bookExists = books.some(b => b[0] === selectedBibleBook);
        if (!bookExists) {
          setSelectedBibleBook(books[0][0]);
          setSelectedBibleChapter(1);
          setSelectedBibleVerse(null);
        }
      }
    } catch (error) {
      console.error('Failed to load bible books:', error);
    }
  };

  const loadBibleVersions = async () => {
    try {
      const versions = await bibleApi.getVersions();
      setBibleVersions(versions);
      const active = await bibleApi.getActiveVersion();
      if (active) setActiveBibleVersion(active);
    } catch (error) {
      console.error('Failed to load bible versions:', error);
    }
  };

  const loadBibleVerses = async (book: string, chapter: number) => {
    try {
      const verses = await bibleApi.getChapterVerses(book, chapter, activeBibleVersion);
      setBibleVerses(verses);
      if (verses.length > 0) {
        setSelectedBibleVerse(verses[0]);
      }
    } catch (error) {
      console.error('Failed to load verses:', error);
    }
  };

  const loadPresentationState = async () => {
    try {
      const state = await presentationApi.getState();
      setPresentationInfo(state);
    } catch (error) {
      console.error('Failed to load presentation state:', error);
    }
  };

  const loadSlidesList = async () => {
    try {
      const list = await presentationApi.getSlides();
      setSlidesList(list || []);
    } catch (error) {
      console.error('Failed to load presentation slides list:', error);
    }
  };

  // Keyboard Navigation
  const setupKeyboardShortcuts = () => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          await handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          await handlePrevious();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          await handleNextVerse();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          await handlePrevious();
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          await handleToggleBlank();
          break;
        case 'Escape':
          e.preventDefault();
          await handleStop();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  };

  // Presentation Handlers
  const handleStart = async () => {
    try {
      const info = await presentationApi.startPresentation();
      setPresentationInfo(info);
      await openOutputWindow();
    } catch (error) {
      console.error('Failed to start presentation:', error);
    }
  };

  const handleStop = async () => {
    try {
      const info = await presentationApi.stopPresentation();
      setPresentationInfo(info);
    } catch (error) {
      console.error('Failed to stop presentation:', error);
    }
  };

  const handleNext = async () => {
    try {
      const info = await presentationApi.nextSlide();
      setPresentationInfo(info);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      const info = await presentationApi.previousSlide();
      setPresentationInfo(info);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleToggleBlank = async () => {
    try {
      const info = await presentationApi.toggleBlank();
      setPresentationInfo(info);
    } catch (error) {
      console.error('Failed to toggle blank:', error);
    }
  };

  const handleClearSlides = async () => {
    if (window.confirm('Clear all slides from presentation?')) {
      try {
        const info = await presentationApi.clearPresentation();
        setPresentationInfo(info);
        setSlidesList([]);
      } catch (error) {
        console.error('Failed to clear presentation:', error);
      }
    }
  };

  const handleRemoveSlide = async (index: number) => {
    try {
      const info = await presentationApi.removeSlide(index);
      setPresentationInfo(info);
      await loadSlidesList();
    } catch (error) {
      console.error('Failed to remove slide:', error);
    }
  };

  const openOutputWindow = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_presentation_window');
    } catch (error) {
      console.error('[Presentation] Failed to open output window:', error);
      alert(`Could not open output window: ${error}`);
    }
  };

  // Set slide background
  const handleSetBackground = async (bg: string | null) => {
    try {
      const info = await presentationApi.setBackground(bg);
      setPresentationInfo(info);
      setCurrentBackground(bg);
    } catch (error) {
      console.error('Failed to set background:', error);
    }
  };

  // Schedule Activity Execution
  const handleActivityClick = async (activity: Activity) => {
    try {
      setLoading(true);
      const notes = activity.notes || '';
      
      // Notes patterns: song_id: ..., bible_ref: ..., media_path: ...
      const songMatch = notes.match(/song_id:\s*([a-zA-Z0-9-]+)/i);
      const bibleMatch = notes.match(/bible_ref:\s*([^|\n]+)\|([^|\n]+)\|([^|\n]+)\|?([\s\S]*)/i);
      const mediaMatch = notes.match(/media_path:\s*([^\n]+)/i);

      if (songMatch) {
        const info = await presentationApi.loadSong(songMatch[1]);
        setPresentationInfo(info);
      } else if (bibleMatch) {
        const [_, book, chStr, versesStr, textStr] = bibleMatch;
        const info = await presentationApi.addBibleSlide(book, parseInt(chStr), versesStr, textStr);
        setPresentationInfo(info);
      } else if (mediaMatch) {
        const info = await presentationApi.setBackground(mediaMatch[1]);
        setPresentationInfo(info);
      } else {
        // Match by title in songs database
        const matchedSong = songsList.find(s => s.title.toLowerCase() === activity.name.toLowerCase());
        if (matchedSong) {
          const info = await presentationApi.loadSong(matchedSong.id);
          setPresentationInfo(info);
        } else {
          // Custom activity - present name with optional notes
          const info = await presentationApi.addTextSlide(activity.name, activity.notes || '');
          setPresentationInfo(info);
        }
      }
      await loadSlidesList();
      
      // Start the timer for this activity
      timerApi.setActivity(activity.id).catch(() => {});
      timerApi.startActivity().catch(err =>
        console.error('Failed to start activity timer:', err)
      );
    } catch (err) {
      console.error('Failed to present activity:', err);
    } finally {
      setLoading(false);
    }
  };

  // Library - Add to Schedule Timeline
  const addSongToSchedule = async (song: Song) => {
    if (!selectedService) return alert('Select a service schedule first!');
    try {
      await activityApi.create({
        service_id: selectedService.id,
        name: song.title,
        duration_minutes: 10,
        notes: `song_id: ${song.id}`
      });
      loadActivities(selectedService.id);
    } catch (err) {
      console.error('Failed to add song to schedule:', err);
    }
  };

  const addBibleVerseToSchedule = async (verse: BibleVerse) => {
    if (!selectedService) return alert('Select a service schedule first!');
    try {
      await activityApi.create({
        service_id: selectedService.id,
        name: `Scripture: ${verse.book} ${verse.chapter}:${verse.verse}`,
        duration_minutes: 5,
        notes: `bible_ref: ${verse.book}|${verse.chapter}|${verse.verse}|${verse.text}`
      });
      loadActivities(selectedService.id);
    } catch (err) {
      console.error('Failed to add bible verse to schedule:', err);
    }
  };

  const addMediaToSchedule = async (media: { name: string; path: string; mediaType?: string }) => {
    if (!selectedService) return alert('Select a service schedule first!');
    try {
      await activityApi.create({
        service_id: selectedService.id,
        name: `Media: ${media.name}`,
        duration_minutes: 5,
        notes: `media_path: ${media.path}`
      });
      loadActivities(selectedService.id);
    } catch (err) {
      console.error('Failed to add media to schedule:', err);
    }
  };

  const addAnnouncementToSchedule = async (slide: SavedTextSlide) => {
    if (!selectedService) return alert('Select a service schedule first!');
    try {
      await activityApi.create({
        service_id: selectedService.id,
        name: slide.title || 'Announcement',
        duration_minutes: 5,
        notes: `announcement: ${slide.content}`
      });
      loadActivities(selectedService.id);
    } catch (err) {
      console.error('Failed to add announcement to schedule:', err);
    }
  };

  // Bible search handler
  const handleBibleSearch = async () => {
    if (!bibleSearchQuery.trim()) return;
    setIsBibleSearching(true);
    try {
      const results = await bibleApi.search(bibleSearchQuery, activeBibleVersion);
      setBibleSearchResults(results.slice(0, 40));
    } catch (err) {
      console.error('Bible search failed:', err);
    } finally {
      setIsBibleSearching(false);
    }
  };

  // Media Loader
  const handleLoadMedia = async (type: 'image' | 'video' | 'audio') => {
    try {
      const paths = await mediaApi.openMediaFileDialog(type);
      if (paths && paths.length > 0) {
        const newFiles = paths.map(p => ({
          name: p.split(/[/\\]/).pop() || type,
          path: p,
          isVideo: type === 'video',
          mediaType: type,
        }));
        setMediaFiles(prev => [...prev, ...newFiles]);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  // Present media directly to output
  const handlePresentMedia = async (file: { name: string; path: string; mediaType: 'image' | 'video' | 'audio' }) => {
    try {
      setLoading(true);
      if (file.mediaType === 'image') {
        await presentationApi.presentImage(file.path, file.name);
      } else if (file.mediaType === 'video') {
        const convertedPath = await mediaApi.prepareForPlayback(file.path, 'video');
        await presentationApi.presentVideo(convertedPath || file.path);
      } else if (file.mediaType === 'audio') {
        const convertedPath = await mediaApi.prepareForPlayback(file.path, 'audio');
        await presentationApi.presentAudio(convertedPath || file.path);
      }
      await loadSlidesList();
    } catch (err) {
      console.error('Failed to present media:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save Image to disk
  const handleSaveImage = async (file: { name: string; path: string }) => {
    try {
      const bytes = await invoke<number[]>('read_file_bytes', { path: file.path });
      if (!bytes || bytes.length === 0) {
        alert('Failed to read image file.');
        return;
      }
      await invoke('save_file', { filename: file.name, data: Uint8Array.from(bytes) });
    } catch (err: any) {
      console.error('Failed to save image:', err);
      alert(`Save failed: ${err}`);
    }
  };

  // Toggle favorite media
  const toggleFavorite = (path: string) => {
    setFavoritePaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  // Window Capture handlers
  const handleListWindows = async () => {
    setIsListingWindows(true);
    try {
      const windows = await presentationApi.listCapturableWindows();
      setCapturableWindows(windows);
      if (windows.length > 0) {
        setSelectedWindowId(windows[0].id);
        setSelectedWindowTitle(windows[0].title);
      }
    } catch (err: any) {
      console.error('Failed to list windows:', err);
      alert(`Window listing failed: ${err}`);
    } finally {
      setIsListingWindows(false);
    }
  };

  const handleStartCapture = async () => {
    if (!selectedWindowId) return alert('Select a window first');
    try {
      const msg = await presentationApi.startWindowCapture(selectedWindowId, selectedWindowTitle);
      alert(msg);
      const state = await presentationApi.getCaptureState();
      setCaptureState(state);
    } catch (err: any) {
      console.error('Failed to start capture:', err);
      alert(`Capture failed: ${err}`);
    }
  };

  const handleStopCapture = async () => {
    try {
      const state = await presentationApi.stopWindowCapture();
      setCaptureState(state);
    } catch (err: any) {
      console.error('Failed to stop capture:', err);
    }
  };

  const handlePresentCapture = async () => {
    try {
      setLoading(true);
      await presentationApi.presentWindowCapture();
      await loadSlidesList();
    } catch (err: any) {
      console.error('Failed to present capture:', err);
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresentBibleWeb = async () => {
    if (!bibleWebUrl.trim()) return alert('Enter a Bible website URL first');
    try {
      setLoading(true);
      await presentationApi.presentBibleWeb(bibleWebUrl);
      await loadSlidesList();
    } catch (err: any) {
      console.error('Failed to present Bible web:', err);
    } finally {
      setLoading(false);
    }
  };

  // Announcement Save Slide
  const handleSaveTextSlide = () => {
    if (!customTextContent.trim()) return;
    if (editingSavedSlideId) {
      const updated = savedTextSlides.map(s =>
        s.id === editingSavedSlideId
          ? { ...s, title: customTextTitle.trim(), content: customTextContent.trim() }
          : s
      );
      setSavedTextSlides(updated);
      localStorage.setItem(SAVED_SLIDES_KEY, JSON.stringify(updated));
    } else {
      const newSlide: SavedTextSlide = {
        id: `txt-${Date.now()}`,
        title: customTextTitle.trim(),
        content: customTextContent.trim(),
        savedAt: new Date().toISOString(),
      };
      const updated = [newSlide, ...savedTextSlides];
      setSavedTextSlides(updated);
      localStorage.setItem(SAVED_SLIDES_KEY, JSON.stringify(updated));
    }
    setShowTextModal(false);
    setCustomTextTitle('');
    setCustomTextContent('');
    setEditingSavedSlideId(null);
  };

  // Go live immediately with library item
  const presentSongImmediately = async (song: Song) => {
    try {
      setLoading(true);
      const info = await presentationApi.loadSong(song.id);
      setPresentationInfo(info);
      await loadSlidesList();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const presentBibleImmediately = async (verse: BibleVerse) => {
    try {
      setLoading(true);
      const info = await presentationApi.addBibleSlide(verse.book, verse.chapter, verse.verse.toString(), verse.text);
      setPresentationInfo(info);
      setBibleContext({ book: verse.book, chapter: verse.chapter, verse: verse.verse });
      await loadSlidesList();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextVerse = async () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    try {
      const ctx = bibleContextRef.current;
      const verses = bibleVersesRef.current;
      if (!ctx) return;
      const nextVerse = verses.find(v => v.verse === ctx.verse + 1);
      if (!nextVerse) {
        const books = await bibleApi.getBooks(activeBibleVersion);
        const currentBook = books.find(b => b[0] === ctx.book);
        if (currentBook && ctx.chapter < currentBook[2]) {
          const nextChapter = ctx.chapter + 1;
          const chVerses = await bibleApi.getChapterVerses(ctx.book, nextChapter, activeBibleVersion);
          if (chVerses.length > 0) {
            await presentBibleImmediately(chVerses[0]);
          }
        }
        return;
      }
      await presentBibleImmediately(nextVerse);
    } finally {
      isAdvancingRef.current = false;
    }
  };

  const presentAnnouncementImmediately = async (slide: SavedTextSlide) => {
    try {
      setLoading(true);
      const info = await presentationApi.addTextSlide(slide.title || null, slide.content);
      setPresentationInfo(info);
      await loadSlidesList();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Font selection
  const FONT_OPTIONS = [
    { name: 'Inter', value: "'Inter', 'Segoe UI', Tahoma, Geneva, sans-serif" },
    { name: 'Arial', value: "Arial, Helvetica, 'Segoe UI', Tahoma, Geneva, sans-serif" },
    { name: 'Georgia', value: "Georgia, 'Times New Roman', 'Segoe UI', Tahoma, Geneva, serif" },
    { name: 'Times New Roman', value: "'Times New Roman', Times, 'Segoe UI', Tahoma, Geneva, serif" },
    { name: 'Verdana', value: "Verdana, Geneva, 'Segoe UI', Tahoma, sans-serif" },
    { name: 'Tahoma', value: "Tahoma, Geneva, 'Segoe UI', sans-serif" },
    { name: 'Trebuchet MS', value: "'Trebuchet MS', 'Lucida Grande', 'Segoe UI', Tahoma, Geneva, sans-serif" },
    { name: 'Courier New', value: "'Courier New', Courier, 'Segoe UI', Tahoma, Geneva, monospace" },
    { name: 'Comic Sans MS', value: "'Comic Sans MS', cursive, 'Segoe UI', Tahoma, Geneva, sans-serif" },
    { name: 'Impact', value: "Impact, Haettenschweiler, 'Segoe UI', Tahoma, Geneva, sans-serif" },
    { name: 'Palatino Linotype', value: "'Palatino Linotype', 'Book Antiqua', Palatino, 'Segoe UI', Tahoma, Geneva, serif" },
    { name: 'Lucida Console', value: "'Lucida Console', Monaco, 'Segoe UI', Tahoma, Geneva, monospace" },
    { name: 'Segoe UI', value: "'Segoe UI', Tahoma, Geneva, sans-serif" },
  ];

  const handleFontSelect = (fontValue: string) => {
    const updated = churchSettingsApi.save({ selectedFont: fontValue });
    setChurchSettings(updated);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const updated = churchSettingsApi.save({ fontSize: val });
    setChurchSettings(updated);
  };

  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    const updated = churchSettingsApi.save({ textAlign: align });
    setChurchSettings(updated);
  };

  const handleBoldToggle = () => {
    const updated = churchSettingsApi.save({ fontBold: !churchSettings.fontBold });
    setChurchSettings(updated);
  };

  const handleItalicToggle = () => {
    const updated = churchSettingsApi.save({ fontItalic: !churchSettings.fontItalic });
    setChurchSettings(updated);
  };

  const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'ogv', 'mpeg', 'mpg'];
  const isVideoFile = (path: string): boolean => {
    const ext = path.split('.').pop()?.toLowerCase();
    return ext ? VIDEO_EXTS.includes(ext) : false;
  };

  const getCssBackgroundStyle = (bg: string | null): React.CSSProperties => {
    if (!bg) return {};
    return {
      backgroundImage: `url(${mediaApi.getAssetUrl(bg)})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  };

  const bgIsVideo = currentBackground ? isVideoFile(currentBackground) : false;

  const handleCloseWindow = useCallback(async () => {
    try {
      await presentationApi.closeWindow();
    } catch (err) {
      console.error('[PresentationControl] Failed to close window:', err);
    }
  }, []);

  const handleMonitorScroll = useCallback(() => {
    const el = monitorContentRef.current;
    if (el) {
      const scrollFraction = el.scrollHeight > el.clientHeight
        ? el.scrollTop / (el.scrollHeight - el.clientHeight)
        : 0;
      emitTo('output', 'presentation-scroll', { scrollFraction }).catch(console.error);
    }
  }, []);

  const bgLayer = currentBackground && (
    <div className="live-bg-container">
      {bgIsVideo ? (
        <video
          className="live-bg-video"
          src={mediaApi.getAssetUrl(currentBackground)}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div 
          className="live-bg-layer is-image"
          style={getCssBackgroundStyle(currentBackground)}
        />
      )}
      <div className="live-bg-overlay" />
    </div>
  );

  return (
    <div className="live-console-view">
      {/* Console Top Toolbar */}
      <header className="console-navbar">
        <div className="navbar-actions">
          {/* Group 1: Output Window & Settings */}
          <div className="navbar-group">
            <button className="navbar-btn" onClick={openOutputWindow} title="Output Window">
              <MdMonitor size={18} /> <span className="btn-text">Output Window</span>
            </button>
            <button className="navbar-btn" onClick={() => setShowBrandingModal(true)} title="Branding & Styles">
              <MdPalette size={18} /> <span className="btn-text">Branding & Styles</span>
            </button>
            <button className="navbar-btn" onClick={() => setShowBgPicker(true)} title="Background Picker">
              <MdWallpaper size={18} /> <span className="btn-text">Background</span>
            </button>
          </div>

          <div className="navbar-divider" />

          {/* Group 2: Screen Cover Overlays */}
          <div className="navbar-group">
            <button 
              className={`navbar-btn action-black ${presentationInfo?.is_blank ? 'active' : ''}`}
              onClick={handleToggleBlank}
              title="Black Screen Cover (B)"
            >
              <MdVisibilityOff size={18} /> <span className="btn-text">Black Screen</span>
            </button>

            <button 
              className="navbar-btn action-logo"
              onClick={() => {
                if (churchSettings.churchLogoPath) {
                  handleSetBackground(churchSettings.churchLogoPath);
                } else {
                  alert('Configure a logo path in Church Settings first!');
                }
              }}
              title="Project Church Logo Backdrop"
            >
              <MdLandscape size={18} /> <span className="btn-text">Logo Backdrop</span>
            </button>
          </div>

          <div className="navbar-divider" />

          {/* Group 3: Slide Deck Actions */}
          <div className="navbar-group">
            <button className="navbar-btn action-clear" onClick={handleClearSlides} title="Clear Slide Deck">
              <MdDelete size={18} /> <span className="btn-text">Clear Slides</span>
            </button>
          </div>

          <div className="navbar-divider" />

          {/* Group 4: Present/Live */}
          <div className="navbar-group">
            {presentationInfo?.is_live ? (
              <button className="navbar-btn btn-danger" onClick={handleStop} title="Stop Live Broadcast">
                <MdStop size={20} /> <span className="btn-text">Stop Live</span>
              </button>
            ) : (
              <button className="navbar-btn btn-primary" onClick={handleStart} title="Start Live Broadcast">
                <MdPlayArrow size={20} /> <span className="btn-text">Go Live</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Console Workspace */}
      <div className="console-main-layout">
        
        {/* Left Column: Service Timeline */}
        <aside className="schedule-panel glass-card">
          <div className="panel-title flex-between">
            <h3 className="panel-title-text">
              <MdEvent className="panel-icon" /> Service Schedule
            </h3>
          </div>
          <div className="service-selector-row">
            <select
              value={selectedService?.id || ''}
              onChange={(e) => {
                const s = services.find(srv => srv.id === e.target.value);
                if (s) setSelectedService(s);
              }}
              className="console-select"
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.title} ({s.date})</option>
              ))}
            </select>
          </div>

          <div className="activities-list scrollable">
            {activities.length === 0 ? (
              <div className="empty-panel-text">No activities scheduled. Add items from resources below.</div>
            ) : (
              activities.map((act, index) => (
                <div 
                  key={act.id} 
                  className="activity-item-card"
                  onClick={() => handleActivityClick(act)}
                >
                  <span className="activity-index">{index + 1}</span>
                  <div className="activity-details">
                    <h4>{act.name}</h4>
                    <p>{act.leader ? `Leader: ${act.leader}` : 'No leader'} • {act.duration_minutes}m</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Middle Column: Slide Grid */}
        <main className="slide-grid-panel glass-card">
          <div className="panel-title flex-between">
            <h3 className="panel-title-text">
              <MdSlideshow className="panel-icon" /> Active Presentation Slides
            </h3>
            {presentationInfo?.total_slides ? (
              <span className="slide-counter-badge">
                Slide {presentationInfo.current_index + 1} of {presentationInfo.total_slides}
              </span>
            ) : null}
          </div>

          <div className="slide-grid-container scrollable">
            {loading ? (
              <div className="spinner-container">
                <FiRefreshCw className="spinner" size={32} />
                <p>Loading slides...</p>
              </div>
            ) : slidesList.length === 0 ? (
              <div className="empty-panel-text">
                No active slides loaded.<br/>Select an item from the schedule or resources tab.
              </div>
            ) : (
              <div className="slides-layout-grid">
                {slidesList.map((slide, index) => {
                  const isActive = presentationInfo?.current_index === index;
                  const isMedia = slide.slide_type === 'image' || slide.slide_type === 'video' || slide.slide_type === 'audio';
                  return (
                    <div 
                      key={slide.id} 
                      className={`slide-grid-item ${isActive ? 'active' : ''} ${isMedia ? 'is-media' : ''}`}
                      onClick={() => presentationApi.gotoSlide(index)}
                    >
                      <div className="slide-item-header">
                        <span>Slide {index + 1}</span>
                        {slide.title && <span className="slide-item-tag">{slide.title}</span>}
                        {isMedia && (
                          <span className={`slide-media-badge ${slide.slide_type}`}>
                            {slide.slide_type === 'image' ? <MdImage size={14} /> : slide.slide_type === 'video' ? <MdMovie size={14} /> : <MdMusicNote size={14} />}
                          </span>
                        )}
                        <button
                          className="slide-remove-btn"
                          onClick={(e) => { e.stopPropagation(); handleRemoveSlide(index); }}
                          title="Remove slide"
                        >
                          <MdClose size={12} />
                        </button>
                      </div>
                      <div className="slide-item-content">
                        {isMedia ? (
                          <div className="media-slide-indicator">
                            <span className="media-type-label">
                              {slide.slide_type === 'image' ? 'Image' : slide.slide_type === 'video' ? 'Video' : 'Audio'}
                            </span>
                            <span className="media-file-name">{slide.title || slide.slide_type}</span>
                          </div>
                        ) : (
                          <div className="rich-text-render" dangerouslySetInnerHTML={{ __html: slide.content }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick controls bar below grid */}
          <div className="slide-grid-controls">
            <button 
              className="console-control-btn"
              onClick={handlePrevious}
              disabled={!presentationInfo?.total_slides || presentationInfo.current_index === 0}
            >
              <MdSkipPrevious size={20} /> Prev Slide
            </button>
            
            <button 
              className="console-control-btn"
              onClick={handleNext}
              disabled={!presentationInfo?.total_slides || presentationInfo.current_index >= (presentationInfo.total_slides - 1)}
            >
              Next Slide <MdSkipNext size={20} />
            </button>
          </div>
        </main>

        {/* Right Column: Live Output Monitor */}
        <aside className="monitor-panel glass-card">
          <div className="panel-title flex-between">
            <h3 className="panel-title-text">
              <MdTv className="panel-icon-live" /> Live Output Monitor
            </h3>
            <button className="monitor-close-btn" onClick={handleCloseWindow} title="Close Projector Window">
              ✕
            </button>
          </div>
          <div className="live-monitor-box" style={{ '--presentation-font': churchSettings.selectedFont, '--presentation-font-scale': churchSettings.fontSize, '--presentation-text-align': churchSettings.textAlign, ...(churchSettings.fontBold ? { '--presentation-font-weight': 'bold' } : {}), ...(churchSettings.fontItalic ? { '--presentation-font-style': 'italic' } : {}) } as React.CSSProperties}>
            {bgLayer}
            {presentationInfo?.is_blank ? (
              <div className="blank-cover">Black Screen Cover Active</div>
            ) : presentationInfo?.current_slide ? (
              <div className="monitor-slide-preview">
                {presentationInfo.current_slide.title && (
                  <div className="monitor-slide-title">{presentationInfo.current_slide.title}</div>
                )}
                <div className="monitor-slide-content rich-text-render" ref={monitorContentRef} onScroll={handleMonitorScroll} dangerouslySetInnerHTML={{ __html: presentationInfo.current_slide.content }} />
              </div>
            ) : (
              <div className="no-live-cover">Projector Screen Idle</div>
            )}
          </div>
          
          <div className="monitor-details">
            <div className="detail-row">
              <span>Projection Mode:</span>
              <strong className={presentationInfo?.is_live ? 'live-color' : 'idle-color'}>
                {presentationInfo?.is_live ? '● Live Broadcasting' : 'Idle'}
              </strong>
            </div>
            {currentBackground && (
              <div className="detail-row">
                <span>Background:</span>
                <strong>{currentBackground.split(/[/\\]/).pop()}</strong>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Bottom Row: Tabbed Resources Explorer */}
      <footer className="console-resources-explorer glass-card">
        <div className="explorer-tabs-bar">
          <button 
            className={`explorer-tab-btn ${activeTab === 'songs' ? 'active' : ''}`}
            onClick={() => setActiveTab('songs')}
          >
            <MdLibraryMusic size={18} /> Songs Database
          </button>
          <button 
            className={`explorer-tab-btn ${activeTab === 'bible' ? 'active' : ''}`}
            onClick={() => setActiveTab('bible')}
          >
            <MdBook size={18} /> Scriptures Browser
          </button>
          <button 
            className={`explorer-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <MdImage size={18} /> Media
          </button>
          <button 
            className={`explorer-tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <MdEdit size={18} /> Announcement Slides
          </button>
          <button 
            className={`explorer-tab-btn ${activeTab === 'fonts' ? 'active' : ''}`}
            onClick={() => setActiveTab('fonts')}
          >
            <MdTextFields size={18} /> Fonts
          </button>
          <button 
            className={`explorer-tab-btn ${activeTab === 'capture' ? 'active' : ''}`}
            onClick={() => setActiveTab('capture')}
          >
            <MdMonitor size={18} /> Window Capture
          </button>
        </div>

        <div className="explorer-tab-body">
          
          {/* TAB 1: Songs Database */}
          {activeTab === 'songs' && (
            <div className="explorer-dual-pane">
              <div className="pane-left flex-column">
                <div className="search-bar-row">
                  <MdSearch className="search-row-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Search song library..."
                    value={songSearchQuery}
                    onChange={(e) => {
                      setSongSearchQuery(e.target.value);
                      const q = e.target.value.toLowerCase();
                      if (q.trim()) {
                        songApi.search(q).then(setSongsList).catch(console.error);
                      } else {
                        loadSongs();
                      }
                    }}
                    className="console-input"
                  />
                </div>
                <div className="pane-items-list scrollable">
                  {songsList.map(song => (
                    <div 
                      key={song.id} 
                      className={`pane-item-row ${selectedLibrarySong?.id === song.id ? 'selected' : ''}`}
                      onClick={() => setSelectedLibrarySong(song)}
                    >
                      <div className="pane-item-info">
                        <strong>{song.title}</strong>
                        <span>{song.key ? `Key: ${song.key}` : 'No key'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pane-right scrollable">
                {selectedLibrarySong ? (
                  <div className="resource-preview-panel">
                    <div className="preview-header">
                      <h3>{selectedLibrarySong.title}</h3>
                      {selectedLibrarySong.key && <span className="key-tag">Key: {selectedLibrarySong.key}</span>}
                    </div>
                    <div className="lyrics-preview-body">
                      {selectedLibrarySong.lyrics}
                    </div>
                    <div className="preview-actions">
                      <button className="preview-action-btn primary" onClick={() => presentSongImmediately(selectedLibrarySong)}>
                        <MdPlayArrow size={16} /> Present Now
                      </button>
                      <button className="preview-action-btn" onClick={() => addSongToSchedule(selectedLibrarySong)}>
                        <MdAdd size={16} /> Add to Schedule
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-preview-panel">Select a song to preview</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Scriptures Browser */}
          {activeTab === 'bible' && (
            <div className="explorer-dual-pane">
              <div className="pane-left flex-column">
                <div className="search-bar-row gap-sm">
                  <select 
                    value={activeBibleVersion} 
                    onChange={async (e) => {
                      const v = e.target.value;
                      setActiveBibleVersion(v);
                      await bibleApi.setActiveVersion(v);
                    }}
                    className="console-select select-compact"
                  >
                    {bibleVersions.map(ver => (
                      <option key={ver} value={ver}>{ver}</option>
                    ))}
                  </select>
                  <select
                    value={selectedBibleBook}
                    onChange={(e) => {
                      setSelectedBibleBook(e.target.value);
                      setSelectedBibleChapter(1);
                    }}
                    className="console-select select-compact"
                  >
                    {bibleBooks.map(book => (
                      <option key={book[0]} value={book[0]}>{book[0]}</option>
                    ))}
                  </select>
                  <select
                    value={selectedBibleChapter}
                    onChange={(e) => setSelectedBibleChapter(parseInt(e.target.value))}
                    className="console-select select-compact"
                  >
                    {Array.from({ length: bibleBooks.find(b => b[0] === selectedBibleBook)?.[2] || 1 }).map((_, i) => (
                      <option key={i+1} value={i+1}>Ch {i+1}</option>
                    ))}
                  </select>
                  <select
                    value={selectedVerseNumber}
                    onChange={(e) => {
                      const vn = parseInt(e.target.value);
                      setSelectedVerseNumber(vn);
                      const found = bibleVerses.find(bv => bv.verse === vn);
                      if (found) setSelectedBibleVerse(found);
                    }}
                    className="console-select select-compact"
                    disabled={bibleVerses.length === 0}
                  >
                    {bibleVerses.map(v => (
                      <option key={v.verse} value={v.verse}>v. {v.verse}</option>
                    ))}
                  </select>
                </div>
                
                <div className="bible-search-row">
                  <input
                    type="text"
                    placeholder="Search scripture text..."
                    value={bibleSearchQuery}
                    onChange={e => setBibleSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleBibleSearch()}
                    className="console-input"
                  />
                  <button className="btn-bible-search" onClick={handleBibleSearch}>
                    Search
                  </button>
                         <div className="pane-items-list scrollable">
                  {isBibleSearching ? (
                    <div className="spinner-container" style={{ padding: '2rem 0' }}>
                      <FiRefreshCw className="spinner" size={24} />
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>Searching Bible...</p>
                    </div>
                  ) : bibleSearchQuery.trim() && bibleSearchResults.length > 0 ? (
                    bibleSearchResults.map(v => (
                      <div 
                        key={v.id} 
                        className={`pane-item-row ${selectedBibleVerse?.id === v.id ? 'selected' : ''}`}
                        onClick={() => setSelectedBibleVerse(v)}
                      >
                        <div className="pane-item-info">
                          <strong>{v.book} {v.chapter}:{v.verse}</strong>
                          <span className="text-truncate">{v.text}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    bibleVerses.map(v => (
                      <div 
                        key={v.id} 
                        className={`pane-item-row ${selectedBibleVerse?.id === v.id ? 'selected' : ''}`}
                        onClick={() => setSelectedBibleVerse(v)}
                      >
                        <div className="pane-item-info">
                          <strong>Verse {v.verse}</strong>
                          <span className="text-truncate">{v.text}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>          </div>
              </div>
              <div className="pane-right scrollable">
                {selectedBibleVerse ? (
                  <div className="resource-preview-panel">
                    <div className="preview-header">
                      <h3>{selectedBibleVerse.book} {selectedBibleVerse.chapter}:{selectedBibleVerse.verse}</h3>
                      <span className="key-tag">{selectedBibleVerse.version}</span>
                    </div>
                    <div className="lyrics-preview-body text-large">
                      "{selectedBibleVerse.text}"
                    </div>
                    <div className="preview-actions">
                      <button className="preview-action-btn primary" onClick={() => presentBibleImmediately(selectedBibleVerse)}>
                        <MdPlayArrow size={16} /> Present Now
                      </button>
                      <button className="preview-action-btn" onClick={() => addBibleVerseToSchedule(selectedBibleVerse)}>
                        <MdAdd size={16} /> Add to Schedule
                      </button>
                    </div>
                    <div className="bible-shortcut-hint">
                      <strong>Pro tip:</strong> After presenting a verse, press <kbd>N</kbd> for next verse. Press <kbd>P</kbd> to go back to the previous slide.
                    </div>
                  </div>
                ) : (
                  <div className="empty-preview-panel">Select a verse to preview</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Background & Presentation Media */}
          {activeTab === 'media' && (
            <div className="explorer-dual-pane">
              <div className="pane-left flex-column">
                <div className="media-type-filter-row">
                  <button
                    className={`media-type-btn ${mediaTypeFilter === 'image' ? 'active' : ''}`}
                    onClick={() => setMediaTypeFilter('image')}
                  >
                    <MdImage size={14} /> Images
                  </button>
                  <button
                    className={`media-type-btn ${mediaTypeFilter === 'video' ? 'active' : ''}`}
                    onClick={() => setMediaTypeFilter('video')}
                  >
                    <MdMovie size={14} /> Videos
                  </button>
                  <button
                    className={`media-type-btn ${mediaTypeFilter === 'audio' ? 'active' : ''}`}
                    onClick={() => setMediaTypeFilter('audio')}
                  >
                    <MdMusicNote size={14} /> Audio
                  </button>
                </div>
                <div className="media-actions-row">
                  <button className="console-btn-block" onClick={() => handleLoadMedia(mediaTypeFilter)}>
                    <MdFolderOpen size={16} /> Load {mediaTypeFilter === 'image' ? 'Image' : mediaTypeFilter === 'video' ? 'Video' : 'Audio'} Files
                  </button>
                </div>
                <div className="pane-items-list scrollable">
                  {mediaFiles.filter(f => f.mediaType === mediaTypeFilter && favoritePaths.has(f.path)).length > 0 && (
                    <>
                      <div className="media-section-divider">
                        <FiHeart size={12} /> Favorites
                      </div>
                      {mediaFiles.filter(f => f.mediaType === mediaTypeFilter && favoritePaths.has(f.path)).map((m, idx) => (
                        <div 
                          key={`fav-${idx}`} 
                          className={`pane-item-row ${selectedMediaFile?.path === m.path ? 'selected' : ''}`}
                          onClick={() => setSelectedMediaFile(m)}
                        >
                          <div className="pane-item-info">
                            <strong>{m.name}</strong>
                            <span>★ Favorite {m.mediaType}</span>
                          </div>
                        </div>
                      ))}
                      <div className="media-section-divider">All {mediaTypeFilter === 'image' ? 'Images' : mediaTypeFilter === 'video' ? 'Videos' : 'Audio'}</div>
                    </>
                  )}
                  {mediaFiles.filter(f => f.mediaType === mediaTypeFilter).length > 0 ? (
                    mediaFiles.filter(f => f.mediaType === mediaTypeFilter).map((m, idx) => (
                      <div 
                        key={idx} 
                        className={`pane-item-row ${selectedMediaFile?.path === m.path ? 'selected' : ''}`}
                        onClick={() => setSelectedMediaFile(m)}
                      >
                        <div className="pane-item-info">
                          <strong>{m.name}</strong>
                          <span>{favoritePaths.has(m.path) ? '★ Favorite' : 'Uploaded ' + m.mediaType}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-panel-text">No {mediaTypeFilter} files loaded. Click above to browse.</div>
                  )}
                </div>
              </div>
              <div className="pane-right scrollable">
                {selectedMediaFile ? (
                  <div className="resource-preview-panel">
                    <div className="preview-header">
                      <h3>{selectedMediaFile.name}</h3>
                    </div>
                    
                    <div className="media-preview-box">
                      {selectedMediaFile.mediaType === 'video' ? (
                        <video src={mediaApi.getAssetUrl(selectedMediaFile.path)} className="media-video-preview" controls />
                      ) : selectedMediaFile.mediaType === 'audio' ? (
                        <div className="media-audio-preview-box">
                          <span className="audio-preview-icon"><MdMusicNote size={48} /></span>
                          <audio src={mediaApi.getAssetUrl(selectedMediaFile.path)} controls className="media-audio-preview" />
                        </div>
                      ) : (
                        <img 
                          src={mediaApi.getAssetUrl(selectedMediaFile.path)} 
                          alt="Media Preview" 
                          className="media-image-large"
                        />
                      )}
                    </div>

                    <div className="preview-actions">
                      {selectedMediaFile.mediaType === 'image' && (
                        <button className="preview-action-btn primary" onClick={() => handlePresentMedia(selectedMediaFile)}>
                          <MdPlayArrow size={16} /> Present Now
                        </button>
                      )}
                      {selectedMediaFile.mediaType === 'video' && (
                        <button className="preview-action-btn primary" onClick={() => handlePresentMedia(selectedMediaFile)}>
                          <MdPlayArrow size={16} /> Play Video
                        </button>
                      )}
                      {selectedMediaFile.mediaType === 'audio' && (
                        <button className="preview-action-btn primary" onClick={() => handlePresentMedia(selectedMediaFile)}>
                          <MdPlayArrow size={16} /> Play Audio
                        </button>
                      )}
                      <button className="preview-action-btn" onClick={() => handleSetBackground(selectedMediaFile.path)}>
                        Set Background
                      </button>
                      <button className="preview-action-btn" onClick={() => addMediaToSchedule(selectedMediaFile)}>
                        <MdAdd size={16} /> Add to Schedule
                      </button>
                      {selectedMediaFile.mediaType === 'image' && (
                        <button className="preview-action-btn" onClick={() => handleSaveImage(selectedMediaFile)}>
                          Save Image
                        </button>
                      )}
                      <button
                        className={`preview-action-btn ${favoritePaths.has(selectedMediaFile.path) ? 'btn-fav-active' : ''}`}
                        onClick={() => toggleFavorite(selectedMediaFile.path)}
                      >
                        <FiHeart size={14} fill={favoritePaths.has(selectedMediaFile.path) ? 'currentColor' : 'none'} /> {favoritePaths.has(selectedMediaFile.path) ? 'Favorited' : 'Favorite'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-preview-panel">Select a media item to preview</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Fonts */}
          {activeTab === 'fonts' && (
              <div className="fonts-tab-container">
              <div className="fonts-tab-header">
                <h4><MdTextFields size={18} /> Presentation Font</h4>
                <p>Choose a font for the presentation output. The selected font will be applied to all text slides, song lyrics, and scripture verses on the projector screen.</p>
              </div>

              <div className="font-controls-row">
                <div className="font-size-control">
                  <label>Font Size</label>
                  <div className="font-size-slider-row">
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={churchSettings.fontSize}
                      onChange={handleFontSizeChange}
                      className="font-size-slider"
                    />
                    <span className="font-size-value">{Math.round(churchSettings.fontSize * 100)}%</span>
                  </div>
                </div>

                <div className="text-align-control">
                  <label>Alignment</label>
                  <div className="text-align-buttons">
                    <button
                      className={`align-btn ${churchSettings.textAlign === 'left' ? 'active' : ''}`}
                      onClick={() => handleTextAlignChange('left')}
                      title="Align Left"
                    >
                      <MdFormatAlignLeft size={18} />
                    </button>
                    <button
                      className={`align-btn ${churchSettings.textAlign === 'center' ? 'active' : ''}`}
                      onClick={() => handleTextAlignChange('center')}
                      title="Align Center"
                    >
                      <MdFormatAlignCenter size={18} />
                    </button>
                    <button
                      className={`align-btn ${churchSettings.textAlign === 'right' ? 'active' : ''}`}
                      onClick={() => handleTextAlignChange('right')}
                      title="Align Right"
                    >
                      <MdFormatAlignRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="font-style-control">
                  <label>Style</label>
                  <div className="font-style-buttons">
                    <button
                      className={`style-btn ${churchSettings.fontBold ? 'active' : ''}`}
                      onClick={handleBoldToggle}
                      title="Toggle Bold"
                    >
                      <MdFormatBold size={18} />
                    </button>
                    <button
                      className={`style-btn ${churchSettings.fontItalic ? 'active' : ''}`}
                      onClick={handleItalicToggle}
                      title="Toggle Italic"
                    >
                      <MdFormatItalic size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="fonts-list">
                {FONT_OPTIONS.map(font => (
                  <div
                    key={font.value}
                    className={`font-option-row ${churchSettings.selectedFont === font.value ? 'selected' : ''}`}
                    onClick={() => handleFontSelect(font.value)}
                  >
                    <div className="font-option-preview" style={{ fontFamily: font.value }}>
                      <span className="font-option-name">{font.name}</span>
                      <span className="font-option-sample">The quick brown fox jumps over the lazy dog</span>
                    </div>
                    {churchSettings.selectedFont === font.value && (
                      <MdCheckCircle className="font-check-icon" size={20} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: Window Capture & Bible Web */}
          {activeTab === 'capture' && (
            <div className="capture-tab-container">
              <div className="capture-section">
                <h4 className="capture-header-text">
                  <MdMonitor size={18} /> External Window Capture
                </h4>
                <p className="capture-description">Capture an external application window (Bible app, PDF reader, etc.) and display it on the presentation screen.</p>
                <p className="capture-note">Requires: <code>wmctrl</code> + <code>import</code> (ImageMagick), <code>maim</code>, <code>grim</code>, or <code>scrot</code>.</p>
                
                <div className="capture-controls-row">
                  <button className="console-btn-block" onClick={handleListWindows} disabled={isListingWindows}>
                    {isListingWindows ? 'Scanning...' : 'List Available Windows'}
                  </button>
                </div>

                {capturableWindows.length > 0 && (
                  <div className="capture-window-list scrollable">
                    {capturableWindows.map(win => (
                      <div
                        key={win.id}
                        className={`pane-item-row ${selectedWindowId === win.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedWindowId(win.id);
                          setSelectedWindowTitle(win.title);
                        }}
                      >
                        <div className="pane-item-info">
                          <strong>{win.title}</strong>
                          <span>{win.app_name} — ID: {win.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {capturableWindows.length === 0 && !isListingWindows && (
                  <div className="capture-empty-state">
                    <p>Click "List Available Windows" to detect open application windows.</p>
                    <p className="capture-hint">Ensure <code>wmctrl</code> is installed for best results.</p>
                  </div>
                )}

                <div className="capture-action-row">
                  <button
                    className="preview-action-btn primary"
                    onClick={handleStartCapture}
                    disabled={!selectedWindowId || captureState.is_capturing}
                  >
                    <MdPlayArrow size={16} /> Start Capture
                  </button>
                  <button
                    className="preview-action-btn"
                    onClick={handleStopCapture}
                    disabled={!captureState.is_capturing}
                  >
                    <MdStop size={16} /> Stop Capture
                  </button>
                  <button
                    className="preview-action-btn primary"
                    onClick={handlePresentCapture}
                    disabled={!captureState.is_capturing}
                  >
                    <MdPlayArrow size={16} /> Present to Screen
                  </button>
                </div>

                {captureState.is_capturing && (
                  <div className="capture-status">
                    <span className="live-dot" /> Capturing: <strong>{captureState.window_title}</strong>
                  </div>
                )}
              </div>

              <div className="capture-divider" />

              <div className="capture-section">
                <h4 className="capture-header-text">
                  <MdPublic size={18} /> Web Bible Presentation
                </h4>
                <p className="capture-description">Display an online Bible website (BibleGateway, Bible.com, etc.) on the presentation screen.</p>
                
                <div className="bible-web-input-row">
                  <input
                    type="text"
                    className="console-input"
                    value={bibleWebUrl}
                    onChange={e => setBibleWebUrl(e.target.value)}
                    placeholder="https://www.biblegateway.com"
                  />
                  <button className="preview-action-btn primary" onClick={handlePresentBibleWeb}>
                    <MdPlayArrow size={16} /> Present
                  </button>
                </div>

                <div className="bible-web-quick-links">
                  <span>Quick links:</span>
                  <button className="quick-link-btn" onClick={() => setBibleWebUrl('https://www.biblegateway.com')}>BibleGateway</button>
                  <button className="quick-link-btn" onClick={() => setBibleWebUrl('https://www.bible.com')}>Bible.com</button>
                  <button className="quick-link-btn" onClick={() => setBibleWebUrl('https://www.blueletterbible.org')}>BlueLetterBible</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Custom announcements */}
          {activeTab === 'announcements' && (
            <div className="explorer-dual-pane">
              <div className="pane-left flex-column">
                <div className="media-actions-row">
                  <button className="console-btn-block" onClick={() => {
                    setCustomTextTitle('');
                    setCustomTextContent('');
                    setEditingSavedSlideId(null);
                    setShowTextModal(true);
                  }}>
                    <MdCreate size={16} /> Create Custom Text Slide
                  </button>
                </div>
                <div className="pane-items-list scrollable">
                  {savedTextSlides.length === 0 ? (
                    <div className="empty-panel-text">No custom slides saved. Click the button to create.</div>
                  ) : (
                    savedTextSlides.map(slide => (
                      <div 
                        key={slide.id} 
                        className={`pane-item-row ${selectedAnnouncement?.id === slide.id ? 'selected' : ''}`}
                        onClick={() => setSelectedAnnouncement(slide)}
                      >
                        <div className="pane-item-info">
                          <strong>{slide.title || 'Untitled Slide'}</strong>
                          <span className="text-truncate">{slide.content}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="pane-right scrollable">
                {selectedAnnouncement ? (
                  <div className="resource-preview-panel">
                    <div className="preview-header">
                      <h3>{selectedAnnouncement.title || 'Custom Slide'}</h3>
                    </div>
                    <div className="lyrics-preview-body">
                      {selectedAnnouncement.content}
                    </div>
                    <div className="preview-actions">
                      <button className="preview-action-btn primary" onClick={() => presentAnnouncementImmediately(selectedAnnouncement)}>
                        <MdPlayArrow size={16} /> Present Now
                      </button>
                      <button className="preview-action-btn" onClick={() => addAnnouncementToSchedule(selectedAnnouncement)}>
                        <MdAdd size={16} /> Add to Schedule
                      </button>
                      <button className="preview-action-btn" onClick={() => {
                        setCustomTextTitle(selectedAnnouncement.title);
                        setCustomTextContent(selectedAnnouncement.content);
                        setEditingSavedSlideId(selectedAnnouncement.id);
                        setShowTextModal(true);
                      }}>
                        <MdEdit size={16} /> Edit
                      </button>
                      <button className="preview-action-btn btn-danger-outline" onClick={() => {
                        const updated = savedTextSlides.filter(s => s.id !== selectedAnnouncement.id);
                        setSavedTextSlides(updated);
                        localStorage.setItem(SAVED_SLIDES_KEY, JSON.stringify(updated));
                        setSelectedAnnouncement(null);
                      }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-preview-panel">Select a custom slide to preview</div>
                )}
              </div>
            </div>
          )}

        </div>
      </footer>

      {/* Modals */}
      {showBgPicker && (
        <BackgroundPicker
          currentBackground={currentBackground}
          onApply={handleSetBackground}
          onClose={() => setShowBgPicker(false)}
        />
      )}

      {showBrandingModal && (
        <ChurchBrandingModal onClose={() => setShowBrandingModal(false)} />
      )}

      {showTextModal && (
        <div className="text-slide-modal-overlay" onClick={() => setShowTextModal(false)}>
          <div className="text-slide-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="text-slide-modal-header">
              <div className="text-slide-modal-title">
                <MdEdit size={22} />
                <span>{editingSavedSlideId ? 'Edit Saved Slide' : 'New Custom Slide'}</span>
              </div>
              <button className="text-slide-close-btn" onClick={() => setShowTextModal(false)}>
                <MdClose size={20} />
              </button>
            </div>

            <div className="text-slide-modal-body">
              <label className="text-slide-label">Title (optional)</label>
              <input
                type="text"
                className="text-slide-input"
                placeholder="e.g. Announcements"
                value={customTextTitle}
                onChange={(e) => setCustomTextTitle(e.target.value)}
              />

              <label className="text-slide-label">Slide Content</label>
              <RichTextEditor
                value={customTextContent}
                onChange={setCustomTextContent}
                placeholder="Type slide text here..."
              />
            </div>

            <div className="text-slide-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTextModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveTextSlide} disabled={!customTextContent.trim()}>
                Save Announcement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PresentationControl;
