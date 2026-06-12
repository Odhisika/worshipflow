// Church Settings — stored in localStorage for instant persistence

export type PresentationStyle = 'classic' | 'lower-third' | 'cinematic' | 'split-panel' | 'news-ticker';

export interface ChurchSettings {
  churchName: string;
  churchLogoPath: string | null;  // absolute local path to logo image
  presentationStyle: PresentationStyle;
  tickerEnabled: boolean;
  tickerText: string;  // custom text shown in the news ticker crawl
  selectedFont: string;  // CSS font-family value for the presentation output
}

const KEY = 'worshipflow_church_settings';

const defaults: ChurchSettings = {
  churchName: 'WorshipFlow Pro',
  churchLogoPath: null,
  presentationStyle: 'classic',
  tickerEnabled: false,
  tickerText: '',
  selectedFont: "'Inter', system-ui, -apple-system, sans-serif",
};

export const churchSettingsApi = {
  get(): ChurchSettings {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...defaults };
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return { ...defaults };
    }
  },

  save(settings: Partial<ChurchSettings>): ChurchSettings {
    const current = this.get();
    const updated = { ...current, ...settings };
    localStorage.setItem(KEY, JSON.stringify(updated));
    // Dispatch a storage event so other components can react
    window.dispatchEvent(new CustomEvent('church-settings-changed', { detail: updated }));
    return updated;
  },

  subscribe(cb: (settings: ChurchSettings) => void): () => void {
    const handler = (e: Event) => cb((e as CustomEvent<ChurchSettings>).detail);
    window.addEventListener('church-settings-changed', handler);
    return () => window.removeEventListener('church-settings-changed', handler);
  }
};
