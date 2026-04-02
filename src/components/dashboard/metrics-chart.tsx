'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useUserStats } from '@/hooks/use-user-stats';
import { collection, query } from 'firebase/firestore';
import type { Task } from '@/lib/types';
import { subDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const chartConfig = {
  tasks: {
    label: 'Tarefas Concluídas',
    color: 'hsl(var(--primary))',
  },
};

// Mapa de IDs de conquistas para labels amigáveis
const ACHIEVEMENT_LABELS: Record<string, { title: string; description: string }> = {
  first_task: { title: 'Primeira Tarefa', description: 'Completou sua primeira tarefa!' },
  streak_3: { title: 'Sequência de 3 dias', description: '3 dias consecutivos de progresso.' },
  streak_7: { title: 'Semana Perfeita', description: '7 dias consecutivos de progresso.' },
  streak_30: { title: 'Mês Imparável', description: '30 dias consecutivos de progresso.' },
  tasks_10: { title: '10 Tarefas', description: 'Completou 10 tarefas no total.' },
  tasks_50: { title: '50 Tarefas', description: 'Completou 50 tarefas no total.' },
  tasks_100: { title: '100 Tarefas', description: 'Completou 100 tarefas! Incrível.' },
  focus_first: { title: 'Primeiro Foco', description: 'Completou sua primeira sessão de foco.' },
  focus_10: { title: '10 Sessões', description: '10 sessões de foco completas.' },
  level_5: { title: 'Nível 5', description: 'Alcançou o nível 5!' },
  level_10: { title: 'Nível 10', description: 'Alcançou o nível 10!' },
};

export function MetricsChart() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { data: stats, isLoading: areStatsLoading } = useUserStats();

  // Busca todas as tarefas para calcular o gráfico dos últimos 7 dias
  const tasksQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'));
  }, [user, firestore]);

  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  // Agrupa tarefas concluídas por dia nos últimos 7 dias
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i);
      const dayStr = [
        day.getFullYear(),
        String(day.getMonth() + 1).padStart(2, '0'),
        String(day.getDate()).padStart(2, '0'),
      ].join('-');
      const count = tasks?.filter(
        (t) => t.completed && t.scheduledDate === dayStr
      ).length ?? 0;
      return {
        date: format(day, 'EEE', { locale: ptBR }),
        tasks: count,
      };
    });
  }, [tasks]);

  const unlockedAchievements = stats?.achievementsUnlocked ?? [];
  const isLoading = areStatsLoading || areTasksLoading;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Progresso — Últimos 7 dias</CardTitle>
          <CardDescription>Tarefas concluídas por dia.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="tasks" fill="var(--color-tasks)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Conquistas</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Carregando...'
              : unlockedAchievements.length === 0
              ? 'Complete tarefas para desbloquear conquistas!'
              : `${unlockedAchievements.length} desbloqueada${unlockedAchievements.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : unlockedAchievements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground gap-2">
              <Trophy className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma conquista ainda. Continue progredindo!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {unlockedAchievements.slice(0, 6).map((id) => {
                const ach = ACHIEVEMENT_LABELS[id] ?? { title: id, description: '' };
                return (
                  <li key={id} className="flex items-start gap-4">
                    <div className="p-2 bg-accent/20 rounded-full shrink-0">
                      <Trophy className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{ach.title}</p>
                      <p className="text-xs text-muted-foreground">{ach.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {stats && (
            <div className="mt-4 pt-4 border-t flex gap-4 text-xs text-muted-foreground">
              <span>Nível <strong className="text-foreground">{stats.level}</strong></span>
              <span><strong className="text-foreground">{stats.totalXP}</strong> XP</span>
              <span><strong className="text-foreground">{stats.tasksCompleted}</strong> tarefas</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
