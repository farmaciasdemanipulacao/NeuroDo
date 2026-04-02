'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { UserStats } from '@/lib/types';

export function useUserStats() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userStatsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'user_stats', 'data');
  }, [user, firestore]);

  const { data: userStats, isLoading: areStatsLoading } = useDoc<UserStats>(userStatsRef);

  return {
    data: userStats ?? null,
    isLoading: isUserLoading || areStatsLoading,
  };
}
