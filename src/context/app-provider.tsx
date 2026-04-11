'use client';

import React, { createContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { usePreferences } from '@/hooks/use-preferences';

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
const BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

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
    });
  // secondsLeft/secondsLeftRef excluídos propositalmente — não queremos salvar a cada segundo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timerMode, workMode, cycles, duration, hasTimerBeenStarted]);
  
  // --- Timer Controls ---

  const resetTimer = useCallback((newWorkModeParam?: WorkMode) => {
    if (!hasTimerBeenStarted) setHasTimerBeenStarted(true);

    const targetWorkMode = newWorkModeParam || getWorkModeFromEnergy(energyLevel);
    
    setIsActive(false);
    setTimerMode('work');
    setWorkMode(targetWorkMode);
    setCycles(0);

    const newDuration = WORK_DURATIONS[targetWorkMode] * 60;
    setDuration(newDuration);
    setSecondsLeft(newDuration);
    secondsLeftRef.current = newDuration;
    clearTimerState();
  }, [energyLevel, hasTimerBeenStarted]);

  const toggleTimer = useCallback(() => {
    if (!hasTimerBeenStarted) setHasTimerBeenStarted(true);
    // If timer is finished, reset it to a new work session before starting
    if (secondsLeft === 0) {
        resetTimer();
    }
    setIsActive(prev => !prev);
  }, [hasTimerBeenStarted, secondsLeft, resetTimer]);

  const skipToNextMode = useCallback(() => {
    if (timerMode === 'work') {
        const newCycles = cycles + 1;
        setCycles(newCycles);
        const isLongBreak = newCycles % 4 === 0;
        const newMode: TimerMode = isLongBreak ? 'longBreak' : 'break';
        setTimerMode(newMode);
        const newDuration = (isLongBreak ? LONG_BREAK_MINUTES : BREAK_MINUTES) * 60;
        setDuration(newDuration);
        setSecondsLeft(newDuration);
        setIsActive(true); // Auto-start the break
    } else { // on a break
        resetTimer();
    }
  }, [timerMode, cycles, resetTimer]);


  // --- Timer Logic Effect ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(s => s - 1);
      }, 1000);
    } else if (isActive && secondsLeft === 0) {
        skipToNextMode();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, skipToNextMode]);
  
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
      // Timer controls
      toggleTimer,
      resetTimer,
      skipToNextMode
    }),
    [energyLevel, hasTimerBeenStarted, timerMode, workMode, secondsLeft, duration, isActive, cycles, toggleTimer, resetTimer, skipToNextMode]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
