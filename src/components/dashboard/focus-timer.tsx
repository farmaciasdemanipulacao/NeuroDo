'use client';

import { useApp } from '@/hooks/use-app';
import { workModeLabels } from '@/context/app-provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, SkipForward, Zap, Link2, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSharedTasks } from '@/context/dashboard-data-provider';
import { useMemo } from 'react';


export function FocusTimer() {
  const { 
    energyLevel, 
    workMode,
    secondsLeft,
    duration,
    isActive,
    isFinished,
    linkedTask,
    toggleTimer,
    resetTimer,
    skipToNextMode,
    setLinkedTask,
  } = useApp();
  const { data: tasks, isLoading: areTasksLoading } = useSharedTasks();
  
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = duration > 0 ? ((duration - secondsLeft) / duration) * 100 : 0;
  
  const currentWorkModeLabel = workModeLabels[workMode];
  const todayStr = new Date().toISOString().split('T')[0];

  const selectableTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((task) => !task.completed && task.scheduledDate === todayStr)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tasks, todayStr]);

  const handleTaskChange = (taskId: string) => {
    if (taskId === 'none') {
      setLinkedTask(null);
      return;
    }
    const task = selectableTasks.find((item) => item.id === taskId);
    if (!task) return;
    setLinkedTask({
      id: task.id,
      title: task.content,
      projectId: task.projectId,
      goalId: task.linkedGoalId,
      milestoneId: task.linkedMilestoneId,
    });
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Timer de Foco</CardTitle>
        <CardDescription className="text-center">
          Atualmente em <span className="font-semibold text-primary">Modo Foco: {currentWorkModeLabel}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-8">
        <div className="w-full space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Vincular sessão a uma tarefa</p>
          <Select
            value={linkedTask?.id ?? 'none'}
            onValueChange={handleTaskChange}
            disabled={isActive || areTasksLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma tarefa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem vínculo</SelectItem>
              {selectableTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>{task.content}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {linkedTask ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5" />
              <span className="truncate">Vinculado: {linkedTask.title}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Dica: vincule uma tarefa para gerar dados estratégicos por projeto e meta.</p>
          )}
        </div>

        <div className="relative h-64 w-64">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle className="stroke-current text-muted" strokeWidth="4" cx="50" cy="50" r="45" fill="transparent" />
            <circle className="stroke-current text-primary transition-all duration-1000 ease-linear" strokeWidth="4" cx="50" cy="50" r="45" fill="transparent" strokeDasharray="282.74" strokeDashoffset={282.74 - (progress / 100) * 282.74} transform="rotate(-90 50 50)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold tracking-tighter">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            {isFinished && (
              <Badge className="mt-2 bg-green-500/20 text-green-300 border border-green-500/40">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Ciclo concluído
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => resetTimer()}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button size="lg" className="w-32" onClick={toggleTimer}>
            {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
            {isActive ? 'Pausar' : 'Iniciar'}
          </Button>
          <Button variant="outline" size="icon" onClick={skipToNextMode}>
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>Duração ajustada pela sua energia:</span>
            <Badge variant="outline">{energyLevel ?? "N/A"}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Faça o check-in de energia no cabeçalho para alterar.</p>
      </CardFooter>
    </Card>
  );
}
