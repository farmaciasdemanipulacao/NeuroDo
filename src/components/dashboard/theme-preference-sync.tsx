'use client';

import { useEffect } from 'react';
import { usePreferences } from '@/hooks/use-preferences';
import type { Preference } from '@/lib/types';

const VALID_THEMES = new Set<Preference['theme']>([
  'default',
  'hyperfocus',
  'creative',
  'night',
]);

export function ThemePreferenceSync() {
  const { preferences } = usePreferences();
  const theme = preferences?.theme ?? 'default';

  useEffect(() => {
    const nextTheme = VALID_THEMES.has(theme) ? theme : 'default';
    document.documentElement.dataset.theme = nextTheme;
  }, [theme]);

  return null;
}
