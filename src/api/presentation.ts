import { invoke } from '@tauri-apps/api/core';
import { Slide } from './index';

export interface PresentationInfo {
  current_index: number;
  total_slides: number;
  is_live: boolean;
  is_blank: boolean;
  current_slide: Slide | null;
  next_slide: Slide | null;
}

export const presentationApi = {
  // Load content
  loadSong: (songId: string): Promise<PresentationInfo> =>
    invoke('load_song_to_presentation', { songId }),
  
  addSlides: (slides: Slide[]): Promise<PresentationInfo> =>
    invoke('add_slides_to_presentation', { slides }),
  
  addTextSlide: (title: string | null, content: string): Promise<PresentationInfo> =>
    invoke('add_text_slide', { title, content }),
  
  addBibleSlide: (book: string, chapter: number, verses: string, text: string): Promise<PresentationInfo> =>
    invoke('add_bible_slide', { book, chapter, verses, text }),
  
  // Navigation
  nextSlide: (): Promise<PresentationInfo> =>
    invoke('next_slide'),
  
  previousSlide: (): Promise<PresentationInfo> =>
    invoke('previous_slide'),
  
  gotoSlide: (index: number): Promise<PresentationInfo> =>
    invoke('goto_slide', { index }),
  
  // Control
  toggleBlank: (): Promise<PresentationInfo> =>
    invoke('toggle_blank'),
  
  startPresentation: (): Promise<PresentationInfo> =>
    invoke('start_presentation'),
  
  stopPresentation: (): Promise<PresentationInfo> =>
    invoke('stop_presentation'),
  
  clearPresentation: (): Promise<PresentationInfo> =>
    invoke('clear_presentation'),
  
  // State
  getState: (): Promise<PresentationInfo> =>
    invoke('get_presentation_state'),
  
  // Management
  removeSlide: (index: number): Promise<PresentationInfo> =>
    invoke('remove_slide_from_presentation', { index }),
  
  reorderSlides: (from: number, to: number): Promise<PresentationInfo> =>
    invoke('reorder_presentation_slides', { from, to }),
  
  // Background
  setBackground: (background: string | null): Promise<PresentationInfo> =>
    invoke('set_presentation_background', { background }),
};
