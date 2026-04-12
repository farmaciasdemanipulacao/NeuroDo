"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/provider';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase';
import type { TimesheetEntry } from '@/lib/types';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';

export default function ProductivityReportPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const timesheetQuery = user && firestore ? query(collection(firestore, 'users', user.uid, 'timesheets'), orderBy('startedAt', 'desc')) : null;
  const { data: timesheets, isLoading } = useCollection<TimesheetEntry>(timesheetQuery);

  // KPIs
  const totalEntries = timesheets?.length || 0;
  const totalSeconds = timesheets?.reduce((sum, t) => sum + (t.duration || 0), 0) || 0;
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const uniqueTasks = new Set(timesheets?.map(t => t.taskId)).size;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Produtividade</CardTitle>
          <CardDescription>
            Quanto tempo você investiu em cada tarefa, meta e projeto?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col items-center">
              <BarChart3 className="h-6 w-6 text-primary mb-1" />
              <span className="font-bold text-lg">{totalEntries}</span>
              <span className="text-xs text-muted-foreground">Registros</span>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="h-6 w-6 text-primary mb-1" />
              <span className="font-bold text-lg">{totalHours}h</span>
              <span className="text-xs text-muted-foreground">Tempo total</span>
            </div>
            <div className="flex flex-col items-center">
              <TrendingUp className="h-6 w-6 text-primary mb-1" />
              <span className="font-bold text-lg">{uniqueTasks}</span>
              <span className="text-xs text-muted-foreground">Tarefas</span>
            </div>
            <div className="flex flex-col items-center">
              <Target className="h-6 w-6 text-primary mb-1" />
              <span className="font-bold text-lg">{(totalSeconds/60).toFixed(0)}</span>
              <span className="text-xs text-muted-foreground">Minutos</span>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Últimos Registros</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoading && <span className="text-muted-foreground">Carregando...</span>}
              {!isLoading && timesheets && timesheets.length === 0 && <span className="text-muted-foreground">Nenhum registro ainda.</span>}
              {!isLoading && timesheets && timesheets.map((entry) => (
                <div key={entry.startedAt + entry.taskId} className="flex items-center gap-3 text-sm border-b py-1">
                  <span className="font-medium">{entry.taskTitle}</span>
                  <span className="text-muted-foreground ml-auto">{(entry.duration/60).toFixed(1)} min</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <h3 className="font-semibold mb-2">O que é este relatório?</h3>
            <p className="text-sm text-muted-foreground">
              Aqui você acompanha o tempo investido em cada tarefa, meta e projeto. Use esses dados para identificar onde está sua energia, quais tarefas consomem mais tempo e como otimizar sua rotina. O MentorDo também utiliza essas informações para sugerir melhorias personalizadas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
