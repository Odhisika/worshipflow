import { invoke } from '@tauri-apps/api/core';

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

export interface VersionInfo {
  version: string;
  count: number;
}

export const bibleApi = {
  getBooks: (): Promise<[string, string, number][]> =>
    invoke('get_bible_books'),

  getVerses: (
    book: string,
    chapter: number,
    startVerse: number,
    endVerse?: number,
    version?: string | null
  ): Promise<BibleVerse[]> =>
    invoke('get_bible_verses', { book, chapter, startVerse, endVerse, version }),

  getChapterVerses: (
    book: string,
    chapter: number,
    version?: string | null
  ): Promise<BibleVerse[]> =>
    invoke('get_chapter_verses', { book, chapter, version }),

  search: (query: string, version?: string | null): Promise<BibleVerse[]> =>
    invoke('search_bible', { query, version }),

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

  importVersionFile: (filename: string): Promise<number> =>
    invoke('import_bible_version_file', { filename }),

  getVerseCount: (): Promise<number> =>
    invoke('get_bible_verse_count'),

  getVersions: (): Promise<string[]> =>
    invoke('get_bible_versions'),

  getActiveVersion: (): Promise<string | null> =>
    invoke('get_active_bible_version'),

  setActiveVersion: (version: string): Promise<void> =>
    invoke('set_active_bible_version', { version }),

  importBibleFile: (filePath: string): Promise<[string, number]> =>
    invoke('import_bible_from_user_file', { path: filePath }),

  openBibleFileDialog: (): Promise<string | null> =>
    invoke('open_bible_file_dialog'),

  deleteBibleVersion: (version: string): Promise<number> =>
    invoke('delete_bible_version', { version }),

  getBibleVersionInfo: (): Promise<[string, number][]> =>
    invoke('get_bible_version_info'),
};
