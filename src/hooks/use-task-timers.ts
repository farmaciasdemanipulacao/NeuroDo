import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/firebase/provider';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import type { Task } from '@/lib/types';

export interface TaskTimerState {
  taskId: string;
  userId: string;
  startedAt: string; // ISO
  pausedAt?: string; // ISO
  isPaused: boolean;
  isActive: boolean;
}

// Mantém o timer de tarefa sincronizado no Firestore
export function useTaskTimers() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeTimer, setActiveTimer] = useState<TaskTimerState | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega timer ativo do servidor ao montar
  useEffect(() => {
    if (!user || !firestore) return;
    const ref = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setActiveTimer(snap.data() as TaskTimerState);
      } else {
        setActiveTimer(null);
      }
    });
    return () => unsub();
  }, [user, firestore]);

  // Inicia timer para uma tarefa
  const startTimer = useCallback(async (task: Task) => {
    if (!user || !firestore) return;
    setLoading(true);
    const ref = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');
    const timer: TaskTimerState = {
      taskId: task.id,
      userId: user.uid,
      startedAt: new Date().toISOString(),
      isPaused: false,
      isActive: true,
    };
    await setDoc(ref, timer);
    setLoading(false);
  }, [user, firestore]);

  // Pausa timer
  const pauseTimer = useCallback(async () => {
    if (!user || !firestore || !activeTimer) return;
    setLoading(true);
    const ref = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');
    await setDoc(ref, {
      ...activeTimer,
      isPaused: true,
      pausedAt: new Date().toISOString(),
      isActive: false,
    });
    setLoading(false);
  }, [user, firestore, activeTimer]);

  // Retoma timer
  const resumeTimer = useCallback(async () => {
    if (!user || !firestore || !activeTimer) return;
    setLoading(true);
    const ref = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');
    // Ao retomar, devemos ajustar startedAt para descontar o período em que o timer ficou pausado
    try {
      const updated = { ...activeTimer, isPaused: false, isActive: true } as any;
      if (activeTimer.pausedAt) {
        const pausedAtMs = new Date(activeTimer.pausedAt).getTime();
        const startedAtMs = new Date(activeTimer.startedAt).getTime();
        const pauseDuration = Date.now() - pausedAtMs;
        // Avança o startedAt no servidor para ignorar o tempo em pausa
        const newStartedAt = new Date(startedAtMs + pauseDuration).toISOString();
        updated.startedAt = newStartedAt;
        updated.pausedAt = undefined;
      }
      await setDoc(ref, updated);
    } catch (err) {
      console.error('Erro ao retomar timer:', err);
    }
    setLoading(false);
  }, [user, firestore, activeTimer]);

  // Finaliza timer
  const stopTimer = useCallback(async () => {
    if (!user || !firestore) return;
    setLoading(true);
    const ref = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');
    await deleteDoc(ref);
    setLoading(false);
  }, [user, firestore]);

  return {
    activeTimer,
    loading,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  };
}
