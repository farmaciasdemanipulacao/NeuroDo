import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/firebase/provider';
import { useFirestore } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { Task, TimesheetEntry } from '@/lib/types';

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
    try {
      await setDoc(ref, timer);
    } catch (err) {
      console.error('Erro ao iniciar timer:', err);
    } finally {
      setLoading(false);
    }
  }, [user, firestore]);

  // Pausa timer
  const pauseTimer = useCallback(async () => {
    if (!user || !firestore || !activeTimer) return;
    setLoading(true);
    const ref = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');
    try {
      await setDoc(ref, {
        ...activeTimer,
        isPaused: true,
        pausedAt: new Date().toISOString(),
        isActive: false,
      });
    } catch (err) {
      console.error('Erro ao pausar timer:', err);
    } finally {
      setLoading(false);
    }
  }, [user, firestore, activeTimer]);

  // Retoma timer
  const resumeTimer = useCallback(async () => {
    if (!user || !firestore || !activeTimer) return;
    setLoading(true);
    const ref = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');
    // Ao retomar, devemos ajustar startedAt para descontar o período em que o timer ficou pausado
    try {
      const { pausedAt: _pausedAt, ...timerWithoutPause } = activeTimer;
      const updated: TaskTimerState = {
        ...timerWithoutPause,
        isPaused: false,
        isActive: true,
      };
      if (activeTimer.pausedAt) {
        const pausedAtMs = new Date(activeTimer.pausedAt).getTime();
        const startedAtMs = new Date(activeTimer.startedAt).getTime();
        const pauseDuration = Date.now() - pausedAtMs;
        // Avança o startedAt no servidor para ignorar o tempo em pausa
        const newStartedAt = new Date(startedAtMs + pauseDuration).toISOString();
        updated.startedAt = newStartedAt;
      }
      await setDoc(ref, updated);
    } catch (err) {
      console.error('Erro ao retomar timer:', err);
    } finally {
      setLoading(false);
    }
  }, [user, firestore, activeTimer]);

  // Finaliza timer
  const stopTimer = useCallback(async () => {
    if (!user || !firestore) return;
    setLoading(true);
    const ref = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');
    try {
      await deleteDoc(ref);
    } catch (err) {
      console.error('Erro ao finalizar timer:', err);
    } finally {
      setLoading(false);
    }
  }, [user, firestore]);

  // Finaliza timer e persiste o registro de tempo antes de remover o doc ativo
  const stopTimerAndSave = useCallback(async (task: Task, comment?: string) => {
    if (!user || !firestore || !activeTimer || activeTimer.taskId !== task.id) {
      return null;
    }

    setLoading(true);
    const timerRef = doc(firestore, 'users', user.uid, 'active_task_timer', 'current');

    try {
      const endedAt =
        activeTimer.isPaused && activeTimer.pausedAt
          ? activeTimer.pausedAt
          : new Date().toISOString();
      const endTime = new Date(endedAt);
      const duration = Math.max(
        0,
        Math.floor((endTime.getTime() - new Date(activeTimer.startedAt).getTime()) / 1000)
      );

      const entry: TimesheetEntry = {
        taskId: task.id,
        taskTitle: task.content,
        projectId: task.projectId,
        goalId: task.linkedGoalId,
        milestoneId: task.linkedMilestoneId,
        userId: user.uid,
        startedAt: activeTimer.startedAt,
        endedAt,
        duration,
        createdAt: new Date().toISOString(),
        comment: comment || undefined,
      };

      const timesheetsRef = collection(firestore, 'users', user.uid, 'timesheets');
      await addDoc(timesheetsRef, entry);
      await deleteDoc(timerRef);

      return entry;
    } catch (err) {
      console.error('Falha ao salvar timesheet:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, firestore, activeTimer]);

  return {
    activeTimer,
    loading,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    stopTimerAndSave,
  };
}
