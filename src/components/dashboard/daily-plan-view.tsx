'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { projects } from '@/lib/data';
import type { Task, UserStats, Goal } from '@/lib/types';
import { Calendar, Clock, PlusCircle, Sparkles, User, AlertTriangle, Loader2, Trash2, UserCheck, Target, Pencil, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, formatValue } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollection, useUser, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, doc, runTransaction, writeBatch, type DocumentData, type DocumentReference, type DocumentSnapshot } from 'firebase/firestore';
import { TaskForm } from './task-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';
import { HelpButton } from '../ui/help-button';
import { helpContent } from '@/lib/help-content';


export function DailyPlanView() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'));
  }, [firestore, user]);
  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  const goalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [firestore, user]);
  const { data: goals, isLoading: areGoalsLoading } = useCollection<Goal>(goalsQuery);
  
  const isLoading = isUserLoading || areTasksLoading || areGoalsLoading;

  const today = new Date();
  // Usa data local (não UTC) para evitar desfasagem em fusos negativos (ex: Brasil UTC-3)
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  const todaysTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter(task => task.scheduledDate && task.scheduledDate.startsWith(todayStr))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.specificTime && b.specificTime) return a.specificTime.localeCompare(b.specificTime);
        if (a.specificTime) return -1;
        if (b.specificTime) return 1;
        return (a.order || 0) - (b.order || 0);
      });
  }, [tasks, todayStr]);

  const groupedTasks = useMemo(() => {
    const timeOfDayOrder: { [key: string]: number } = { 'Manhã': 1, 'Tarde': 2, 'Noite': 3 };
    return todaysTasks.reduce((acc, task) => {
      const time = task.scheduledTime || 'Tarde';
      if (!acc[time]) {
        acc[time] = [];
      }
      acc[time].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [todaysTasks]);

  const sortedTimeOfDay = Object.keys(groupedTasks).sort((a, b) => {
    const timeOfDayOrder: { [key: string]: number } = { 'Manhã': 1, 'Tarde': 2, 'Noite': 3 };
    return (timeOfDayOrder[a] || 99) - (timeOfDayOrder[b] || 99);
  });
  
  const totalPlannedMinutes = useMemo(() => {
    return todaysTasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0);
  }, [todaysTasks]);
  
  const totalPlannedHours = (totalPlannedMinutes / 60).toFixed(1);
  const isOverplanned = totalPlannedMinutes > 8 * 60;

  const handleOpenEditDialog = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };
  
  const handleOpenCreateDialog = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const handleToggleComplete = async (task: Task) => {
    if (!firestore || !user) return;

    const newStatus = !task.completed;
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', task.id);
    const userStatsRef = doc(firestore, 'users', user.uid, 'user_stats', 'data');
    const xpAmount = task.isMIT ? 150 : 50;

    try {
      const { goal, goalUpdateValue } = await runTransaction(firestore, async (transaction) => {
        // --- 1. ALL READS FIRST ---
        let goalDoc: DocumentSnapshot<DocumentData> | null = null;
        let goalRef: DocumentReference<DocumentData> | null = null;
        
        if (task.linkedGoalId && task.goalIncrementValue && task.goalIncrementValue > 0) {
            goalRef = doc(firestore, 'users', user.uid, 'goals', task.linkedGoalId);
            goalDoc = await transaction.get(goalRef);
        }
        
        const taskDoc = await transaction.get(taskRef);
        if (!taskDoc.exists()) {
          throw new Error("Tarefa não encontrada.");
        }
        const userStatsDoc = await transaction.get(userStatsRef);

        // --- 2. ALL LOGIC & CALCULATIONS ---
        const xpChange = newStatus ? xpAmount : -xpAmount;
        let goalToReturn: Goal | null = null;
        let finalGoalUpdateValue = 0;

        // --- 3. ALL WRITES LAST ---

        // Update User Stats
        if (!userStatsDoc.exists()) {
          transaction.set(userStatsRef, {
            userId: user.uid,
            level: 1,
            totalXP: newStatus ? xpChange : 0,
            currentStreak: 1,
            longestStreak: 1,
            tasksCompleted: newStatus ? 1 : 0,
            focusSessions: 0,
            achievementsUnlocked: [],
          });
        } else {
          const oldStats = userStatsDoc.data() as UserStats;
          const newTotalXP = (oldStats.totalXP || 0) + xpChange;
          const newLevel = Math.floor(newTotalXP / 1000) + 1;
          transaction.update(userStatsRef, {
            totalXP: newTotalXP,
            level: newLevel,
            tasksCompleted: (oldStats.tasksCompleted || 0) + (newStatus ? 1 : -1),
          });
          if (newStatus && newLevel > (oldStats.level || 0)) {
             toast({ title: `Você subiu de nível!`, description: `Parabéns! Você alcançou o Nível ${newLevel}.` });
          }
        }

        // Update Task
        transaction.update(taskRef, {
          completed: newStatus,
          completedAt: newStatus ? new Date().toISOString() : null,
        });

        // Update Goal if it was read
        if (goalRef && goalDoc && goalDoc.exists()) {
            goalToReturn = goalDoc.data() as Goal;
            finalGoalUpdateValue = task.goalIncrementValue!;
            const valueChange = newStatus ? finalGoalUpdateValue : -finalGoalUpdateValue;
            const newGoalValue = (goalToReturn.currentValue || 0) + valueChange;
            const newProgress = (newGoalValue / goalToReturn.targetValue) * 100;

            const goalUpdateData: Partial<Goal> = {
                currentValue: newGoalValue,
                progress: Math.min(100, Math.round(newProgress)),
                status: newProgress >= 100 ? 'completed' : goalToReturn.status,
            };
            
            if ('targetRevenue' in goalToReturn) {
              goalUpdateData.currentRevenue = newGoalValue;
            }
            transaction.update(goalRef, goalUpdateData);
        }
        
        return { goal: goalToReturn, goalUpdateValue: finalGoalUpdateValue };
      });

      // Post-transaction toasts
      if (newStatus) {
        if (goal && goalUpdateValue > 0) {
          toast({ title: `Tarefa concluída! (+${xpAmount} XP)`, description: `Meta "${goal.title}" avançou: +${formatValue(goalUpdateValue, goal.unit)}` });
        } else {
          toast({ title: "Tarefa concluída!", description: `+${xpAmount} XP para você!` });
        }
      } else {
         if (goal && goalUpdateValue > 0) {
          toast({ title: `Tarefa reaberta! (-${xpAmount} XP)`, description: `Contribuição de ${formatValue(goalUpdateValue, goal.unit)} removida da meta "${goal.title}".`, variant: "default" });
        } else {
          toast({ title: "Tarefa reaberta!", description: `-${xpAmount} XP.`, variant: "default" });
        }
      }

    } catch (err) {
      console.error("Falha na transação ao completar tarefa:", err);
      toast({ variant: "destructive", title: "Erro ao atualizar progresso", description: "Não foi possível salvar seu progresso. Por favor, tente novamente." });
    }
  };


  const handleDeleteTask = (taskId: string) => {
    if (!firestore || !user) return;
    deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', taskId));
    toast({ title: 'Tarefa excluída', description: 'Sua tarefa foi removida do plano.' });
  };
  
  const getSafeTimestamp = (date: any): number => {
    if (!date) return 0;
    if (date.toDate) return date.toDate().getTime();
    return new Date(date).getTime();
  };

  const handleReorder = async (taskToMove: Task, direction: 'up' | 'down') => {
    if (!firestore || !user || !todaysTasks) return;

    const reorderableTasks = todaysTasks.filter(t => !t.completed && !t.specificTime && t.scheduledTime === taskToMove.scheduledTime);
    
    const currentIndex = reorderableTasks.findIndex(t => t.id === taskToMove.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= reorderableTasks.length) {
        return; 
    }

    const taskToSwapWith = reorderableTasks[targetIndex];

    const batch = writeBatch(firestore);
    
    const taskToMoveRef = doc(firestore, 'users', user.uid, 'tasks', taskToMove.id);
    const taskToSwapWithRef = doc(firestore, 'users', user.uid, 'tasks', taskToSwapWith.id);
    
    const order1 = taskToMove.order || getSafeTimestamp(taskToMove.createdAt);
    const order2 = taskToSwapWith.order || getSafeTimestamp(taskToSwapWith.createdAt);

    batch.update(taskToMoveRef, { order: order2 });
    batch.update(taskToSwapWithRef, { order: order1 });

    try {
        await batch.commit();
        toast({ title: "Tarefa reordenada!" });
    } catch (error) {
        console.error("Error reordering tasks:", error);
        toast({ variant: 'destructive', title: "Erro ao reordenar" });
    }
  };


  return (
    <Card>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="p-6 flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Plano do Dia</h1>
                 <HelpButton title="Como usar o Plano do Dia" content={helpContent.dailyPlan} />
            </div>
            <div className="flex items-center gap-4">
                {isOverplanned && (
                    <Badge variant="destructive" className="hidden md:flex">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {totalPlannedHours}h - Dia sobrecarregado!
                    </Badge>
                )}
                <Button onClick={handleOpenCreateDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Tarefa
                </Button>
            </div>
        </div>

        <CardContent>
            {isLoading && (
                <div className="flex items-center justify-center py-16">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {!isLoading && todaysTasks.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhuma tarefa para hoje</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Adicione tarefas para começar a planejar seu dia.</p>
                    <Button onClick={handleOpenCreateDialog} className="mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Tarefa
                    </Button>
                </div>
            )}

            {!isLoading && todaysTasks.length > 0 && (
              <div className="space-y-8">
                  {sortedTimeOfDay.map(timeOfDay => (
                      groupedTasks[timeOfDay] && groupedTasks[timeOfDay].length > 0 && (
                          <div key={timeOfDay}>
                              <h2 className="text-xl font-semibold mb-4 capitalize">{timeOfDay}</h2>
                              <div className="space-y-4">
                                  {groupedTasks[timeOfDay].map((task) => {
                                      const project = projects.find(p => p.id === task.projectId);
                                      const goal = goals?.find(g => g.id === task.linkedGoalId);

                                      const reorderableTasks = groupedTasks[timeOfDay].filter(t => !t.completed && !t.specificTime);
                                      const reorderableIndex = reorderableTasks.findIndex(t => t.id === task.id);
                                      const isFirstInGroup = reorderableIndex === 0;
                                      const isLastInGroup = reorderableIndex === reorderableTasks.length - 1;

                                      return (
                                          <Card 
                                            key={task.id} 
                                            className={cn(
                                                "transition-all group",
                                                task.completed ? "opacity-40" : "",
                                                task.delegatedTo ? 'opacity-60 border-dashed' : 'hover:border-primary/50',
                                            )}
                                          >
                                              <CardContent className="p-4 flex items-start gap-4">
                                                  <Checkbox 
                                                    id={`task-${task.id}`} 
                                                    checked={task.completed} 
                                                    onCheckedChange={() => handleToggleComplete(task)}
                                                    className="mt-1" 
                                                  />
                                                  <div className="flex-1 grid gap-2 cursor-pointer" onClick={() => handleOpenEditDialog(task)}>
                                                      <div className={cn("font-medium flex items-start gap-2", task.completed && "line-through text-muted-foreground")}>
                                                        {task.isMIT && <Sparkles className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />}
                                                        <span>{task.content}</span>
                                                      </div>
                                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                           {project && (
                                                               <div className="flex items-center gap-2">
                                                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }}></div>
                                                                  <span>{project.name}</span>
                                                               </div>
                                                           )}
                                                           <div className="flex items-center gap-2">
                                                               <Clock className="h-3 w-3" />
                                                               <span>{task.estimatedMinutes} min</span>
                                                           </div>
                                                           {task.specificTime && (
                                                              <div className="flex items-center gap-1 font-semibold text-primary">
                                                                  <Clock className="h-3 w-3" />
                                                                  <span>{task.specificTime}</span>
                                                              </div>
                                                           )}
                                                           {task.delegatedTo && (
                                                               <div className="flex items-center gap-2 font-medium">
                                                                   <UserCheck className="h-3 w-3 text-primary" />
                                                                   <span className="text-primary">Delegado para: {task.delegatedTo}</span>
                                                               </div>
                                                           )}
                                                           {goal && (
                                                               <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="flex items-center gap-1.5 py-0.5 px-1.5 border-primary/20 text-primary/80">
                                                                        <Target className="h-3 w-3" />
                                                                        <span>{goal.title}</span>
                                                                    </Badge>
                                                                    {task.goalIncrementValue && task.goalIncrementValue > 0 && (
                                                                        <Badge variant="secondary" className="flex items-center gap-1 py-0.5 px-1.5">
                                                                            <TrendingUp className="h-3 w-3" />
                                                                            +{formatValue(task.goalIncrementValue, goal.unit)}
                                                                        </Badge>
                                                                    )}
                                                               </div>
                                                           )}
                                                      </div>
                                                  </div>
                                                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!task.specificTime && !task.completed && (
                                                      <>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isFirstInGroup} onClick={(e) => { e.stopPropagation(); handleReorder(task, 'up'); }}>
                                                          <ArrowUp className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLastInGroup} onClick={(e) => { e.stopPropagation(); handleReorder(task, 'down'); }}>
                                                          <ArrowDown className="h-4 w-4" />
                                                        </Button>
                                                      </>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(task); }}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                                              <Trash2 className="h-4 w-4" />
                                                          </Button>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                              <AlertDialogTitle>Tem certeza que deseja excluir esta tarefa?</AlertDialogTitle>
                                                              <AlertDialogDescription>
                                                                  "{task.content}" será permanentemente removida. Esta ação não pode ser desfeita.
                                                              </AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                              <AlertDialogAction onClick={() => handleDeleteTask(task.id)}>Excluir</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                    </AlertDialog>
                                                  </div>
                                              </CardContent>
                                          </Card>
                                      );
                                  })}
                              </div>
                          </div>
                      )
                  ))}
              </div>
            )}
        </CardContent>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}</DialogTitle>
            </DialogHeader>
            <TaskForm 
                key={editingTask?.id || 'new'}
                task={editingTask} 
                goals={goals || []} 
                closeDialog={() => setIsFormOpen(false)} 
            />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
