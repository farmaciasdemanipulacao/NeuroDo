'use client';

import { useMemo } from 'react';
import { subDays, startOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Clock3, ListTodo, TrendingUp } from 'lucide-react';
import { useFocusSessions } from '@/hooks/use-focus-sessions';

const PIE_COLORS = ['#22C55E', '#14B8A6', '#F59E0B', '#3B82F6', '#EF4444', '#A78BFA'];

export function FocusSessionHistory() {
  const { data: sessions, isLoading } = useFocusSessions();

  const kpis = useMemo(() => {
    const items = sessions ?? [];
    const totalSessions = items.length;
    const completed = items.filter((s) => s.completed);
    const totalMinutes = completed.reduce((acc, s) => acc + (s.actualMinutes ?? 0), 0);
    const avgMinutes = completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0;
    const completionRate = totalSessions > 0 ? Math.round((completed.length / totalSessions) * 100) : 0;

    return {
      totalSessions,
      totalHours: (totalMinutes / 60).toFixed(1),
      avgMinutes,
      completionRate,
    };
  }, [sessions]);

  const sessionsByDay = useMemo(() => {
    const items = sessions ?? [];
    const today = startOfDay(new Date());

    return Array.from({ length: 14 }, (_, i) => {
      const day = subDays(today, 13 - i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = items.filter((session) => session.completedAt.startsWith(dayStr)).length;
      const minutes = items
        .filter((session) => session.completedAt.startsWith(dayStr) && session.completed)
        .reduce((sum, session) => sum + session.actualMinutes, 0);

      return {
        dayLabel: format(day, 'dd/MM', { locale: ptBR }),
        sessoes: count,
        minutos: minutes,
      };
    });
  }, [sessions]);

  const timeByProject = useMemo(() => {
    const items = sessions ?? [];
    const grouped = new Map<string, number>();

    items.forEach((session) => {
      if (!session.completed) return;
      const key = session.projectId || 'Sem projeto';
      grouped.set(key, (grouped.get(key) ?? 0) + (session.actualMinutes ?? 0));
    });

    return Array.from(grouped.entries())
      .map(([projectId, minutes]) => ({
        projeto: projectId,
        minutos: minutes,
      }))
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 6);
  }, [sessions]);

  const mentorInsights = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return [
        'Ainda não há sessões suficientes para análise estratégica.',
      ];
    }

    const completed = sessions.filter((s) => s.completed);
    const withTask = completed.filter((s) => s.taskId);
    const focusByProject = new Map<string, number>();

    completed.forEach((s) => {
      const key = s.projectId || 'Sem projeto';
      focusByProject.set(key, (focusByProject.get(key) ?? 0) + s.actualMinutes);
    });

    const topProject = Array.from(focusByProject.entries()).sort((a, b) => b[1] - a[1])[0];

    const insights: string[] = [];
    insights.push(`${Math.round((withTask.length / Math.max(1, completed.length)) * 100)}% das sessões concluídas estão vinculadas a tarefas.`);

    if (topProject) {
      insights.push(`Projeto com maior foco recente: ${topProject[0]} (${topProject[1]} min).`);
    }

    const noProjectMinutes = focusByProject.get('Sem projeto') ?? 0;
    if (noProjectMinutes > 0) {
      insights.push(`Você registrou ${noProjectMinutes} min sem projeto vinculado. Vale revisar priorização.`);
    }

    insights.push('Use estes dados no MentorDo para decidir próximas ações por projeto e meta.');
    return insights;
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="space-y-6 mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sessões</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            {kpis.totalSessions}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Horas Focadas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" />
            {kpis.totalHours}h
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Duração Média</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {kpis.avgMinutes} min
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Taxa de Conclusão</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {kpis.completionRate}%
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sessões por dia (14 dias)</CardTitle>
            <CardDescription>Volume diário de sessões de foco e minutos concluídos.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionsByDay} margin={{ top: 20, right: 16, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dayLabel" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="sessoes" fill="#22C55E" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo por projeto</CardTitle>
            <CardDescription>Distribuição dos minutos concluídos entre os projetos.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {timeByProject.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Conclua sessões vinculadas para ver a distribuição por projeto.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={timeByProject} dataKey="minutos" nameKey="projeto" cx="50%" cy="50%" outerRadius={100} label>
                    {timeByProject.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights para priorização (MentorDo)</CardTitle>
          <CardDescription>Leitura estratégica automática com base no seu histórico de foco.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {mentorInsights.map((insight, index) => (
              <li key={`${index}-${insight}`} className="text-sm text-muted-foreground">• {insight}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas sessões</CardTitle>
          <CardDescription>Rastro detalhado para analisar execução e consistência.</CardDescription>
        </CardHeader>
        <CardContent>
          {(!sessions || sessions.length === 0) ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 20).map((session) => (
                <div key={session.id} className="rounded-lg border border-border/60 p-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{session.workMode}</Badge>
                  <Badge variant={session.completed ? 'default' : 'secondary'}>
                    {session.completed ? 'Concluída' : 'Interrompida'}
                  </Badge>
                  <span className="text-sm">{session.actualMinutes} min</span>
                  <span className="text-xs text-muted-foreground">{new Date(session.completedAt).toLocaleString('pt-BR')}</span>
                  {session.taskTitle && <span className="text-xs text-muted-foreground">• {session.taskTitle}</span>}
                  {session.projectId && <span className="text-xs text-muted-foreground">• Projeto: {session.projectId}</span>}
                  {session.goalId && <span className="text-xs text-muted-foreground">• Meta: {session.goalId}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
