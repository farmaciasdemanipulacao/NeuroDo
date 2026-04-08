'use client';

/**
 * Botão SOS flutuante — chama o MentorDo no modo 'lost'.
 * Posição: fixed bottom-44 right-6 (acima do FloatingFocusTimer em bottom-24 e do AiMentorChat em bottom-6).
 * Pulsa após 120 minutos de inatividade para alertar o usuário.
 */

import { useState, useEffect, useMemo } from 'react';
import { LifeBuoy, X, Loader2, Target, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProjects } from '@/hooks/use-projects';
import { mentorProjects } from '@/ai/flows/mentor-projects';
import type { MentorProjectsOutput } from '@/ai/flows/mentor-projects';

const INACTIVITY_THRESHOLD_MINUTES = 120;

function calcStability(projects: ReturnType<typeof useProjects>['projects']): number {
  if (!projects?.length) return 100;
  const cutoff = Date.now() - 21 * 24 * 60 * 60 * 1000;
  const unstableActions = new Set(['status_changed', 'category_changed', 'created', 'deletion_scheduled']);
  let totalEvents = 0;
  for (const p of projects) {
    if (!p.changelog) continue;
    for (const entry of p.changelog) {
      if (unstableActions.has(entry.action) && new Date(entry.date).getTime() >= cutoff) {
        totalEvents++;
      }
    }
  }
  return Math.max(0, 100 - totalEvents * 15);
}

export function MentorSosButton() {
  const { projects, executionProjects } = useProjects();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MentorProjectsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detecção de inatividade
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isInactive, setIsInactive] = useState(false);

  useEffect(() => {
    const handler = () => setLastActivity(Date.now());
    window.addEventListener('click', handler);
    window.addEventListener('keypress', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keypress', handler);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const minutes = (Date.now() - lastActivity) / 60000;
      setIsInactive(minutes > INACTIVITY_THRESHOLD_MINUTES);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastActivity]);

  const stabilityPercent = useMemo(() => calcStability(projects), [projects]);

  const totalEstimatedRevenue = useMemo(() => {
    if (!projects) return undefined;
    const total = projects
      .filter((p) => p.status === 'active' && (p.valueType === 'financial' || p.valueType === 'amplifier'))
      .reduce((sum, p) => sum + (p.estimatedMonthlyRevenue ?? 0), 0);
    return total > 0 ? total : undefined;
  }, [projects]);

  async function handleOpen() {
    setOpen(true);
    setResult(null);
    setError(null);
    setLoading(true);

    const inactiveMinutes = Math.floor((Date.now() - lastActivity) / 60000);

    try {
      const res = await mentorProjects({
        mode: 'lost',
        projects: (projects ?? [])
          .filter((p) => p.status === 'active' || p.status === 'paused')
          .map((p) => ({
            name: p.name,
            category: p.category as 'execution' | 'oversight' | 'personal',
            status: p.status,
            priority: p.priority,
            valueType: p.valueType,
            ownerRole: p.ownerRole,
            responsibleName: p.responsibleName,
            estimatedMonthlyRevenue: p.estimatedMonthlyRevenue,
          })),
        currentHour: new Date().getHours(),
        stabilityPercent,
        executionCount: executionProjects?.length ?? 0,
        totalEstimatedRevenue,
        inactiveMinutes: inactiveMinutes > 0 ? inactiveMinutes : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao contatar o MentorDo.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  return (
    <div className="fixed bottom-44 right-6 z-40 flex flex-col items-end gap-3">
      {/* Popover de resultado */}
      {open && (
        <Card className="w-80 border-amber-500/30 bg-card shadow-2xl">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <span>🧭</span> MentorDo
              </span>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                <span>Analisando seus projetos...</span>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            {result && !loading && (
              <div className="space-y-2">
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: simpleMarkdown(result.message) }}
                />

                {result.suggestedAction && (
                  <div className="flex items-start gap-2 rounded border border-primary/20 bg-primary/5 px-2.5 py-2">
                    <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground/80">{result.suggestedAction}</p>
                  </div>
                )}

                {result.motivationalQuote && (
                  <div className="flex items-start gap-2 rounded border border-amber-500/20 bg-amber-500/5 px-2.5 py-2">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300 italic">{result.motivationalQuote}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botão SOS */}
      {!open && (
        <Button
          size="icon"
          onClick={handleOpen}
          className={[
            'h-12 w-12 rounded-full shadow-lg',
            'bg-amber-500 hover:bg-amber-400 text-white',
            isInactive ? 'animate-pulse' : '',
          ].join(' ')}
          title={isInactive ? 'Você está inativo há mais de 2h — precisa de direcionamento?' : 'Estou Perdido — chamar MentorDo'}
          aria-label="MentorDo SOS"
        >
          <LifeBuoy className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}
