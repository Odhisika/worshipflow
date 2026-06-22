import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { LocalMediaFile } from '../api/media';

const STORAGE_KEY = 'worshipflow_app_state';

export interface PresentationMediaFile {
  name: string;
  path: string;
  isVideo: boolean;
  mediaType: 'image' | 'video' | 'audio';
}

interface PersistedState {
  audioPlaylist: LocalMediaFile[];
  currentAudioIndex: number;
  audioVolume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  videoPlaylist: LocalMediaFile[];
  currentVideoIndex: number;
  videoVolume: number;
  isVideoMuted: boolean;
  currentBackground: string | null;
  backgroundUploadImagePath: string | null;
  backgroundUploadVideoPath: string | null;
  presentationMediaFiles: PresentationMediaFile[];
  selectedPresentationMediaFile: PresentationMediaFile | null;
  presentationMediaTypeFilter: 'image' | 'video' | 'audio';
}

export interface AppState extends PersistedState {
  isAudioPlaying: boolean;
  isVideoPlaying: boolean;
  trackDurations: Record<string, number>;
  playableFallbacks: Record<string, string>;
  preparingPlayback: Record<string, boolean>;
}

const defaults: AppState = {
  audioPlaylist: [],
  currentAudioIndex: -1,
  isAudioPlaying: false,
  audioVolume: 1,
  isMuted: false,
  isShuffle: false,
  isRepeat: false,
  trackDurations: {},
  playableFallbacks: {},
  preparingPlayback: {},
  videoPlaylist: [],
  currentVideoIndex: -1,
  isVideoPlaying: false,
  videoVolume: 1,
  isVideoMuted: false,
  currentBackground: null,
  backgroundUploadImagePath: null,
  backgroundUploadVideoPath: null,
  presentationMediaFiles: [],
  selectedPresentationMediaFile: null,
  presentationMediaTypeFilter: 'image',
};

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function savePersisted(state: AppState) {
  try {
    const toSave: PersistedState = {
      audioPlaylist: state.audioPlaylist,
      currentAudioIndex: state.currentAudioIndex,
      audioVolume: state.audioVolume,
      isMuted: state.isMuted,
      isShuffle: state.isShuffle,
      isRepeat: state.isRepeat,
      videoPlaylist: state.videoPlaylist,
      currentVideoIndex: state.currentVideoIndex,
      videoVolume: state.videoVolume,
      isVideoMuted: state.isVideoMuted,
      currentBackground: state.currentBackground,
      backgroundUploadImagePath: state.backgroundUploadImagePath,
      backgroundUploadVideoPath: state.backgroundUploadVideoPath,
      presentationMediaFiles: state.presentationMediaFiles,
      selectedPresentationMediaFile: state.selectedPresentationMediaFile,
      presentationMediaTypeFilter: state.presentationMediaTypeFilter,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* ignore */ }
}

interface AppStateContextValue {
  state: AppState;
  updateState: (patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => ({
    ...defaults,
    ...loadPersisted(),
  }));

  useEffect(() => {
    savePersisted(state);
  }, [
    state.audioPlaylist,
    state.currentAudioIndex,
    state.audioVolume,
    state.isMuted,
    state.isShuffle,
    state.isRepeat,
    state.videoPlaylist,
    state.currentVideoIndex,
    state.videoVolume,
    state.isVideoMuted,
    state.currentBackground,
    state.backgroundUploadImagePath,
    state.backgroundUploadVideoPath,
    state.presentationMediaFiles,
    state.selectedPresentationMediaFile,
    state.presentationMediaTypeFilter,
  ]);

  const updateState = useCallback(
    (patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
      setState(prev => {
        const resolved = typeof patch === 'function' ? patch(prev) : patch;
        return { ...prev, ...resolved };
      });
    },
    [],
  );

  return (
    <AppStateContext.Provider value={{ state, updateState }}>
      {children}
    </AppStateContext.Provider>
  );
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
