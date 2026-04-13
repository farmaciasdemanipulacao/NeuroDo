import { useEffect, useState } from 'react';
import { useTaskTimers } from '@/hooks/use-task-timers';
import { useDashboardData } from '@/context/dashboard-data-provider';
import { Pause, Play, StopCircle, Timer } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

export function FloatingTaskTimer() {
  const { activeTimer, pauseTimer, resumeTimer, stopTimer, loading } = useTaskTimers();
  const { tasks, projects, goals } = useDashboardData();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer || !activeTimer.startedAt) {
      setElapsed(0);
      return;
    }
    let interval: NodeJS.Timeout | null = null;
    const calcElapsed = () => {
      const start = new Date(activeTimer.startedAt).getTime();
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };
    calcElapsed();
    if (activeTimer.isActive) {
      interval = setInterval(calcElapsed, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeTimer]);

  if (!activeTimer) return null;
  const task = tasks?.find(t => t.id === activeTimer.taskId);
  if (!task) return null;
  const project = projects?.find(p => p.id === task.projectId);
  const goal = goals?.find(g => g.id === task.linkedGoalId);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full shadow-lg w-16 h-16 flex flex-col items-center justify-center">
              <Timer className="h-7 w-7 mb-1" />
              <span className="text-xs font-bold">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="w-72">
            <div className="flex flex-col gap-2">
              <div className="font-semibold text-base">{task.content}</div>
              {project && <div className="text-xs text-muted-foreground">Projeto: {project.name}</div>}
              {goal && <div className="text-xs text-muted-foreground">Meta: {goal.title}</div>}
              <div className="flex items-center gap-2 mt-2">
                {activeTimer.isActive ? (
                  <Button variant="outline" size="icon" onClick={pauseTimer} disabled={loading}>
                    <Pause className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" onClick={resumeTimer} disabled={loading}>
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={stopTimer} disabled={loading}>
                  <StopCircle className="w-4 h-4" />
                </Button>
                <span className="ml-2 text-xs">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')} min</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
