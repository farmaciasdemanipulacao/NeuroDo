'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Flame, Trophy, CheckSquare, Timer, Star } from 'lucide-react';
import { useSharedUserStats, useSharedTasks } from '@/context/dashboard-data-provider';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  isLoading: boolean;
  highlight?: boolean;
}

function KpiCard({ title, value, subtitle, icon, isLoading, highlight }: KpiCardProps) {
  return (
    <Card className={highlight ? 'border-primary/50 bg-primary/5' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricsKpiCards() {
  const { data: stats, isLoading: areStatsLoading } = useSharedUserStats();
  const { data: tasks, isLoading: areTasksLoading } = useSharedTasks();
  const isLoading = areStatsLoading || areTasksLoading;

  const todayCompleted = useMemo(() => {
    if (!tasks) return 0;
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.completed && t.scheduledDate?.startsWith(todayStr)).length;
  }, [tasks]);

  const level = stats?.level ?? 1;
  const totalXP = stats?.totalXP ?? 0;
  const currentStreak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const tasksCompleted = stats?.tasksCompleted ?? 0;
  const focusSessions = stats?.focusSessions ?? 0;

  const getTitle = (lvl: number) => {
    if (lvl >= 50) return 'Soberano';
    if (lvl >= 30) return 'Visionário';
    if (lvl >= 20) return 'Estrategista';
    if (lvl >= 10) return 'Tático';
    return 'Operador';
  };

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        title="Nível"
        value={`${level} • ${getTitle(level)}`}
        subtitle={`${totalXP} XP acumulados`}
        icon={<Star className="h-4 w-4" />}
        isLoading={areStatsLoading}
        highlight
      />
      <KpiCard
        title="XP Total"
        value={totalXP.toLocaleString('pt-BR')}
        subtitle="pontos de experiência"
        icon={<Sparkles className="h-4 w-4" />}
        isLoading={areStatsLoading}
      />
      <KpiCard
        title="Sequência Atual"
        value={`${currentStreak} dias`}
        subtitle={`Recorde: ${longestStreak} dias`}
        icon={<Flame className="h-4 w-4 text-accent" />}
        isLoading={areStatsLoading}
      />
      <KpiCard
        title="Tarefas Totais"
        value={tasksCompleted}
        subtitle="concluídas no total"
        icon={<CheckSquare className="h-4 w-4" />}
        isLoading={areStatsLoading}
      />
      <KpiCard
        title="Sessões de Foco"
        value={focusSessions}
        subtitle="sprints completados"
        icon={<Timer className="h-4 w-4" />}
        isLoading={areStatsLoading}
      />
      <KpiCard
        title="Hoje"
        value={todayCompleted}
        subtitle="tarefas concluídas hoje"
        icon={<Trophy className="h-4 w-4 text-accent" />}
        isLoading={isLoading}
      />
    </div>
  );
}
