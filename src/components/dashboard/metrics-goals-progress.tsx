'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, CheckCircle2, Clock } from 'lucide-react';
import { useSharedGoals } from '@/context/dashboard-data-provider';
import { formatValue } from '@/lib/utils';
import type { Goal } from '@/lib/types';

const GOAL_TYPE_LABEL: Record<string, string> = {
  yearly: 'Anual',
  quarterly: 'Trimestral',
  monthly: 'Mensal',
  weekly: 'Semanal',
};

const GOAL_TYPE_ORDER: Record<string, number> = {
  yearly: 0,
  quarterly: 1,
  monthly: 2,
  weekly: 3,
};

export function MetricsGoalsProgress() {
  const { data: goals, isLoading } = useSharedGoals();

  const { active, completed, totalGoals } = useMemo(() => {
    if (!goals) return { active: [], completed: [], totalGoals: 0 };

    const sorted = [...goals].sort(
      (a, b) => (GOAL_TYPE_ORDER[a.type] ?? 99) - (GOAL_TYPE_ORDER[b.type] ?? 99)
    );

    const active = sorted.filter(g => g.status !== 'completed');
    const completed = sorted.filter(g => g.status === 'completed');

    return { active, completed, totalGoals: goals.length };
  }, [goals]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Metas Ativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas Ativas
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando...' : `${active.length} de ${totalGoals} metas`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : active.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground gap-2">
              <Target className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma meta ativa. Crie metas na Pirâmide de Metas.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {active.slice(0, 6).map(goal => {
                const progress = goal.targetValue > 0
                  ? Math.min(100, (goal.currentValue / goal.targetValue) * 100)
                  : goal.progress ?? 0;
                return (
                  <li key={goal.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatValue(goal.currentValue, goal.unit)} / {formatValue(goal.targetValue, goal.unit)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {GOAL_TYPE_LABEL[goal.type] ?? goal.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium w-10 text-right">{progress.toFixed(0)}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Metas Concluídas + Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Metas Concluídas
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando...' : `${completed.length} meta${completed.length !== 1 ? 's' : ''} concluída${completed.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : completed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground gap-2">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma meta concluída ainda. Continue progredindo!</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {completed.slice(0, 6).map(goal => (
                <li key={goal.id} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{goal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatValue(goal.targetValue, goal.unit)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {GOAL_TYPE_LABEL[goal.type] ?? goal.type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && totalGoals > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de conclusão</span>
                <span className="font-semibold text-primary">
                  {totalGoals > 0 ? ((completed.length / totalGoals) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <Progress
                value={totalGoals > 0 ? (completed.length / totalGoals) * 100 : 0}
                className="h-1.5 mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
