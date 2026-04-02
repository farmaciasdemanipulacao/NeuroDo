'use client';

import React, { createContext, useState, useMemo, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import type { UserPreferences } from '@/lib/types';

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
  streak: number;
  setStreak: (streak: number) => void;
  
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
  const [energyLevelState, setEnergyLevelState] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [hasLoadedInitialPreferences, setHasLoadedInitialPreferences] = useState(false);

  // --- Firebase integration for preferences persistence ---
  const { user } = useUser();
  const firestore = useFirestore();

  const preferencesRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'preferences', 'data');
  }, [user, firestore]);

  const { data: preferences } = useDoc<UserPreferences>(preferencesRef);

  // Load energyLevel from Firestore once on first load
  useEffect(() => {
    if (!hasLoadedInitialPreferences && preferences !== undefined) {
      if (preferences?.energyLevel != null) {
        setEnergyLevelState(preferences.energyLevel);
      }
      setHasLoadedInitialPreferences(true);
    }
  }, [preferences, hasLoadedInitialPreferences]);

  // Persist energyLevel to Firestore when it changes
  const setEnergyLevel = useCallback((level: number | null) => {
    setEnergyLevelState(level);
    if (user && firestore && level !== null) {
      const prefsDocRef = doc(firestore, 'users', user.uid, 'preferences', 'data');
      setDocumentNonBlocking(
        prefsDocRef,
        { userId: user.uid, energyLevel: level, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
  }, [user, firestore]);

  const energyLevel = energyLevelState;

  // --- Timer State Management ---
  const [hasTimerBeenStarted, setHasTimerBeenStarted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('work');
  const [workMode, setWorkMode] = useState<WorkMode>('pomodoro');
  const [cycles, setCycles] = useState(0);
  const [duration, setDuration] = useState(WORK_DURATIONS[workMode] * 60);
  const [secondsLeft, setSecondsLeft] = useState(duration);
  
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
      streak,
      setStreak,
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
    [energyLevel, setEnergyLevel, streak, hasTimerBeenStarted, timerMode, workMode, secondsLeft, duration, isActive, cycles, toggleTimer, resetTimer, skipToNextMode]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

