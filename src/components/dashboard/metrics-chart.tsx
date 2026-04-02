'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import { Loader2, Trophy } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useUserStats } from '@/hooks/use-user-stats';
import type { Task } from '@/lib/types';

// Mapeamento de definições de conquistas por ID
const ACHIEVEMENT_DEFINITIONS: Record<string, { title: string; description: string }> = {
  'first-task': { title: 'Primeira Tarefa Concluída', description: 'Você deu o primeiro passo!' },
  'streak-5': { title: 'Sequência de 5 Dias', description: 'Consistência é a chave. Continue assim!' },
  'streak-10': { title: 'Sequência de 10 Dias', description: 'Dedicação real. Parabéns!' },
  'tasks-10': { title: 'Produtivo', description: 'Concluiu 10 tarefas. Continue avançando!' },
  'tasks-50': { title: 'Máquina de Execução', description: 'Concluiu 50 tarefas. Impressionante!' },
  'ideas-10': { title: 'Máquina de Ideias', description: 'Capturou 10 novas ideias.' },
  'level-5': { title: 'Subiu de Nível', description: 'Alcançou o nível 5. Você está evoluindo!' },
  'focus-session': { title: 'Foco Total', description: 'Completou sua primeira sessão de foco.' },
};

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `S${weekNum}`;
}

function getLast7WeekLabels(): string[] {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    labels.push(getISOWeek(d));
  }
  return labels;
}

const chartConfig = {
  tasks: {
    label: 'Tarefas Concluídas',
    color: 'hsl(var(--primary))',
  },
};

export function MetricsChart() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { data: userStats, isLoading: areStatsLoading } = useUserStats();

  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'));
  }, [firestore, user]);
  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  const isLoading = areStatsLoading || areTasksLoading;

  const chartData = useMemo(() => {
    const weekLabels = getLast7WeekLabels();
    const counts: Record<string, number> = {};
    weekLabels.forEach(l => (counts[l] = 0));

    if (tasks) {
      tasks.forEach(task => {
        if (task.completed && task.scheduledDate) {
          const d = new Date(task.scheduledDate + 'T12:00:00');
          const label = getISOWeek(d);
          if (label in counts) {
            counts[label] = (counts[label] || 0) + 1;
          }
        }
      });
    }

    return weekLabels.map(date => ({ date, tasks: counts[date] ?? 0 }));
  }, [tasks]);

  const achievements = useMemo(() => {
    const unlocked = userStats?.achievementsUnlocked ?? [];
    if (unlocked.length === 0) return [];
    return unlocked
      .map(id => {
        const def = ACHIEVEMENT_DEFINITIONS[id];
        return def ? { id, ...def } : null;
      })
      .filter(Boolean) as { id: string; title: string; description: string }[];
  }, [userStats]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Progresso Semanal</CardTitle>
          <CardDescription>Tarefas concluídas nas últimas 7 semanas.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis />
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
          <CardDescription>Celebrando seus marcos e vitórias.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[100px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : achievements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <Trophy className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhuma conquista desbloqueada ainda.</p>
              <p className="text-xs">Complete tarefas e mantenha sua sequência para ganhar!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {achievements.map(ach => (
                <li key={ach.id} className="flex items-start gap-4">
                  <div className="p-2 bg-accent/20 rounded-full">
                    <span className="text-accent text-lg">🏆</span>
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
