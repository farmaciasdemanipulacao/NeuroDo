'use client';

import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserStats } from '@/lib/types';

/**
 * Lê o documento /users/{uid}/user_stats/data em tempo real.
 * Retorna `null` enquanto carrega ou se não existir.
 */
export function useUserStats() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const statsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'user_stats', 'data');
  }, [user, firestore]);

  const { data: stats, isLoading: areStatsLoading } = useDoc<UserStats>(statsRef);

  return {
    data: stats ?? null,
    isLoading: isUserLoading || areStatsLoading,
  };
}
