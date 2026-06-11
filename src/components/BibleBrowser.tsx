import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { bibleApi, BibleVerse, BibleBook } from '../api/bible';
import { presentationApi } from '../api/presentation';
import {
  MdMenuBook, MdSearch, MdCheckCircle,
  MdAutoAwesome, MdChevronLeft, MdChevronRight, MdHistory,
  MdClose, MdOutlineLiveTv, MdArrowDropDown, MdFormatSize, MdAdd
} from 'react-icons/md';
import BibleImportModal from './BibleImportModal';
import './BibleBrowser.css';

const VERSION_LABELS: Record<string, string> = {
  'KJV': 'King James Version',
  'NKJV': 'New King James Version',
  'NWT': 'New World Translation',
  'NIV': 'New International Version',
  'ESV': 'English Standard Version',
  'NASB': 'New American Standard Bible',
  'NLT': 'New Living Translation',
  'CSB': 'Christian Standard Bible',
  'AMP': 'Amplified Bible',
};

function formatVersionLabel(version: string): string {
  return VERSION_LABELS[version] || version;
}

const BibleBrowser: React.FC = () => {
  // Data state
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapter, setChapter] = useState<number>(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [verseCount, setVerseCount] = useState<number>(0);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showVerseDropdown, setShowVerseDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Version state
  const [versions, setVersions] = useState<string[]>([]);
  const [activeVersion, setActiveVersion] = useState<string>('KJV');
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const versionBtnRef = useRef<HTMLButtonElement>(null);
  const versionListRef = useRef<HTMLDivElement>(null);

  // Refs
  const readerRef = useRef<HTMLDivElement>(null);
  const verseDropdownBtnRef = useRef<HTMLButtonElement>(null);
  const verseDropdownListRef = useRef<HTMLDivElement>(null);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'books' | 'search' | 'recent'>('books');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [fontSize, setFontSize] = useState<number>(1.25); // Font size in rem
  const [showImportModal, setShowImportModal] = useState(false);

  // Derived state
  const currentBook = useMemo(() => books.find(b => b.name === selectedBook), [books, selectedBook]);
  const maxChapters = currentBook?.chapters || 1;
  const isBibleLoaded = verseCount >= 31000;
  const isBibleInitializing = !isBibleLoaded;

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadInitialData = useCallback(async () => {
    try {
      const count = await bibleApi.getVerseCount();
      setVerseCount(count);

      const activeVer = await bibleApi.getActiveVersion();
      if (activeVer) {
        setActiveVersion(activeVer);
      }

      await bibleApi.initializeBooks();
      const rawBooks = await bibleApi.getBooks(activeVer ?? undefined);
      const mappedBooks: BibleBook[] = rawBooks.map(([name, testament, chapters]) => ({
        name,
        testament,
        chapters
      }));
      setBooks(mappedBooks);

      if (mappedBooks.length > 0 && !selectedBook) {
        setSelectedBook(mappedBooks[0].name);
      }

      const vers = await bibleApi.getVersions();
      if (vers.length > 0) {
        setVersions(vers);
      }
    } catch (error) {
      console.error('Initialization error:', error);
    }
  }, [selectedBook]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Polling for verse count if initializing
  useEffect(() => {
    let interval: any;
    if (verseCount < 31000) {
      interval = setInterval(async () => {
        const count = await bibleApi.getVerseCount();
        setVerseCount(count);
        if (count >= 31000) {
          clearInterval(interval);
          loadInitialData();
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [verseCount, loadInitialData]);

  const loadVerses = useCallback(async (book: string, ch: number, version?: string) => {
    if (!book || !isBibleLoaded) return;
    setIsLoading(true);
    try {
      const result = await bibleApi.getChapterVerses(book, ch, version ?? activeVersion);
      setVerses(result);
    } catch (error) {
      console.error('Lookup error:', error);
      showNotification('Failed to load verses', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isBibleLoaded, activeVersion]);

  useEffect(() => {
    if (selectedBook && chapter) {
      loadVerses(selectedBook, chapter, activeVersion);
    }
  }, [selectedBook, chapter, activeVersion, loadVerses]);

  const handleChapterChange = (delta: number) => {
    const newCh = chapter + delta;
    if (newCh >= 1 && newCh <= maxChapters) {
      setChapter(newCh);
      setSelectedVerse(null); // reset verse selection on chapter change
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await bibleApi.search(searchQuery, activeVersion);
      setSearchResults(results.slice(0, 50));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportSuccess = async (version: string) => {
    setShowImportModal(false);
    const vers = await bibleApi.getVersions();
    setVersions(vers);
    setActiveVersion(version);
    await bibleApi.setActiveVersion(version);
    const rawBooks = await bibleApi.getBooks(version);
    const mappedBooks: BibleBook[] = rawBooks.map(([name, testament, chapters]) => ({
      name, testament, chapters
    }));
    setBooks(mappedBooks);
    if (mappedBooks.length > 0) {
      setSelectedBook(mappedBooks[0].name);
      setChapter(1);
    }
    showNotification(`Imported "${version}" and switched to it`);
  };

  const handleVersionChange = async (version: string) => {
    setShowVersionDropdown(false);
    if (version === activeVersion) return;
    setActiveVersion(version);
    try {
      await bibleApi.setActiveVersion(version);
      const rawBooks = await bibleApi.getBooks(version);
      const mappedBooks: BibleBook[] = rawBooks.map(([name, testament, chapters]) => ({
        name, testament, chapters
      }));
      setBooks(mappedBooks);
      if (mappedBooks.length > 0) {
        setSelectedBook(mappedBooks[0].name);
        setChapter(1);
      }
      showNotification(`Switched to ${formatVersionLabel(version)}`);
    } catch (error) {
      console.error('Failed to switch version:', error);
      showNotification('Failed to switch Bible version', 'error');
    }
  };

  // Close version dropdown on outside click
  useEffect(() => {
    if (!showVersionDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        versionBtnRef.current?.contains(target) ||
        versionListRef.current?.contains(target)
      ) return;
      setShowVersionDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showVersionDropdown]);

  const addToPresentation = async (verse: BibleVerse) => {
    try {
      await presentationApi.addBibleSlide(verse.book, verse.chapter, verse.verse.toString(), verse.text);
      showNotification(`Sent ${verse.book} ${verse.chapter}:${verse.verse} to Live`);
    } catch (error) {
      showNotification('Failed to update presentation', 'error');
    }
  };

  const jumpToVerse = (v: BibleVerse) => {
    setSelectedBook(v.book);
    setChapter(v.chapter);
    setSelectedVerse(v.verse);
  };

  const handleVerseSelect = (verseNum: number) => {
    setSelectedVerse(verseNum);
    setShowVerseDropdown(false);
    // Scroll within the reader content area
    const el = document.getElementById(`bible-verse-${verseNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const openVerseDropdown = () => {
    if (!verseDropdownBtnRef.current) return;
    const rect = verseDropdownBtnRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 120),
    });
    setShowVerseDropdown(true);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showVerseDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        verseDropdownBtnRef.current?.contains(target) ||
        verseDropdownListRef.current?.contains(target)
      ) return;
      setShowVerseDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showVerseDropdown]);

  // Reset selected verse when book or chapter changes
  useEffect(() => {
    setSelectedVerse(null);
    setShowVerseDropdown(false);
  }, [selectedBook, chapter]);

  return (
    <div className="bible-browser animate-fade-in">
      {/* Top Status Bar */}
      <div className="bible-status-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <MdMenuBook size={20} color="var(--accent-primary)" />

          {/* Version Selector */}
          <div className="version-selector-wrapper">
            <button
              ref={versionBtnRef}
              className="version-selector-btn"
              onClick={() => setShowVersionDropdown(!showVersionDropdown)}
            >
              <span className="version-label">{formatVersionLabel(activeVersion)}</span>
              <MdArrowDropDown size={20} className={`version-arrow${showVersionDropdown ? ' open' : ''}`} />
            </button>

            {showVersionDropdown && (
              <div
                ref={versionListRef}
                className="version-dropdown-list"
              >
                {versions.length === 0 ? (
                  <div className="version-dropdown-empty">No versions loaded</div>
                ) : (
                  versions.map(v => (
                    <div
                      key={v}
                      className={`version-dropdown-item${v === activeVersion ? ' active' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); handleVersionChange(v); }}
                    >
                      <span className="version-dropdown-name">{v}</span>
                      <span className="version-dropdown-full">{formatVersionLabel(v)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            className="bim-add-version-btn"
            onClick={() => setShowImportModal(true)}
            title="Add a new Bible version"
          >
            <MdAdd size={18} />
            <span>Add Version</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`status-badge ${isBibleLoaded ? 'complete' : 'loading'}`}>
            {isBibleLoaded ? <MdCheckCircle /> : <MdAutoAwesome className="spin-slow" />}
            {isBibleInitializing ? `Initializing... ${verseCount.toLocaleString()} verses` : `${verseCount.toLocaleString()} Verses`}
          </div>
        </div>
      </div>

      <div className="bible-main-layout">
        {/* UNIFIED SIDEBAR: Left Column */}
        {!isSidebarCollapsed && (
          <aside className="bible-sidebar glass-panel">
            <div className="sidebar-tabs">
              <button
                className={`tab-btn ${activeTab === 'books' ? 'active' : ''}`}
                onClick={() => setActiveTab('books')}
                title="Books of the Bible"
              >
                <MdMenuBook size={18} />
                <span>Books</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
                title="Search Scriptures"
              >
                <MdSearch size={18} />
                <span>Search</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
                onClick={() => setActiveTab('recent')}
                title="Recent Activity"
              >
                <MdHistory size={18} />
                <span>Recent</span>
              </button>
            </div>

            <div className="sidebar-tab-content">
              {activeTab === 'books' && (
                <div className="book-list-container">
                  {['OT', 'NT'].map(testament => (
                    <div key={testament} className="testament-group">
                      <div className="testament-label">{testament === 'OT' ? 'Old Testament' : 'New Testament'}</div>
                      {books.filter(b => b.testament === testament).map(book => (
                        <button
                          key={book.name}
                          className={`book-item ${selectedBook === book.name ? 'active' : ''}`}
                          onClick={() => { setSelectedBook(book.name); setChapter(1); }}
                        >
                          <span>{book.name}</span>
                          <span className="book-item-chapters">{book.chapters} ch</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'search' && (
                <div className="search-container-tab">
                  <div className="search-input-wrapper">
                    <MdSearch className="search-icon" size={20} />
                    <input
                      type="text"
                      className="search-box"
                      placeholder="Search words or phrases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>

                  <div className="search-results-list">
                    {isSearching ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.7 }}>Searching...</div>
                    ) : searchResults.map(v => (
                      <div key={v.id} className="result-card" onClick={() => jumpToVerse(v)}>
                        <div className="result-ref">{v.book} {v.chapter}:{v.verse}</div>
                        <div className="result-snippet">{v.text}</div>
                      </div>
                    ))}
                    {!isSearching && searchQuery && searchResults.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.5 }}>No matches found</div>
                    )}
                    {!searchQuery && (
                      <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.4, fontSize: '0.85rem' }}>
                        Type a scripture reference (e.g. Genesis 1:1) or words to search.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'recent' && (
                <div className="recent-container-tab">
                  <div className="recent-empty-state">
                    <MdHistory size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Your presentation history will appear here.</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* CENTER: Reader Area */}
        <main className={`reader-area glass-panel ${isSidebarCollapsed ? 'expanded' : ''}`}>
          <div className="reader-controls border-bottom">
            <div className="controls-left">
              <button
                className="sidebar-toggle-btn"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isSidebarCollapsed ? <MdChevronRight size={22} /> : <MdChevronLeft size={22} />}
              </button>

              <h2 className="chapter-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {selectedBook} {chapter}
              </h2>

              <div className="chapter-selector">
                <button className="nav-btn" onClick={() => handleChapterChange(-1)} disabled={chapter <= 1}>
                  <MdChevronLeft size={20} />
                </button>
                <span className="current-chapter-label">CH {chapter}</span>
                <button className="nav-btn" onClick={() => handleChapterChange(1)} disabled={chapter >= maxChapters}>
                  <MdChevronRight size={20} />
                </button>

                {/* Verse jump dropdown */}
                {verses.length > 0 && (
                  <button
                    ref={verseDropdownBtnRef}
                    className={`verse-selector-btn${showVerseDropdown ? ' open' : ''}${selectedVerse ? ' has-value' : ''}`}
                    onClick={openVerseDropdown}
                    title="Jump to verse"
                  >
                    {selectedVerse ? `v. ${selectedVerse}` : 'Verse ▾'}
                  </button>
                )}
              </div>
            </div>

            <div className="controls-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Font Size Adjuster */}
              <div className="font-size-adjuster">
                <MdFormatSize size={16} className="font-size-icon" />
                <button
                  className="font-size-btn"
                  onClick={() => setFontSize(prev => Math.max(0.9, prev - 0.05))}
                  title="Decrease font size"
                >
                  A-
                </button>
                <span className="font-size-val">{Math.round(fontSize * 100)}%</span>
                <button
                  className="font-size-btn"
                  onClick={() => setFontSize(prev => Math.min(1.8, prev + 0.05))}
                  title="Increase font size"
                >
                  A+
                </button>
              </div>

              <button className="btn-primary-elite" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                <MdOutlineLiveTv /> Present Chapter
              </button>
            </div>
          </div>

          <div
            className="reader-content"
            ref={readerRef}
            style={{ fontSize: `${fontSize}rem` }}
          >
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <div className="import-spinner" />
              </div>
            ) : verses.length > 0 ? (
              <div className="verses-layout-container">
                {verses.map(v => (
                  <div
                    key={v.id}
                    id={`bible-verse-${v.verse}`}
                    className={`verse-block${selectedVerse === v.verse ? ' active' : ''}`}
                    onClick={() => addToPresentation(v)}
                  >
                    <span className="verse-num">{v.verse}</span>
                    <div className="verse-body">{v.text}</div>
                    <div className="verse-hover-action">
                      <MdOutlineLiveTv size={16} />
                      <span>Live</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.5, padding: '4rem' }}>
                <MdAutoAwesome size={48} className={isBibleInitializing ? "spin" : ""} style={{ marginBottom: '1rem' }} />
                <h3>{isBibleInitializing ? "Holy Bible is Initializing" : "Ready to Transform Your Service"}</h3>
                <p>{isBibleInitializing ? "We're setting up the scriptures for instant access. Please wait..." : "Select a book or chapter to begin displaying Scripture."}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`bible-notification ${notification.type}`}>
          {notification.msg}
          <MdClose style={{ cursor: 'pointer' }} onClick={() => setNotification(null)} />
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <BibleImportModal
          onClose={() => setShowImportModal(false)}
          onImported={handleImportSuccess}
        />
      )}

      {/* Custom verse dropdown list — fixed position so it clears all overflow:hidden containers */}
      {showVerseDropdown && dropdownPos && (
        <div
          ref={verseDropdownListRef}
          className="verse-dropdown-list"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            minWidth: dropdownPos.width,
          }}
        >
          {verses.map(v => (
            <div
              key={v.verse}
              className={`verse-dropdown-item${selectedVerse === v.verse ? ' selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); handleVerseSelect(v.verse); }}
            >
              <span className="verse-dropdown-num">{v.verse}</span>
              <span className="verse-dropdown-text">{v.text.substring(0, 50)}{v.text.length > 50 ? '…' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BibleBrowser;
