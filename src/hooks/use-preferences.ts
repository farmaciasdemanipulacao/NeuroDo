'use client';

import { useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import type { UserPreferences } from '@/lib/types';

export function usePreferences() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const preferencesRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'preferences', 'data');
  }, [user, firestore]);

  const { data: preferences, isLoading: arePrefsLoading, error } = useDoc<UserPreferences>(preferencesRef);

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      if (!user || !firestore) return;
      const ref = doc(firestore, 'users', user.uid, 'preferences', 'data');
      setDocumentNonBlocking(
        ref,
        { ...updates, userId: user.uid, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    },
    [user, firestore]
  );

  return {
    data: preferences,
    isLoading: isUserLoading || arePrefsLoading,
    error,
    updatePreferences,
  };
}
