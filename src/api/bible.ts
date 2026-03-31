import { invoke } from '@tauri-apps/api/tauri';

export interface BibleVerse {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  version: string;
}

export interface BibleBook {
  name: string;
  testament: string;
  chapters: number;
}

export const bibleApi = {
  getBooks: (): Promise<[string, string, number][]> =>
    invoke('get_bible_books'),

  getVerses: (
    book: string,
    chapter: number,
    startVerse: number,
    endVerse?: number
  ): Promise<BibleVerse[]> =>
    invoke('get_bible_verses', { book, chapter, startVerse, endVerse }),

  getChapterVerses: (
    book: string,
    chapter: number
  ): Promise<BibleVerse[]> =>
    invoke('get_chapter_verses', { book, chapter }),

  search: (query: string): Promise<BibleVerse[]> =>
    invoke('search_bible', { query }),

  addVerse: (
    book: string,
    chapter: number,
    verse: number,
    text: string,
    version: string
  ): Promise<BibleVerse> =>
    invoke('add_bible_verse', { book, chapter, verse, text, version }),

  initializeBooks: (): Promise<void> =>
    invoke('initialize_bible_books'),

  bulkImportVerses: (verses: [string, number, number, string, string][]): Promise<number> =>
    invoke('bulk_import_bible_verses', { verses }),

  importFullKjv: (): Promise<number> =>
    invoke('import_full_kjv_bible'),

  getVerseCount: (): Promise<number> =>
    invoke('get_bible_verse_count'),
};
