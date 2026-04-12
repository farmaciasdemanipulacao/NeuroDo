'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { FocusSession } from '@/lib/types';

export function useFocusSessions() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'focus_sessions'),
      orderBy('completedAt', 'desc')
    );
  }, [user, firestore]);

  const { data: sessions, isLoading: areSessionsLoading, error } = useCollection<FocusSession>(sessionsQuery);

  return {
    data: sessions,
    isLoading: isUserLoading || areSessionsLoading,
    error,
  };
}
