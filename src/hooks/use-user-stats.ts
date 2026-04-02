'use client';

import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { UserStats } from '@/lib/types';

export function useUserStats() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userStatsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'user_stats', 'data');
  }, [user, firestore]);

  const { data: userStats, isLoading: areStatsLoading, error } = useDoc<UserStats>(userStatsRef);

  return {
    data: userStats,
    isLoading: isUserLoading || areStatsLoading,
    error,
  };
}
