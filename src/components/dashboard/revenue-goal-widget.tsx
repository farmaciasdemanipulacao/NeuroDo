'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Goal, Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Target } from 'lucide-react';
import { projects } from '@/lib/data';
import { Badge } from '../ui/badge';
import { formatValue } from '@/lib/utils';

export function RevenueGoalWidget() {
  const { user } = useUser();
  const firestore = useFirestore();

  const allGoalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals, isLoading: areGoalsLoading } = useCollection<Goal>(allGoalsQuery);
  
  const allTasksQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'));
  }, [user, firestore]);
  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(allTasksQuery);


  const isLoading = areGoalsLoading || areTasksLoading;

  const { mainGoal, projectGoals, projectedValue, projectedProgress, pendingTasksCount } = useMemo(() => {
    if (!goals) return { mainGoal: null, projectGoals: [], projectedValue: 0, projectedProgress: 0, pendingTasksCount: 0 };
    
    const main = goals.find(g => g.type === 'yearly' && (g.title.includes('R$30.000') || g.targetValue === 30000 || g.targetRevenue === 30000));
    if (!main) return { mainGoal: null, projectGoals: [], projectedValue: 0, projectedProgress: 0, pendingTasksCount: 0 };
    
    const subGoals = goals.filter(g => g.projectId && (g.targetRevenue || g.unit === 'currency'));
    
    const pendingTasks = tasks?.filter(t => 
      !t.completed &&
      t.linkedGoalId === main.id &&
      t.goalIncrementValue
    ) || [];

    const pendingTasksCount = pendingTasks.length;
    const projectedValue = (main.currentValue || 0) + pendingTasks.reduce((sum, t) => sum + (t.goalIncrementValue || 0), 0);
    const projectedProgress = main.targetValue > 0 ? (projectedValue / main.targetValue) * 100 : 0;


    return { mainGoal: main, projectGoals: subGoals, projectedValue, projectedProgress, pendingTasksCount };
  }, [goals, tasks]);


  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[180px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!mainGoal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Meta de Receita
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Meta de receita principal não encontrada. Crie uma meta anual com "R$30.000" no título.
          </p>
        </CardContent>
      </Card>
    );
  }

  const current = mainGoal.currentValue || 0;
  const target = mainGoal.targetValue;
  const progress = target > 0 ? (current / target) * 100 : 0;
  
  return (
    <Card className="border-primary/50 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {mainGoal.title}
        </CardTitle>
        <CardDescription>
          Progresso para a meta de faturamento principal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
            <div className="flex justify-between items-baseline">
                 <span className="font-bold text-2xl text-primary">{formatValue(current, mainGoal.unit)}</span>
                 <span className="text-sm text-muted-foreground">/ {formatValue(target, mainGoal.unit)}</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="text-right font-bold text-sm text-primary">{progress.toFixed(1)}%</div>
        </div>

        {pendingTasksCount > 0 && (
          <div className="space-y-1 mt-4">
             <div className="flex justify-between text-xs text-muted-foreground">
              <span>Previsão ({pendingTasksCount} tasks pendentes)</span>
              <span className="font-medium">{formatValue(projectedValue, mainGoal.unit)}</span>
            </div>
            <Progress value={projectedProgress} className="h-2 opacity-50" />
          </div>
        )}

        {projectGoals && projectGoals.length > 0 && (
          <div className="space-y-2 pt-4 mt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground">
              Detalhamento por Projeto:
            </p>
            {projectGoals.map(goal => {
              const project = projects.find(p => p.id === goal.projectId);
              return (
                <div key={goal.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    {project && (
                       <Badge variant="outline" style={{color: project.color, borderColor: project.color}}>
                          {project.name}
                       </Badge>
                    )}
                    <span>{goal.title}</span>
                  </span>
                  <span className="font-medium">
                    {formatValue(goal.currentValue || 0, goal.unit)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
