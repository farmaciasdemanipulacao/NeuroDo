'use client';

import { useCallback } from 'react';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { Preference } from '@/lib/types';

const DEFAULTS: Omit<Preference, 'userId' | 'updatedAt'> = {
  energyLevel: null,
  theme: 'default',
  notificationsEnabled: false,
  focusTimerDefault: 'pomodoro',
};

/**
 * Lê e escreve o documento /users/{uid}/preferences/data em tempo real.
 */
export function usePreferences() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const prefRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'preferences', 'data');
  }, [user, firestore]);

  const { data: raw, isLoading: arePrefsLoading } = useDoc<Preference>(prefRef);

  // Merge com defaults para campos ausentes
  const preferences: Preference | null = raw
    ? { ...DEFAULTS, ...raw }
    : null;

  const updatePreferences = useCallback(
    async (updates: Partial<Omit<Preference, 'userId' | 'updatedAt'>>) => {
      if (!user || !firestore) return;
      const ref = doc(firestore, 'users', user.uid, 'preferences', 'data');
      await setDoc(
        ref,
        {
          ...DEFAULTS,
          ...raw,
          ...updates,
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    },
    [user, firestore, raw]
  );

  return {
    preferences,
    isLoading: isUserLoading || arePrefsLoading,
    updatePreferences,
  };
}
