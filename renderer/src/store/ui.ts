import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '../lib/i18n';

interface UIState {
  theme: 'dark' | 'light';
  lang: Lang;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      lang: 'en',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.classList.toggle('light', next === 'light');
        set({ theme: next });
      },
      setLang: (lang) => {
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        set({ lang });
      },
    }),
    { name: 'wa-ui' }
  )
);
