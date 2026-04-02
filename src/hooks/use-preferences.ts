'use client';

import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import type { UserPreferences } from '@/lib/types';

export function usePreferences() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const prefsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'preferences', 'data');
  }, [user, firestore]);

  const { data: preferences, isLoading: arePrefsLoading } = useDoc<UserPreferences>(prefsRef);

  function updatePreferences(data: Partial<Omit<UserPreferences, 'userId'>>) {
    if (!prefsRef || !user) return;
    setDocumentNonBlocking(
      prefsRef,
      { ...data, userId: user.uid, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }

  return {
    data: preferences ?? null,
    isLoading: isUserLoading || arePrefsLoading,
    updatePreferences,
  };
}
