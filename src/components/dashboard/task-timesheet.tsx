"use client";

import { useState, useEffect } from "react";
import { Button } from '@/components/ui/button';
import { Play, Pause, StopCircle } from "lucide-react";
import type { Task } from "@/lib/types";
import { useTaskTimers } from '@/hooks/use-task-timers';

interface TaskTimesheetProps {
  task: Task;
}

export function TaskTimesheet({ task }: TaskTimesheetProps) {
  const [comment, setComment] = useState<string>('');
  const { activeTimer, startTimer, pauseTimer, resumeTimer, stopTimerAndSave, loading } = useTaskTimers();
  const isActive = activeTimer?.taskId === task.id && activeTimer.isActive;
  const isPaused = activeTimer?.taskId === task.id && activeTimer.isPaused;
  const [elapsed, setElapsed] = useState<number>(0);

  // Atualiza o timer localmente baseado no startedAt
  useEffect(() => {
    if (!activeTimer || activeTimer.taskId !== task.id || !activeTimer.startedAt) {
      setElapsed(0);
      return;
    }
    let interval: NodeJS.Timeout | null = null;
    const calcElapsed = () => {
      const start = new Date(activeTimer.startedAt).getTime();
      if (activeTimer.isPaused && activeTimer.pausedAt) {
        const paused = new Date(activeTimer.pausedAt).getTime();
        setElapsed(Math.floor((paused - start) / 1000));
        return;
      }
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };
    calcElapsed();
    if (isActive) {
      interval = setInterval(calcElapsed, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeTimer, isActive, task.id]);


  // Finaliza timer e salva timesheet
  const handleStop = async () => {
    if (!activeTimer || activeTimer.taskId !== task.id) return;

    const savedEntry = await stopTimerAndSave(task, comment);
    if (!savedEntry) {
      return;
    }

    setElapsed(0);
    setComment('');
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {isActive ? (
        <Button variant="outline" size="icon" onClick={pauseTimer} title="Pausar registro de tempo" disabled={loading}>
          <Pause className="w-4 h-4" />
        </Button>
      ) : isPaused ? (
        <Button variant="outline" size="icon" onClick={resumeTimer} title="Retomar registro de tempo" disabled={loading}>
          <Play className="w-4 h-4" />
        </Button>
      ) : (
        <Button variant="outline" size="icon" onClick={() => startTimer(task)} title="Iniciar registro de tempo" disabled={loading}>
          <Play className="w-4 h-4" />
        </Button>
      )}
      {(isActive || isPaused) && (
        <Button variant="outline" size="icon" onClick={handleStop} title="Finalizar e salvar registro" disabled={loading}>
          <StopCircle className="w-4 h-4" />
        </Button>
      )}
      <span className="text-xs text-muted-foreground ml-2">
        {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")} min
      </span>
      <input
        aria-label="Observação"
        placeholder="Adicionar observação (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="ml-3 p-1 text-xs border rounded w-48"
        disabled={loading}
      />
    </div>
  );
}
