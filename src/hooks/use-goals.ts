'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Goal } from '@/lib/types';

export function useGoals() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const goalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);

  const { data: goals, isLoading: areGoalsLoading, error } = useCollection<Goal>(goalsQuery);

  const isLoading = isUserLoading || areGoalsLoading;

  return { data: goals, isLoading, error };
}
