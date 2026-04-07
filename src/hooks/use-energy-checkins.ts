'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { EnergyCheckinRecord } from '@/lib/types';

/**
 * Busca os check-ins de energia do usuário (energy_checkins)
 * ordenados do mais recente para o mais antigo.
 */
export function useEnergyCheckins(maxRecords = 70) {
  const { user } = useUser();
  const firestore = useFirestore();

  const checkinsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'energy_checkins'),
      orderBy('createdAt', 'desc'),
      limit(maxRecords)
    );
  }, [user, firestore, maxRecords]);

  const { data: raw, isLoading } = useCollection<EnergyCheckinRecord>(checkinsQuery);

  const checkins = useMemo(() => {
    if (!raw) return [];
    return [...raw].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [raw]);

  return { checkins, isLoading };
}
