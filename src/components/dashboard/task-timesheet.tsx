"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Play, Pause, StopCircle } from "lucide-react";
import { useUser } from "@/firebase/provider";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import type { Task, TimesheetEntry } from "@/lib/types";

interface TaskTimesheetProps {
  task: Task;
}

export function TaskTimesheet({ task }: TaskTimesheetProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState<number>(0); // em segundos
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(new Date());
    const id = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    setIntervalId(id);
  };

  const handlePause = () => {
    setIsRunning(false);
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    if (!user || !startTime || !firestore) return;
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const entry: TimesheetEntry = {
      taskId: task.id,
      taskTitle: task.content,
      projectId: task.projectId,
      goalId: task.linkedGoalId,
      milestoneId: task.linkedMilestoneId,
      startedAt: startTime.toISOString(),
      endedAt: endTime.toISOString(),
      duration,
      createdAt: new Date().toISOString(),
    };
    try {
      const ref = collection(firestore, "users", user.uid, "timesheets");
      await addDocumentNonBlocking(ref, entry);
    } catch (err) {
      console.error('Falha ao salvar timesheet:', err);
    }
    setElapsed(0);
    setStartTime(null);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {isRunning ? (
        <Button variant="outline" size="icon" onClick={handlePause} title="Pausar registro de tempo">
          <Pause className="w-4 h-4" />
        </Button>
      ) : (
        <Button variant="outline" size="icon" onClick={handleStart} title="Iniciar registro de tempo">
          <Play className="w-4 h-4" />
        </Button>
      )}
      <Button variant="outline" size="icon" onClick={handleStop} title="Finalizar e salvar registro">
        <StopCircle className="w-4 h-4" />
      </Button>
      <span className="text-xs text-muted-foreground ml-2">
        {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")} min
      </span>
    </div>
  );
}
