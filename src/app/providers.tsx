'use client';

import type { ReactNode } from 'react';
import { AppProvider } from '@/context/app-provider';
import { FirebaseClientProvider } from '@/firebase';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <FirebaseClientProvider>
      <AppProvider>{children}</AppProvider>
    </FirebaseClientProvider>
  );
}
