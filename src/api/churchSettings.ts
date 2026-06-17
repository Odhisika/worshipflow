// Church Settings — stored in localStorage for instant persistence

export type PresentationStyle = 'classic' | 'lower-third' | 'cinematic' | 'split-panel' | 'news-ticker';

export interface ChurchSettings {
  churchName: string;
  churchLogoPath: string | null;  // absolute local path to logo image
  presentationStyle: PresentationStyle;
  tickerEnabled: boolean;
  tickerText: string;  // custom text shown in the news ticker crawl
  selectedFont: string;  // CSS font-family value for the presentation output
  fontSize: number;  // font-size multiplier 0.5–2.0, default 1.0
  textAlign: 'left' | 'center' | 'right';  // text alignment on output screen
  fontBold: boolean;  // bold toggle for presentation text
  fontItalic: boolean;  // italic toggle for presentation text
}

const KEY = 'worshipflow_church_settings';

const defaults: ChurchSettings = {
  churchName: 'WorshipFlow Pro',
  churchLogoPath: null,
  presentationStyle: 'classic',
  tickerEnabled: false,
  tickerText: '',
  selectedFont: "'Inter', 'Segoe UI', Tahoma, Geneva, sans-serif",
  fontSize: 1.0,
  textAlign: 'center',
  fontBold: false,
  fontItalic: false,
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
