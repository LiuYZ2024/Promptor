import { useEffect } from 'react';
import { useSettings } from './use-settings';

export function useTheme(): void {
  const settings = useSettings();
  const theme = settings.theme;

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => {
        if (mq.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      apply();
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);
}
