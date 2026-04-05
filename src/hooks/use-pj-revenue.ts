'use client';

import { useCallback } from 'react';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { MonthlyPJRevenue, PJRevenueEntry } from '@/lib/types';

/**
 * Lê e escreve receitas PJ mensais em /users/{uid}/revenue_pj/{YYYY-MM}.
 */
export function usePJRevenue() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Lê toda a coleção de receitas PJ
  const revenueQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'revenue_pj'));
  }, [user, firestore]);

  const { data, isLoading: isCollectionLoading } = useCollection<MonthlyPJRevenue>(revenueQuery);

  const isLoading = isUserLoading || isCollectionLoading;

  /**
   * Salva (ou sobrescreve) as entradas de receita PJ de um mês específico.
   * @param month - string no formato YYYY-MM
   * @param entries - array de entradas por projeto
   */
  const savePJRevenue = useCallback(
    (month: string, entries: PJRevenueEntry[]) => {
      if (!user || !firestore) return;

      const totalGross = entries.reduce((sum, e) => sum + (e.grossRevenue || 0), 0);
      const totalExpenses = entries.reduce((sum, e) => sum + (e.expenses || 0), 0);
      const totalNet = entries.reduce((sum, e) => sum + (e.netRevenue || 0), 0);
      const now = new Date().toISOString();

      const docRef = doc(firestore, 'users', user.uid, 'revenue_pj', month);

      // Preservar createdAt se o documento já existir
      const existing = data?.find((r) => r.month === month);

      const payload: Omit<MonthlyPJRevenue, 'id'> = {
        userId: user.uid,
        month,
        entries,
        totalGross,
        totalExpenses,
        totalNet,
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
    (month: string): MonthlyPJRevenue | null => {
      if (!data) return null;
      return data.find((r) => r.month === month) ?? null;
    },
    [data]
  );

  return { data, isLoading, savePJRevenue, getMonthData };
}
