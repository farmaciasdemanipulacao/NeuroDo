'use client';

import React, { createContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { usePreferences } from '@/hooks/use-preferences';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, increment } from 'firebase/firestore';

// --- Timer Persistence (localStorage) ---

const TIMER_STORAGE_KEY = 'neurodo_timer_state';


interface PersistedTimerState {
  isActive: boolean;
  startedAt: number | null; // timestamp (ms) em que o timer foi ligado a última vez
  secondsLeftAtStart: number; // segundos restantes quando startedAt foi salvo
  timerMode: TimerMode;
  workMode: WorkMode;
  cycles: number;
  duration: number;
  hasTimerBeenStarted: boolean;
  isFinished: boolean;
  sessionStartedAt: string | null;
}



function loadPersistedTimer(): PersistedTimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const s: PersistedTimerState = JSON.parse(raw);
    // Calcula tempo decorrido desde a última vez que estava ativo
    if (s.isActive && s.startedAt) {
      const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
      s.secondsLeftAtStart = Math.max(0, s.secondsLeftAtStart - elapsed);
      // Se o tempo chegou a 0 enquanto a página estava fechada, pausa no 0
      if (s.secondsLeftAtStart === 0) {
        s.isActive = false;
        s.isFinished = true;
      }
    }
    return s;
  } catch {
    return null;
  }
}

function saveTimerState(state: PersistedTimerState) {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function clearTimerState() {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch {}
}

// Timer configuration
const WORK_DURATIONS = {
  sprint: 15,
  pomodoro: 25,
  deep: 50,
};

export type TimerMode = 'work' | 'break' | 'longBreak';
export type WorkMode = keyof typeof WORK_DURATIONS;

export const getWorkModeFromEnergy = (energy: number | null): WorkMode => {
    if (energy === null) return 'pomodoro'; // Default
    if (energy <= 3) return 'sprint';
    if (energy <= 6) return 'pomodoro';
    return 'deep';
};

export const workModeLabels: Record<WorkMode, string> = {
    sprint: "Sprint (15 min)",
    pomodoro: "Pomodoro (25 min)",
    deep: "Foco Profundo (50 min)",
};

// --- App Context Type ---

type AppContextType = {
  energyLevel: number | null;
  setEnergyLevel: (level: number | null) => void;

  // Timer State
  hasTimerBeenStarted: boolean;
  timerMode: TimerMode;
  workMode: WorkMode;
  secondsLeft: number;
  duration: number;
  isActive: boolean;
  cycles: number;
  isFinished: boolean;
  // linkedTask: LinkedTaskSnapshot | null;
  
  // Timer Controls
  toggleTimer: () => void;
  resetTimer: (newWorkMode?: WorkMode) => void;
  skipToNextMode: () => void;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);


// --- App Provider Component ---

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [energyLevel, _setEnergyLevel] = useState<number | null>(null);
  const { preferences, updatePreferences } = usePreferences();
  const { user } = useUser();
  const firestore = useFirestore();

  // Sincronia inicial: carrega energia salva no Firestore quando preferences chegar
  useEffect(() => {
    if (preferences && preferences.energyLevel !== undefined && energyLevel === null) {
      _setEnergyLevel(preferences.energyLevel);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  const setEnergyLevel = useCallback((level: number | null) => {
    _setEnergyLevel(level);
    updatePreferences({ energyLevel: level });
  }, [updatePreferences]);

  // --- Timer State — inicializado do localStorage ---
  const [persisted] = useState(() => loadPersistedTimer());

  const [hasTimerBeenStarted, setHasTimerBeenStarted] = useState(persisted?.hasTimerBeenStarted ?? false);
  const [isActive, setIsActive] = useState(persisted?.isActive ?? false);
  const [timerMode, setTimerMode] = useState<TimerMode>(persisted?.timerMode ?? 'work');
  const [workMode, setWorkMode] = useState<WorkMode>(persisted?.workMode ?? 'pomodoro');
  const [cycles, setCycles] = useState(persisted?.cycles ?? 0);
  const [duration, setDuration] = useState(persisted?.duration ?? WORK_DURATIONS['pomodoro'] * 60);
  const [isFinished, setIsFinished] = useState(persisted?.isFinished ?? false);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(persisted?.sessionStartedAt ?? null);
  const [secondsLeft, setSecondsLeft] = useState(
    persisted?.secondsLeftAtStart ?? persisted?.duration ?? WORK_DURATIONS['pomodoro'] * 60
  );

  // Ref para acessar secondsLeft atual nas saves sem closure stale
  const secondsLeftRef = useRef(secondsLeft);
  useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);

  // --- Persiste no localStorage quando estado relevante muda (NÃO a cada tick) ---
  useEffect(() => {
    if (!hasTimerBeenStarted) return;
    saveTimerState({
      isActive,
      startedAt: isActive ? Date.now() : null,
      secondsLeftAtStart: secondsLeftRef.current,
      timerMode,
      workMode,
      cycles,
      duration,
      hasTimerBeenStarted,
      isFinished,
      sessionStartedAt,
    });
  // secondsLeft/secondsLeftRef excluídos propositalmente — não queremos salvar a cada segundo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timerMode, workMode, cycles, duration, hasTimerBeenStarted, isFinished, sessionStartedAt]);

  const playCompletionSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const notes = [659.25, 880.0, 1046.5];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const noteStart = now + idx * 0.12;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + 0.18);
    });

    window.setTimeout(() => {
      void ctx.close();
    }, 700);
  }, []);

  const saveFocusSession = useCallback((completed: boolean, secondsRemaining: number) => {
    if (!user || !firestore || !sessionStartedAt) return;

    const nowIso = new Date().toISOString();
    const elapsedSeconds = Math.max(0, duration - secondsRemaining);
    const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    const sessionsRef = collection(firestore, 'users', user.uid, 'focus_sessions');
    addDocumentNonBlocking(sessionsRef, {
      userId: user.uid,
      workMode,
      durationMinutes: Math.round(duration / 60),
      actualMinutes,
      startedAt: sessionStartedAt,
      completedAt: nowIso,
      completed,
      energyLevel,
      createdAt: nowIso,
    });

    if (completed) {
      const userStatsRef = doc(firestore, 'users', user.uid, 'user_stats', 'data');
      updateDocumentNonBlocking(userStatsRef, {
        focusSessions: increment(1),
        updatedAt: nowIso,
      });
    }
  }, [user, firestore, sessionStartedAt, duration, workMode, energyLevel]);
  
  // --- Timer Controls ---

  const resetTimer = useCallback((newWorkModeParam?: WorkMode) => {
    const elapsedSeconds = Math.max(0, duration - secondsLeftRef.current);
    if (sessionStartedAt && elapsedSeconds > 0) {
      saveFocusSession(false, secondsLeftRef.current);
    }

    if (!hasTimerBeenStarted) setHasTimerBeenStarted(true);

    const targetWorkMode = newWorkModeParam || getWorkModeFromEnergy(energyLevel);
    
    setIsActive(false);
    setTimerMode('work');
    setWorkMode(targetWorkMode);
    setIsFinished(false);

    const newDuration = WORK_DURATIONS[targetWorkMode] * 60;
    setDuration(newDuration);
    setSecondsLeft(newDuration);
    secondsLeftRef.current = newDuration;
    setSessionStartedAt(null);
    clearTimerState();
  }, [duration, sessionStartedAt, hasTimerBeenStarted, energyLevel, saveFocusSession]);

  const toggleTimer = useCallback(() => {
    if (!hasTimerBeenStarted) setHasTimerBeenStarted(true);
    // If timer is finished, reset it to a new work session before starting
    if (secondsLeft === 0) {
        resetTimer();
    }
    setIsActive(prev => {
      const next = !prev;
      if (next) {
        setIsFinished(false);
        if (!sessionStartedAt) {
          setSessionStartedAt(new Date().toISOString());
        }
      }
      return next;
    });
  }, [hasTimerBeenStarted, secondsLeft, resetTimer, sessionStartedAt]);

  const skipToNextMode = useCallback(() => {
    resetTimer();
  }, [resetTimer]);


  // --- Timer Logic Effect ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(s => s - 1);
      }, 1000);
    } else if (isActive && secondsLeft === 0) {
      setIsActive(false);
      setIsFinished(true);
      setCycles(prev => prev + 1);
      saveFocusSession(true, 0);
      setSessionStartedAt(null);
      playCompletionSound();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, playCompletionSound, saveFocusSession]);
  
  // Auto-adjust work mode based on energy
  useEffect(() => {
    const newWorkMode = getWorkModeFromEnergy(energyLevel);
    if (!isActive && timerMode === 'work' && newWorkMode !== workMode) {
      resetTimer(newWorkMode);
    }
  }, [energyLevel, isActive, timerMode, workMode, resetTimer]);


  const value = useMemo(
    () => ({
      energyLevel,
      setEnergyLevel,
      // Timer state
      hasTimerBeenStarted,
      timerMode,
      workMode,
      secondsLeft,
      duration,
      isActive,
      cycles,
      isFinished,
      // linkedTask,
      // Timer controls
      toggleTimer,
      resetTimer,
      skipToNextMode,
    }),
    [
      energyLevel,
      hasTimerBeenStarted,
      timerMode,
      workMode,
      secondsLeft,
      duration,
      isActive,
      cycles,
      isFinished,
      toggleTimer,
      resetTimer,
      skipToNextMode,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
