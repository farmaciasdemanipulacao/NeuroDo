'use client';

import React, { createContext, useContext } from 'react';
import {
  useCollection,
  useDoc,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Task, Goal, UserStats } from '@/lib/types';
import { collection, query, doc } from 'firebase/firestore';

/**
 * DashboardDataProvider centraliza os listeners do Firestore que são
 * compartilhados por vários componentes do dashboard, evitando listeners
 * duplicados que sobrecarregam o WebChannel e causam erros 400.
 *
 * Antes: cada componente abria seu próprio onSnapshot para tasks, goals e
 * user_stats → até 9 listeners redundantes.
 * Depois: 1 listener por coleção, dados compartilhados via context.
 */

interface DashboardData {
  tasks: WithId<Task>[] | null;
  areTasksLoading: boolean;
  goals: WithId<Goal>[] | null;
  areGoalsLoading: boolean;
  userStats: (WithId<UserStats>) | null;
  areStatsLoading: boolean;
}

const DashboardDataContext = createContext<DashboardData | undefined>(undefined);

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // --- 1 listener: tasks ---
  const tasksQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'));
  }, [user, firestore]);
  const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(tasksQuery);

  // --- 1 listener: goals ---
  const goalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals, isLoading: goalsLoading } = useCollection<Goal>(goalsQuery);

  // --- 1 listener: user_stats/data ---
  const statsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'user_stats', 'data');
  }, [user, firestore]);
  const { data: userStats, isLoading: statsLoading } = useDoc<UserStats>(statsRef);

  const value: DashboardData = {
    tasks,
    areTasksLoading: isUserLoading || tasksLoading,
    goals,
    areGoalsLoading: isUserLoading || goalsLoading,
    userStats: userStats ?? null,
    areStatsLoading: isUserLoading || statsLoading,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

/**
 * Hook para acessar os dados compartilhados do dashboard.
 * Deve ser usado dentro do DashboardDataProvider.
 */
export function useDashboardData(): DashboardData {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData deve ser usado dentro de DashboardDataProvider');
  }
  return ctx;
}

/** Atalhos individuais para retrocompatibilidade */
export function useSharedTasks() {
  const { tasks, areTasksLoading } = useDashboardData();
  return { data: tasks, isLoading: areTasksLoading };
}

export function useSharedGoals() {
  const { goals, areGoalsLoading } = useDashboardData();
  return { data: goals, isLoading: areGoalsLoading };
}

export function useSharedUserStats() {
  const { userStats, areStatsLoading } = useDashboardData();
  return { data: userStats, isLoading: areStatsLoading };
}
