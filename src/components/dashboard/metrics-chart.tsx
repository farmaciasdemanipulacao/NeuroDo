'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Task, UserStats } from '@/lib/types';
import { Loader2, Trophy } from 'lucide-react';
import { subDays, startOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const chartConfig = {
  tasks: {
    label: "Tarefas Concluídas",
    color: "hsl(var(--primary))",
  },
};

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_task', title: 'Primeira Tarefa Concluída', description: 'Você deu o primeiro passo!', minTasks: 1 },
  { id: 'streak_5', title: 'Sequência de 5 Dias', description: 'Consistência é a chave. Continue assim!', minStreak: 5 },
  { id: 'tasks_10', title: 'Máquina de Execução', description: 'Concluiu 10 tarefas. Momentum garantido!', minTasks: 10 },
  { id: 'tasks_50', title: 'Centurião', description: '50 tarefas concluídas. Você é imparável!', minTasks: 50 },
  { id: 'level_5', title: 'Subindo de Nível', description: 'Chegou ao nível 5. O progresso é visível!', minLevel: 5 },
  { id: 'level_10', title: 'Estrategista', description: 'Nível 10 atingido. Você está voando!', minLevel: 10 },
];

export function MetricsChart() {
  const { user } = useUser();
  const firestore = useFirestore();

  const tasksQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'));
  }, [user, firestore]);

  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  const userStatsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'user_stats', 'data');
  }, [user, firestore]);

  const { data: userStats, isLoading: areStatsLoading } = useDoc<UserStats>(userStatsRef);

  const isLoading = areTasksLoading || areStatsLoading;

  // Build chart data: tasks completed per day for the last 7 days
  const chartData = useMemo(() => {
    // Build a counts map first for O(n) instead of O(n*7).
    // scheduledDate is stored as 'YYYY-MM-DD' (see Task type), so slice(0,10) is safe.
    const countsByDate = new Map<string, number>();
    if (tasks) {
      for (const task of tasks) {
        if (task.completed && typeof task.scheduledDate === 'string' && task.scheduledDate.length >= 10) {
          const dateKey = task.scheduledDate.slice(0, 10);
          countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
        }
      }
    }
    const days: { date: string; label: string; tasks: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayStr = format(day, 'yyyy-MM-dd');
      const label = format(day, 'EEE', { locale: ptBR });
      days.push({ date: dayStr, label, tasks: countsByDate.get(dayStr) ?? 0 });
    }
    return days;
  }, [tasks]);

  // Determine which achievements are unlocked based on user stats
  const unlockedAchievements = useMemo(() => {
    if (!userStats) return [];
    return ACHIEVEMENT_DEFINITIONS.filter(ach => {
      if (ach.minTasks && (userStats.tasksCompleted ?? 0) >= ach.minTasks) return true;
      if (ach.minStreak && (userStats.currentStreak ?? 0) >= ach.minStreak) return true;
      if (ach.minLevel && (userStats.level ?? 1) >= ach.minLevel) return true;
      return false;
    });
  }, [userStats]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Progresso Semanal</CardTitle>
          <CardDescription>Tarefas concluídas nos últimos 7 dias.</CardDescription>
        </CardHeader>
        <CardContent>
          {areTasksLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
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
          <CardDescription>Celebrando seus marcos e vitórias.</CardDescription>
        </CardHeader>
        <CardContent>
          {areStatsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : unlockedAchievements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Complete tarefas para desbloquear conquistas!
            </p>
          ) : (
            <ul className="space-y-4">
              {unlockedAchievements.map((ach) => (
                <li key={ach.id} className="flex items-start gap-4">
                  <div className="p-2 bg-accent/20 rounded-full shrink-0">
                    <Trophy className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">{ach.title}</p>
                    <p className="text-sm text-muted-foreground">{ach.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

