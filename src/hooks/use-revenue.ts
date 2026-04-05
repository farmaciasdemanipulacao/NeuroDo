'use client';

import { useCallback } from 'react';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { MonthlyRevenue, RevenueEntry } from '@/lib/types';

/**
 * Lê e escreve receitas mensais em /users/{uid}/revenue/{YYYY-MM}.
 */
export function useRevenue() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Lê toda a coleção de receitas
  const revenueQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'revenue'));
  }, [user, firestore]);

  const { data, isLoading: isCollectionLoading } = useCollection<MonthlyRevenue>(revenueQuery);

  const isLoading = isUserLoading || isCollectionLoading;

  /**
   * Salva (ou sobrescreve) as entradas de receita de um mês específico.
   * @param month - string no formato YYYY-MM
   * @param entries - array de entradas por projeto
   */
  const saveRevenue = useCallback(
    (month: string, entries: RevenueEntry[]) => {
      if (!user || !firestore) return;

      const totalAmount = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
      const now = new Date().toISOString();

      const docRef = doc(firestore, 'users', user.uid, 'revenue', month);

      // Preservar createdAt se o documento já existir
      const existing = data?.find((r) => r.month === month);

      const payload: Omit<MonthlyRevenue, 'id'> = {
        userId: user.uid,
        month,
        entries,
        totalAmount,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      setDocumentNonBlocking(docRef, payload, { merge: false });
    },
    [user, firestore, data]
  );

  /**
   * Retorna os dados de um mês específico a partir do cache local.
   */
  const getMonthData = useCallback(
    (month: string): MonthlyRevenue | null => {
      if (!data) return null;
      return data.find((r) => r.month === month) ?? null;
    },
    [data]
  );

  return { data, isLoading, saveRevenue, getMonthData };
}
