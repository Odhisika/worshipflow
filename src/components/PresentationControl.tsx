import React, { useEffect, useState } from 'react';
import { presentationApi, PresentationInfo } from '../api/presentation';
import { songApi, Song, Slide, serviceApi, Service, activityApi } from '../api';
import { bibleApi } from '../api/bible';
import { timerApi, TimerInfo } from '../api/timer';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/window';
import { MdMonitor, MdPlayArrow, MdPause, MdStop, MdSkipNext, MdSkipPrevious, MdVisibility, MdVisibilityOff, MdDelete, MdAdd, MdSearch, MdMic, MdTimer, MdImage, MdEdit, MdClose, MdPalette } from 'react-icons/md';
import { FiRefreshCw } from 'react-icons/fi';
import BackgroundPicker, { BUILTIN_THEMES } from './BackgroundPicker';
import ChurchBrandingModal from './ChurchBrandingModal';
import { mediaApi } from '../api/media';
import './PresentationControl.css';

type SearchResult = {
  type: 'song' | 'verse' | 'chapter' | 'activity';
  id: string;
  title: string;
  data: any;
};

type ChapterSlide = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

type SavedTextSlide = {
  id: string;
  title: string;
  content: string;
  savedAt: string;
};

const SAVED_SLIDES_KEY = 'worshipflow_saved_text_slides';

const PresentationControl: React.FC = () => {
  const [presentationInfo, setPresentationInfo] = useState<PresentationInfo | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [bibleBooks, setBibleBooks] = useState<[string, string, number][]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedContentResult, setSelectedContentResult] = useState<string>('');

  // Chapter slides panel (populated when a verse search result is loaded)
  const [chapterSlides, setChapterSlides] = useState<ChapterSlide[]>([]);
  const [chapterSlideLabel, setChapterSlideLabel] = useState<string>('');
  const [highlightedVerseNum, setHighlightedVerseNum] = useState<number | null>(null);
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [outputWindow, setOutputWindow] = useState<WebviewWindow | null>(null);
  const [loading, setLoading] = useState(false);

  // Background picker state
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);

  // Branding modal state
  const [showBrandingModal, setShowBrandingModal] = useState<boolean>(false);

  // Custom text slide modal state
  const [showTextModal, setShowTextModal] = useState(false);
  const [customTextTitle, setCustomTextTitle] = useState('');
  const [customTextContent, setCustomTextContent] = useState('');
  const [editingSavedSlideId, setEditingSavedSlideId] = useState<string | null>(null);
  const [showAllSavedSlides, setShowAllSavedSlides] = useState(false);

  // Saved text slides (persisted in localStorage)
  const [savedTextSlides, setSavedTextSlides] = useState<SavedTextSlide[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_SLIDES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  
  // Timer State for active controls
  const [timerInfo, setTimerInfo] = useState<TimerInfo | null>(null);

  useEffect(() => {
    loadSongs();
    loadBibleBooks();
    loadServices();
    loadPresentationState();
    setupKeyboardShortcuts();
    
    const setupTimerListener = async () => {
      const state = await timerApi.getState();
      setTimerInfo(state);
      
      const unlisten = await listen('timer-updated', (event: any) => {
         setTimerInfo(event.payload);
      });
      return unlisten;
    };
    
    let unlistenFn: any;
    setupTimerListener().then(un => unlistenFn = un);
    
    return () => {
       if (unlistenFn) unlistenFn();
    }
  }, []);

  const loadSongs = async () => {
    try {
      const data = await songApi.getAll();
      setSongs(data);
    } catch (error) {
      console.error('Failed to load songs:', error);
    }
  };

  const loadBibleBooks = async () => {
    try {
      const books = await bibleApi.getBooks();
      setBibleBooks(books);
    } catch (error) {
      console.error('Failed to load bible books:', error);
    }
  };
  
  const loadServices = async () => {
    try {
      const data = await serviceApi.getAll();
      const parsedServices = await Promise.all(
         data.map(async (service) => {
            try {
               const acts = await activityApi.getByService(service.id);
               return { ...service, activities: acts };
            } catch (e) {
               return { ...service, activities: [] };
            }
         })
      );
      setServices(parsedServices);
    } catch (error) {
      console.error('Failed to load services:', error);
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

  // Keep local background state in sync with the current slide's background
  useEffect(() => {
    if (presentationInfo?.current_slide) {
      const slideBg = presentationInfo.current_slide.background_path;
      if (slideBg !== undefined) {
        setCurrentBackground(slideBg);
      }
    }
  }, [presentationInfo?.current_slide]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(songs.map(s => ({ type: 'song', id: s.id, title: s.title, data: s })));
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    
    // Create a simplified query to find books (e.g. "1john" instead of "1 john")
    const searchStr = query.replace(/[^a-z0-9]/g, '');
    let matchedBook = null;
    let maxMatchLen = 0;
    let actualBookName = '';

    // Find the longest matching book name prefix
    for (const [bookName] of bibleBooks) {
      const simpleBookName = bookName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (searchStr.startsWith(simpleBookName) && simpleBookName.length > maxMatchLen) {
        maxMatchLen = simpleBookName.length;
        matchedBook = simpleBookName;
        actualBookName = bookName;
      }
    }

    let isBibleQuery = false;

    if (matchedBook) {
      isBibleQuery = true;
      const restOfQuery = searchStr.substring(matchedBook.length);

      if (restOfQuery.length > 0) {
        // Try parsing chapter and verse. Allow optional "chapter" keyword.
        // We look for numbers corresponding to chapter and optional verses
        // We can just extract all digits now since letters are removed or "ch" could be still there
        const match = query.substring(query.toLowerCase().indexOf(actualBookName.toLowerCase()) + actualBookName.length).match(/(?:chapter|ch|chap)?\s*(\d+)(?:\s*:\s*(\d+))?/i);
        
        if (match) {
          const chapter = parseInt(match[1]);
          const verse = match[2] ? parseInt(match[2]) : null;

          if (verse) {
            setSearchResults([{
              type: 'verse',
              id: `verse-${actualBookName}-${chapter}-${verse}`,
              title: `${actualBookName} ${chapter}:${verse}`,
              data: { book: actualBookName, chapter, verse }
            }]);
          } else {
            setSearchResults([{
              type: 'chapter',
              id: `chapter-${actualBookName}-${chapter}`,
              title: `${actualBookName} Chapter ${chapter}`,
              data: { book: actualBookName, chapter }
            }]);
          }
          return;
        }
      } else {
        // Just matched a book name exactly.
        setSearchResults([{
           type: 'chapter',
           id: `book-${actualBookName}`,
           title: `${actualBookName} (Type a chapter number!)`,
           data: { book: actualBookName, chapter: null }
        }]);
        return;
      }
    }

    // Fall back to Song / Text Search / Activities
    let results: SearchResult[] = [];

    // 1. Song search
    const filteredSongs = songs.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.lyrics.toLowerCase().includes(query)
    );

    // 2. Activity search 
    // We check all services for activities matching the word
    services.forEach(service => {
       (service.activities || []).forEach(activity => {
          if (activity.name.toLowerCase().includes(query)) {
             results.push({
                type: 'activity',
                id: `activity-${service.id}-${activity.id}`,
                title: `[Activity] ${activity.name} (${service.title})`,
                data: { serviceId: service.id, activity }
             });
          }
       });
    });

    results.push(...filteredSongs.map(s => ({
      type: 'song' as 'song',
      id: s.id,
      title: s.title,
      data: s
    })));

    setSearchResults(results);

    // 2. Deep Bible Text Search (Triggered if query is > 3 chars and not processing a standard book ref)
    if (!isBibleQuery && query.length > 3) {
      // Create an async abort controller pattern implicitly via state updates overriding
      bibleApi.search(query).then(verses => {
         if (verses && verses.length > 0) {
            // Add top 5 verse results
            setSearchResults(prev => {
               // Ensure we don't duplicate on rapid typing
               const newResults = [...prev];
               verses.slice(0, 5).forEach(v => {
                  if (!newResults.find(r => r.id === `search-verse-${v.id}`)) {
                     newResults.push({
                         type: 'verse',
                         id: `search-verse-${v.id}`,
                         title: `${v.book} ${v.chapter}:${v.verse} - "${v.text.substring(0, 30)}..."`,
                         data: v
                     });
                  }
               });
               return newResults;
            });
         }
      }).catch(err => {
         console.warn("Bible text search failed:", err);
      });
    }

  }, [searchQuery, songs, bibleBooks]);

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

  const loadContentToPresentation = async () => {
    if (!selectedContentResult) return;
    const item = searchResults.find(r => r.id === selectedContentResult);
    if (!item) return;

    try {
      setLoading(true);

      if (item.type === 'song') {
        const info = await presentationApi.loadSong(item.data.id);
        setPresentationInfo(info);
      } else if (item.type === 'verse') {
        // 1. Show just the searched verse on the main presentation screen
        const verses = await bibleApi.getVerses(item.data.book, item.data.chapter, item.data.verse, item.data.verse);
        if (verses && verses.length > 0) {
          const v = verses[0];
          const info = await presentationApi.addBibleSlide(v.book, v.chapter, v.verse.toString(), v.text);
          setPresentationInfo(info);
        } else {
          alert('Verse not found');
        }
        // 2. Load full chapter into the slides panel
        try {
          const chVerses = await bibleApi.getChapterVerses(item.data.book, item.data.chapter);
          setChapterSlides(chVerses.map(cv => ({ book: cv.book, chapter: cv.chapter, verse: cv.verse, text: cv.text })));
          setChapterSlideLabel(`${item.data.book} ${item.data.chapter}`);
          setHighlightedVerseNum(item.data.verse);
        } catch (e) {
          console.warn('Could not load chapter slides panel', e);
        }
      } else if (item.type === 'chapter') {
        if (!item.data.chapter) {
           alert('Please type a chapter number next to the book name.');
           return;
        }

        const verses = await bibleApi.getChapterVerses(item.data.book, item.data.chapter);
        if (verses && verses.length > 0) {
          const slides: Slide[] = verses.map(v => ({
            id: `bible-${v.book}-${v.chapter}-${v.verse}`,
            type: 'bible' as any,
            slide_type: 'bible',
            title: `${v.book} ${v.chapter}:${v.verse}`,
            content: `${v.text}\n\n${v.book} ${v.chapter}:${v.verse}`,
            order_index: 0,
            created_at: new Date().toISOString()
          }));
          const info = await presentationApi.addSlides(slides);
          setPresentationInfo(info);
          // Also populate the chapter slides panel
          setChapterSlides(verses.map(v => ({ book: v.book, chapter: v.chapter, verse: v.verse, text: v.text })));
          setChapterSlideLabel(`${item.data.book} ${item.data.chapter}`);
          setHighlightedVerseNum(null);
        } else {
          alert('Chapter not found');
        }
      } else if (item.type === 'activity') {
        const { serviceId, activity } = item.data;
        // 1. Ensure the timer is loaded for this service 
        // 2. Start the timer for this activity immediately
        // (Wait, timer logic isn't fully integrated here—let's push a manual timer slide with the activity title)
        // Alternatively, since timerApi uses current state, we can just push a slide manually.
        const slides = [{
            id: `timer-${Date.now()}`,
            type: 'timer',
            slide_type: 'timer',
            title: activity.name,
            content: (activity.duration_minutes * 60).toString(),
            order_index: 0,
            created_at: new Date().toISOString()
        }] as unknown as Slide[];
        
        // Push presentation slide immediately
        const info = await presentationApi.addSlides(slides);
        setPresentationInfo(info);
        
        // In the background, load the timer state so the ticking syncs up perfectly
        await timerApi.loadService(serviceId);
        await timerApi.setActivity(activity.id);
        await timerApi.startActivity();
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      alert('Failed to load content to presentation');
    } finally {
      setLoading(false);
    }
  };

  const openOutputWindow = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      await invoke('open_presentation_window');
      setOutputWindow(true as any); // mark as open
      console.log('[Presentation] Output window opened via backend command.');
    } catch (error) {
      console.error('[Presentation] Failed to open output window:', error);
      alert(`Could not open output window: ${error}`);
    }
  };

  const handleStart = async () => {
    try {
      const info = await presentationApi.startPresentation();
      setPresentationInfo(info);

      if (!outputWindow) {
        await openOutputWindow();
      }
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

  const handleClear = async () => {
    if (window.confirm('Clear all slides from presentation?')) {
      try {
        const info = await presentationApi.clearPresentation();
        setPresentationInfo(info);
      } catch (error) {
        console.error('Failed to clear presentation:', error);
      }
    }
  };

  // Background handler
  const handleSetBackground = async (bg: string | null) => {
    try {
      const info = await presentationApi.setBackground(bg);
      setPresentationInfo(info);
      setCurrentBackground(bg);
    } catch (error) {
      console.error('Failed to set background:', error);
    }
  };

  // Timer Control Handlers for the Presentation View
  const handleTimerPause = async () => await timerApi.pause();
  const handleTimerResume = async () => await timerApi.resume();
  const handleTimerStop = async () => await timerApi.stop();
  const handleTimerAdd = async (sec: number) => await timerApi.addTime(sec);

  // Chapter slide panel: single-click = highlight, double-click = present
  const handleChapterSlideClick = (slide: ChapterSlide) => {
    if (clickTimerRef.current) {
      // Double-click detected
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      handleChapterSlideDoubleClick(slide);
    } else {
      // Start timer for single-click
      setHighlightedVerseNum(slide.verse);
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        // single-click action: just highlight (already done above)
      }, 250);
    }
  };

  const handleChapterSlideDoubleClick = async (slide: ChapterSlide) => {
    try {
      setHighlightedVerseNum(slide.verse);
      const info = await presentationApi.addBibleSlide(slide.book, slide.chapter, slide.verse.toString(), slide.text);
      setPresentationInfo(info);
    } catch (err) {
      console.error('Failed to present verse from chapter panel:', err);
    }
  };

  // Saved text slides helpers
  const persistSavedSlides = (slides: SavedTextSlide[]) => {
    setSavedTextSlides(slides);
    localStorage.setItem(SAVED_SLIDES_KEY, JSON.stringify(slides));
  };

  const handleSaveTextSlide = () => {
    if (!customTextContent.trim()) return;
    if (editingSavedSlideId) {
      // Update existing
      const updated = savedTextSlides.map(s =>
        s.id === editingSavedSlideId
          ? { ...s, title: customTextTitle.trim(), content: customTextContent.trim() }
          : s
      );
      persistSavedSlides(updated);
    } else {
      // New save
      const newSlide: SavedTextSlide = {
        id: `txt-${Date.now()}`,
        title: customTextTitle.trim(),
        content: customTextContent.trim(),
        savedAt: new Date().toISOString(),
      };
      persistSavedSlides([newSlide, ...savedTextSlides]);
    }
    setShowTextModal(false);
    setCustomTextTitle('');
    setCustomTextContent('');
    setEditingSavedSlideId(null);
  };

  const handleDeleteSavedSlide = (id: string) => {
    persistSavedSlides(savedTextSlides.filter(s => s.id !== id));
  };

  const handlePresentSavedSlide = async (slide: SavedTextSlide) => {
    try {
      setLoading(true);
      const info = await presentationApi.addTextSlide(slide.title || null, slide.content);
      setPresentationInfo(info);
    } catch (err) {
      console.error('Failed to present saved slide:', err);
    } finally {
      setLoading(false);
    }
  };

  const openNewTextModal = () => {
    setCustomTextTitle('');
    setCustomTextContent('');
    setEditingSavedSlideId(null);
    setShowTextModal(true);
  };

  const openEditSavedModal = (slide: SavedTextSlide) => {
    setCustomTextTitle(slide.title);
    setCustomTextContent(slide.content);
    setEditingSavedSlideId(slide.id);
    setShowTextModal(true);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helpers for background rendering in the control preview
  const getBuiltinClass = (bg: string | null): string => {
    if (!bg || !bg.startsWith('builtin:')) return '';
    const key = bg.replace('builtin:', '');
    return `bg-${key}`;
  };

  const getCssBackgroundStyle = (bg: string | null): React.CSSProperties => {
    if (!bg) return {};
    if (bg.startsWith('builtin:')) return {}; // handled by overlay div
    // Local file path — use Tauri convertFileSrc
    return {
      backgroundImage: `url(${mediaApi.getAssetUrl(bg)})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  };

  const currentTimer = timerInfo?.current_timer;
  const isImageBg = currentBackground && !currentBackground.startsWith('builtin:');
  const builtinClass = getBuiltinClass(currentBackground);

  const bgLayer = currentBackground && (
    <div className="output-bg-container">
      <div 
        className={`output-bg-layer ${builtinClass} ${isImageBg ? 'is-image' : ''}`} 
        style={getCssBackgroundStyle(currentBackground)}
      />
      <div className="output-bg-overlay" />
    </div>
  );

  return (
    <div className="presentation-control">
      <header className="page-header">
        <div className="header-content">
          <div className="header-icon-container">
            <MdMic className="header-icon" />
          </div>
          <div>
            <h1>Presentation Control</h1>
            <p>
              {presentationInfo?.total_slides || 0} slides loaded
              {presentationInfo?.is_live && <span className="live-badge">Live</span>}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={openOutputWindow}
          >
            <MdMonitor size={20} /> Output Window
          </button>
          <button className="btn btn-secondary" onClick={() => setShowBrandingModal(true)}>
            <MdPalette size={20} /> Branding & Styles
          </button>
          {presentationInfo?.is_live ? (
            <button className="btn btn-danger" onClick={handleStop}>
              <MdStop size={20} /> Stop
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={!presentationInfo?.total_slides}
            >
              <MdPlayArrow size={20} /> Start Presentation
            </button>
          )}
        </div>
      </header>

      <div className="presentation-layout">
        <div className="content-library">
          <div className="section-header">
            <h3><MdAdd size={22} /> Add Content</h3>
          </div>
          <div className="add-content-section">
            <div className="search-bar">
              <MdSearch className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search songs, verses... (e.g. Romans 3:2)"
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="select-wrapper">
              <select
                value={selectedContentResult}
                onChange={(e) => setSelectedContentResult(e.target.value)}
                className="content-select"
              >
                <option value="">Select content to add...</option>
                {searchResults.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={loadContentToPresentation}
              disabled={!selectedContentResult || loading}
            >
              {loading ? (
                <>
                  <FiRefreshCw className="spinner" size={20} /> Loading...
                </>
              ) : (
                <>
                  <MdAdd size={20} /> Load Content
                </>
              )}
            </button>

            <button
              className="btn btn-text-slide btn-block"
              onClick={openNewTextModal}
            >
              <MdEdit size={20} /> New Text / Announcement
            </button>
          </div>

          {/* Saved text slides list */}
          {savedTextSlides.length > 0 && (
            <div className="saved-slides-section">
              <div className="saved-slides-label">Saved Slides</div>
              <div className="saved-slides-list">
                {(showAllSavedSlides ? savedTextSlides : savedTextSlides.slice(0, 2)).map(slide => (
                  <div key={slide.id} className="saved-slide-item">
                    <div className="saved-slide-info" onClick={() => openEditSavedModal(slide)}>
                      <div className="saved-slide-title">
                        {slide.title || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Untitled</span>}
                      </div>
                      <div className="saved-slide-preview">{slide.content.substring(0, 60)}{slide.content.length > 60 ? '…' : ''}</div>
                    </div>
                    <div className="saved-slide-actions">
                      <button
                        className="saved-slide-btn present"
                        title="Present now"
                        disabled={loading}
                        onClick={() => handlePresentSavedSlide(slide)}
                      >
                        <MdPlayArrow size={16} />
                      </button>
                      <button
                        className="saved-slide-btn delete"
                        title="Delete"
                        onClick={() => handleDeleteSavedSlide(slide.id)}
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {savedTextSlides.length > 2 && (
                <button
                  className="btn-view-more-slides"
                  onClick={() => setShowAllSavedSlides(!showAllSavedSlides)}
                >
                  {showAllSavedSlides ? 'View Less' : `View More (${savedTextSlides.length - 2} hidden)`}
                </button>
              )}
            </div>
          )}

          <button
            className="btn btn-outline btn-block mt-auto btn-danger-outline"
            onClick={handleClear}
            disabled={!presentationInfo?.total_slides}
          >
            <MdDelete size={20} /> Clear Slides
          </button>
        </div>

        <div className="current-preview">
          <div className="preview-label-row">
            <span className="preview-label">Current Slide</span>
            <button
              className={`bg-pick-btn ${currentBackground ? 'has-bg' : ''}`}
              onClick={() => setShowBgPicker(true)}
              title="Set presentation background"
            >
              <MdImage size={16} />
              {currentBackground
                ? (currentBackground.startsWith('builtin:')
                    ? BUILTIN_THEMES.find(t => t.key === currentBackground)?.name ?? 'Custom'
                    : currentBackground.split('/').pop())
                : 'Background'}
            </button>
          </div>
          <div className="preview-box">
            {bgLayer}
            {presentationInfo?.is_blank ? (
              <div className="blank-screen">Screen Blank</div>
            ) : presentationInfo?.current_slide ? (
              <div className="slide-preview">
                {presentationInfo.current_slide.title && (
                  <div className="slide-title">{presentationInfo.current_slide.title}</div>
                )}
                <div className="slide-content">
                  {presentationInfo.current_slide.content}
                </div>
              </div>
            ) : (
              <div className="no-slide">No slide loaded</div>
            )}
          </div>
          <div className="slide-counter">
            {presentationInfo?.total_slides ? (
              <>
                Slide {presentationInfo.current_index + 1} of {presentationInfo.total_slides}
              </>
            ) : (
              'No slides'
            )}
          </div>
        </div>

        <div className="next-preview">
          {chapterSlides.length > 0 ? (
            // When a chapter is loaded, replace Next Slide panel with Chapter Slides Panel
            <div className="chapter-slides-panel">
              <div className="chapter-slides-header">
                <span className="preview-label">📖 {chapterSlideLabel} — All Verses</span>
                <button
                  className="chapter-slides-close"
                  onClick={() => { setChapterSlides([]); setChapterSlideLabel(''); setHighlightedVerseNum(null); }}
                  title="Close panel"
                >✕</button>
              </div>
              <div className="chapter-slides-hint">Single-click to highlight · Double-click to present</div>
              <div className="chapter-slides-list">
                {chapterSlides.map(slide => (
                  <div
                    key={slide.verse}
                    className={`chapter-slide-item${highlightedVerseNum === slide.verse ? ' highlighted' : ''}`}
                    onClick={() => handleChapterSlideClick(slide)}
                    title={`Double-click to present ${slide.book} ${slide.chapter}:${slide.verse}`}
                  >
                    <span className="chapter-slide-num">{slide.verse}</span>
                    <span className="chapter-slide-text">{slide.text.length > 80 ? slide.text.substring(0, 80) + '…' : slide.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="preview-label">Next Slide</div>
              <div className="preview-box small">
                {presentationInfo?.next_slide ? (
                  <div className="slide-preview">
                    {presentationInfo.next_slide.title && (
                      <div className="slide-title">{presentationInfo.next_slide.title}</div>
                    )}
                    <div className="slide-content">
                      {presentationInfo.next_slide.content}
                    </div>
                  </div>
                ) : (
                  <div className="no-slide">End of presentation</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {currentTimer && presentationInfo?.current_slide?.slide_type === 'timer' && (
        <div className="mini-timer-panel">
           <div className="mini-timer-info">
              <MdTimer size={20} color="#10b981" />
              <strong>{currentTimer.activity_name}</strong>
              <span className={`mini-time ${currentTimer.is_overrun ? 'overrun' : ''}`}>
                 {currentTimer.is_overrun ? '+' : ''}
                 {formatTime(currentTimer.is_overrun ? currentTimer.elapsed_seconds - currentTimer.duration_seconds : currentTimer.duration_seconds - currentTimer.elapsed_seconds)}
              </span>
           </div>
           <div className="mini-timer-actions">
              <button className="btn btn-secondary btn-sm" onClick={currentTimer.is_running ? handleTimerPause : handleTimerResume}>
                 {currentTimer.is_running ? <><MdPause size={16}/> Pause</> : <><MdPlayArrow size={16}/> Resume</>}
              </button>
              <button className="btn btn-danger-outline btn-sm" onClick={handleTimerStop}>
                 <MdStop size={16} /> Stop
              </button>
              <div className="mini-timer-adjust">
                 <button onClick={() => handleTimerAdd(60)}>+1m</button>
                 <button onClick={() => handleTimerAdd(300)}>+5m</button>
                 <button onClick={() => handleTimerAdd(-60)}>-1m</button>
              </div>
           </div>
        </div>
      )}

      <div className="presentation-controls">
        <button
          className="control-btn"
          onClick={handlePrevious}
          disabled={!presentationInfo?.total_slides || presentationInfo?.current_index === 0}
        >
          <MdSkipPrevious size={24} /> Previous
        </button>
        <button
          className={`control-btn blank-btn ${presentationInfo?.is_blank ? 'is-blanking' : ''}`}
          onClick={handleToggleBlank}
          disabled={!presentationInfo?.is_live}
        >
          {presentationInfo?.is_blank ? (
            <>
              <MdVisibility size={24} /> Show
            </>
          ) : (
            <>
              <MdVisibilityOff size={24} /> Blank
            </>
          )}
        </button>
        <button
          className="control-btn primary"
          onClick={handleNext}
          disabled={
            !presentationInfo?.total_slides ||
            presentationInfo?.current_index >= (presentationInfo?.total_slides - 1)
          }
        >
          Next <MdSkipNext size={24} />
        </button>
      </div>

      <div className="quick-access-toolbar">
        <div className="toolbar-section">
          <strong>Quick Access</strong>
        </div>
        <div className="toolbar-buttons">
          <button className="toolbar-btn" title="Previous Slide (←)">
            <MdSkipPrevious size={20} />
          </button>
          <button className="toolbar-btn" title="Toggle Blank Screen (B)">
            <MdVisibilityOff size={20} />
          </button>
          <button className="toolbar-btn" title="Stop Presentation (ESC)">
            <MdStop size={20} />
          </button>
          <button className="toolbar-btn primary-tool" title="Next Slide (Space/→)">
            <MdSkipNext size={20} />
          </button>
        </div>
        <div className="toolbar-shortcuts">
          <span>Space/→: Next</span>
          <span>←: Prev</span>
          <span>B: Blank</span>
          <span>ESC: Stop</span>
        </div>
      </div>

    {/* Background Picker Modal */}
    {showBgPicker && (
      <BackgroundPicker
        currentBackground={currentBackground}
        onApply={handleSetBackground}
        onClose={() => setShowBgPicker(false)}
      />
    )}

    {/* Church Branding Modal */}
    {showBrandingModal && (
       <ChurchBrandingModal onClose={() => setShowBrandingModal(false)} />
    )}

    {/* Custom Text Slide Modal */}
    {showTextModal && (
      <div className="text-slide-modal-overlay" onClick={() => setShowTextModal(false)}>
        <div className="text-slide-modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="text-slide-modal-header">
            <div className="text-slide-modal-title">
              <MdEdit size={22} />
              <span>{editingSavedSlideId ? 'Edit Saved Slide' : 'New Text Slide'}</span>
            </div>
            <button className="text-slide-close-btn" onClick={() => setShowTextModal(false)}>
              <MdClose size={20} />
            </button>
          </div>

          <div className="text-slide-modal-body">
            <label className="text-slide-label">Title <span className="text-slide-optional">(optional)</span></label>
            <input
              type="text"
              className="text-slide-input"
              placeholder="e.g. Announcements"
              value={customTextTitle}
              onChange={(e) => setCustomTextTitle(e.target.value)}
            />

            <label className="text-slide-label">Content</label>
            <textarea
              className="text-slide-textarea"
              placeholder="Type your announcement, quote, or any text here..."
              rows={6}
              value={customTextContent}
              onChange={(e) => setCustomTextContent(e.target.value)}
              autoFocus
            />
          </div>

          <div className="text-slide-modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowTextModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-save-slide"
              disabled={!customTextContent.trim()}
              onClick={handleSaveTextSlide}
              title="Save to reuse later"
            >
              <MdAdd size={18} /> Save for Later
            </button>
            <button
              className="btn btn-primary"
              disabled={!customTextContent.trim() || loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  const info = await presentationApi.addTextSlide(
                    customTextTitle.trim() || null,
                    customTextContent.trim()
                  );
                  setPresentationInfo(info);
                  setShowTextModal(false);
                  setCustomTextTitle('');
                  setCustomTextContent('');
                  setEditingSavedSlideId(null);
                } catch (err) {
                  console.error('Failed to add text slide:', err);
                  alert('Failed to add text slide');
                } finally {
                  setLoading(false);
                }
              }}
            >
              <MdPlayArrow size={20} /> Present Now
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default PresentationControl;
