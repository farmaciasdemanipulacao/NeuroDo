'use client';

/**
 * MentorDo de Projetos — 3 modos: SOS (perdido), Comemorar e Visão Estratégica Semanal.
 *
 * TODO: Trigger automático de comemoração
 * Quando uma milestone for marcada como concluída no Roadmap,
 * ou quando todas as tarefas de um projeto no Plano do Dia forem completadas,
 * disparar automaticamente o modo 'celebrate' do MentorDo.
 * Depende de: integração com coleções 'milestones' e 'daily_tasks'
 */

import { useState, useMemo } from 'react';
import { LifeBuoy, PartyPopper, BarChart3, Loader2, X, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useProjects } from '@/hooks/use-projects';
import { mentorProjects } from '@/ai/flows/mentor-projects';
import type { MentorProjectsInput, MentorProjectsOutput } from '@/ai/flows/mentor-projects';

// Cálculo de estabilidade dos projetos (mesma lógica do widget)
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

type Mode = 'lost' | 'celebrate' | 'strategic';

interface MentorState {
  loading: boolean;
  result: MentorProjectsOutput | null;
  error: string | null;
}

export function MentorProjects() {
  const { projects, executionProjects } = useProjects();

  const [state, setState] = useState<MentorState>({ loading: false, result: null, error: null });
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [celebrateDialogOpen, setCelebratDialogOpen] = useState(false);
  const [celebrationText, setCelebrationText] = useState('');

  const stabilityPercent = useMemo(() => calcStability(projects), [projects]);

  const totalEstimatedRevenue = useMemo(() => {
    if (!projects) return undefined;
    const total = projects
      .filter((p) => p.status === 'active' && (p.valueType === 'financial' || p.valueType === 'amplifier'))
      .reduce((sum, p) => sum + (p.estimatedMonthlyRevenue ?? 0), 0);
    return total > 0 ? total : undefined;
  }, [projects]);

  const projectsPayload = useMemo((): MentorProjectsInput['projects'] => {
    return (projects ?? [])
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
      }));
  }, [projects]);

  async function callMentor(mode: Mode, celebrationContext?: string) {
    setState({ loading: true, result: null, error: null });
    setActiveMode(mode);

    try {
      const result = await mentorProjects({
        mode,
        projects: projectsPayload,
        currentHour: new Date().getHours(),
        stabilityPercent,
        executionCount: executionProjects?.length ?? 0,
        totalEstimatedRevenue,
        celebrationContext,
      });
      setState({ loading: false, result, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
      setState({ loading: false, result: null, error: msg });
    }
  }

  function handleLost() {
    callMentor('lost');
  }

  function handleCelebrate() {
    setCelebratDialogOpen(true);
  }

  function handleCelebrateSubmit() {
    setCelebratDialogOpen(false);
    callMentor('celebrate', celebrationText);
    setCelebrationText('');
  }

  function handleStrategic() {
    callMentor('strategic');
  }

  function handleClose() {
    setState({ loading: false, result: null, error: null });
    setActiveMode(null);
  }

  return (
    <>
      {/* Dialog de celebração */}
      <Dialog open={celebrateDialogOpen} onOpenChange={setCelebratDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🎉 O que você conquistou?</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="celebration-input" className="text-sm text-muted-foreground mb-2 block">
              Descreva a conquista — o MentorDo vai celebrar com você!
            </Label>
            <Textarea
              id="celebration-input"
              placeholder="Ex: Completei o MVP do Farmácias, fechei 2 clientes na Envox..."
              value={celebrationText}
              onChange={(e) => setCelebrationText(e.target.value)}
              className="min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) handleCelebrateSubmit();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCelebratDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCelebrateSubmit}
              disabled={!celebrationText.trim()}
            >
              Comemorar! 🚀
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">🧠</span>
            MentorDo de Projetos
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Seu mentor IA para direcionamento, comemoração e visão estratégica
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 gap-1.5"
              onClick={handleLost}
              disabled={state.loading}
            >
              <LifeBuoy className="h-4 w-4" />
              Estou Perdido
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10 gap-1.5"
              onClick={handleCelebrate}
              disabled={state.loading}
            >
              <PartyPopper className="h-4 w-4" />
              Comemorar Conquista
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 gap-1.5"
              onClick={handleStrategic}
              disabled={state.loading}
            >
              <BarChart3 className="h-4 w-4" />
              Visão da Semana
            </Button>
          </div>

          {/* Estado de loading */}
          {state.loading && (
            <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>
                {activeMode === 'lost' && 'Analisando seus projetos...'}
                {activeMode === 'celebrate' && 'Preparando a celebração...'}
                {activeMode === 'strategic' && 'Montando visão estratégica...'}
              </span>
            </div>
          )}

          {/* Erro */}
          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {/* Resultado */}
          {state.result && !state.loading && (
            <div className="relative rounded-lg border border-border bg-background/50 p-4 space-y-3">
              <button
                onClick={handleClose}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fechar resposta"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Mensagem principal — markdown simples */}
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap pr-6 prose prose-sm prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(state.result.message),
                }}
              />

              {/* Ação sugerida */}
              {state.result.suggestedAction && (
                <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                  <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-primary mb-0.5">Ação sugerida</p>
                    <p className="text-xs text-foreground/80">{state.result.suggestedAction}</p>
                  </div>
                </div>
              )}

              {/* Frase motivacional */}
              {state.result.motivationalQuote && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300 italic">{state.result.motivationalQuote}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Renderização simplificada de markdown (negrito, itálico, tabelas e quebras de linha)
function formatMarkdown(text: string): string {
  return text
    // Escape HTML básico
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Negrito **texto**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Itálico *texto*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Tabelas simples — linha com | separadores
    .replace(/((?:[^\n]*\|[^\n]*\n?)+)/g, (match) => {
      const rows = match.trim().split('\n');
      const tableRows = rows
        .filter((r) => !r.match(/^[\s|:-]+$/)) // remove linhas separadoras
        .map((row) => {
          const cells = row.split('|').filter((c) => c !== '').map((c) => c.trim());
          if (rows.indexOf(row) === 0) {
            return `<tr>${cells.map((c) => `<th class="px-2 py-1 text-left text-xs font-semibold border-b border-border">${c}</th>`).join('')}</tr>`;
          }
          return `<tr>${cells.map((c) => `<td class="px-2 py-1 text-xs border-b border-border/50">${c}</td>`).join('')}</tr>`;
        })
        .join('');
      return `<table class="w-full text-xs border-collapse my-2">${tableRows}</table>`;
    })
    // Quebras de linha
    .replace(/\n/g, '<br/>');
}
