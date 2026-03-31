import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { bibleApi, BibleVerse, BibleBook } from '../api/bible';
import { presentationApi } from '../api/presentation';
import {
  MdMenuBook, MdSearch, MdCheckCircle,
  MdAutoAwesome, MdChevronLeft, MdChevronRight, MdHistory,
  MdClose, MdOutlineLiveTv
} from 'react-icons/md';
import './BibleBrowser.css';

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

      await bibleApi.initializeBooks();
      const rawBooks = await bibleApi.getBooks();
      const mappedBooks: BibleBook[] = rawBooks.map(([name, testament, chapters]) => ({
        name,
        testament,
        chapters
      }));
      setBooks(mappedBooks);

      if (mappedBooks.length > 0 && !selectedBook) {
        setSelectedBook(mappedBooks[0].name);
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

  const loadVerses = useCallback(async (book: string, ch: number) => {
    if (!book || !isBibleLoaded) return;
    setIsLoading(true);
    try {
      // Use getChapterVerses to load every verse in the chapter at once
      const result = await bibleApi.getChapterVerses(book, ch);
      setVerses(result);
    } catch (error) {
      console.error('Lookup error:', error);
      showNotification('Failed to load verses', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isBibleLoaded]);

  useEffect(() => {
    if (selectedBook && chapter) {
      loadVerses(selectedBook, chapter);
    }
  }, [selectedBook, chapter, loadVerses]);

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
      const results = await bibleApi.search(searchQuery);
      setSearchResults(results.slice(0, 50)); // Cap at 50 for performance
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

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
          <span style={{ fontWeight: 600 }}>KJV Holy Bible</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`status-badge ${isBibleLoaded ? 'complete' : 'loading'}`}>
            {isBibleLoaded ? <MdCheckCircle /> : <MdAutoAwesome className="spin-slow" />}
            {isBibleInitializing ? `Initializing... ${verseCount.toLocaleString()} verses` : `${verseCount.toLocaleString()} Verses Available`}
          </div>
        </div>
      </div>

      <div className="bible-main-layout">
        {/* SIDEBAR: Book Navigation */}
        <aside className="book-sidebar glass-panel">
          <div className="sidebar-header">
            <MdMenuBook className="icon" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Books of the Bible</span>
          </div>

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
        </aside>

        {/* CENTER: Reader Area */}
        <main className="reader-area glass-panel">
          <div className="reader-controls border-bottom">
            <div className="controls-left">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
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

                {/* Verse jump dropdown (custom - avoids WebView overflow clipping) */}
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

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary-elite" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                <MdOutlineLiveTv /> Present Chapter
              </button>
            </div>
          </div>

          <div className="reader-content" ref={readerRef}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <div className="import-spinner" />
              </div>
            ) : verses.length > 0 ? (
              verses.map(v => (
                <div
                  key={v.id}
                  id={`bible-verse-${v.verse}`}
                  className={`verse-block${selectedVerse === v.verse ? ' active' : ''}`}
                  onClick={() => addToPresentation(v)}
                >
                  <span className="verse-num">{v.verse}</span>
                  <div className="verse-body">{v.text}</div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.5, padding: '4rem' }}>
                <MdAutoAwesome size={48} className={isBibleInitializing ? "spin" : ""} style={{ marginBottom: '1rem' }} />
                <h3>{isBibleInitializing ? "Holy Bible is Initializing" : "Ready to Transform Your Service"}</h3>
                <p>{isBibleInitializing ? "We're setting up the scriptures for instant access. Please wait..." : "Select a book or chapter to begin displaying Scripture."}</p>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT: Search & Quick Actions */}
        <aside className="action-panel">
          <section className="search-container glass-panel">
            <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>Quick Search</h3>
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
                <div style={{ textAlign: 'center', padding: '1rem' }}>Searching...</div>
              ) : searchResults.map(v => (
                <div key={v.id} className="result-card" onClick={() => jumpToVerse(v)}>
                  <div className="result-ref">{v.book} {v.chapter}:{v.verse}</div>
                  <div className="result-snippet">{v.text}</div>
                </div>
              ))}
              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.5 }}>No matches found</div>
              )}
            </div>
          </section>

          <section className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 1rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MdHistory /> Recent Activity
            </h3>
            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
              Your presentation history will appear here.
            </div>
          </section>
        </aside>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`bible-notification ${notification.type}`}>
          {notification.msg}
          <MdClose style={{ cursor: 'pointer' }} onClick={() => setNotification(null)} />
        </div>
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
