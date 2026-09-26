'use client';

import type { ReactNode } from 'react';
import { AppProvider } from '@/context/app-provider';
import { FirebaseClientProvider } from '@/firebase';
import { ThemePreferenceSync } from '@/components/dashboard/theme-preference-sync';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <FirebaseClientProvider>
      <ThemePreferenceSync />
      <AppProvider>{children}</AppProvider>
    </FirebaseClientProvider>
  );
}
