'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/use-projects';
import Link from 'next/link';

const STRUCTURAL_ACTIONS = new Set([
  'status_changed',
  'category_changed',
  'created',
  'deletion_scheduled',
]);

const WINDOW_DAYS = 21;

export function ProjectStabilityWidget() {
  const { projects, isLoading } = useProjects();

  const { stability, structuralChanges, weeksStable } = useMemo(() => {
    if (!projects || projects.length === 0) {
      return { stability: 100, structuralChanges: 0, weeksStable: 3 };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);

    let count = 0;
    for (const project of projects) {
      for (const entry of project.changelog ?? []) {
        if (!STRUCTURAL_ACTIONS.has(entry.action)) continue;
        const entryDate = new Date(entry.date);
        if (entryDate >= cutoff) count++;
      }
    }

    const score = Math.max(0, 100 - count * 15);
    // Calcular semanas desde última mudança estrutural para texto de contexto
    let lastStructural: Date | null = null;
    for (const project of projects) {
      for (const entry of project.changelog ?? []) {
        if (!STRUCTURAL_ACTIONS.has(entry.action)) continue;
        const d = new Date(entry.date);
        if (!lastStructural || d > lastStructural) lastStructural = d;
      }
    }
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksAgo = lastStructural
      ? Math.floor((Date.now() - lastStructural.getTime()) / msPerWeek)
      : 3;

    return { stability: score, structuralChanges: count, weeksStable: weeksAgo };
  }, [projects]);

  const barColor =
    stability >= 70
      ? 'bg-green-500'
      : stability >= 40
        ? 'bg-amber-500'
        : 'bg-red-500';

  const contextText =
    stability >= 80
      ? `Seus projetos estão estáveis há ${weeksStable > 0 ? weeksStable : 1} semana${weeksStable !== 1 ? 's' : ''}. Bom sinal de foco! 🎯`
      : stability >= 50
        ? 'Algumas mudanças recentes detectadas. Atenção ao padrão. 🔄'
        : 'Muitas mudanças estruturais detectadas. Padrão de inquietação? 🧠';

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[140px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Estabilidade dos Projetos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold">{stability}%</span>
          <span className="text-xs text-muted-foreground mb-1.5">
            ({structuralChanges} mudança{structuralChanges !== 1 ? 's' : ''} em 21 dias)
          </span>
        </div>

        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${stability}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{contextText}</p>

        {stability < 50 && (
          <Button variant="outline" size="sm" className="w-full mt-1 text-xs" asChild>
            <Link href="/dashboard/mentor">Conversar com o Mentor IA sobre isso</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
