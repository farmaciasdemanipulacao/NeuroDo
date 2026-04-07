'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/use-projects';
import type { ManagedProject, ProjectValueType } from '@/lib/types';

const MAX_EXECUTION = 3;

const valueTypeStyle: Record<ProjectValueType, { border: string; bg: string; text: string }> = {
  financial: { border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-400' },
  amplifier: { border: 'border-blue-500/50', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  personal: { border: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  experimental: { border: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400' },
};

const valueTypeEmoji: Record<ProjectValueType, string> = {
  financial: '💰',
  amplifier: '📣',
  personal: '❤️',
  experimental: '🧪',
};

function ExecutionSlot({ project, index }: { project?: ManagedProject; index: number }) {
  if (!project) {
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/50 px-2 py-3">
        <span className="text-[10px] text-muted-foreground/50">Slot {index + 1}</span>
        <span className="text-[10px] text-muted-foreground/40">Disponível</span>
      </div>
    );
  }

  const style = valueTypeStyle[project.valueType];
  return (
    <div
      className={cn(
        'flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3',
        style.border,
        style.bg,
      )}
    >
      <span className="text-base">{valueTypeEmoji[project.valueType]}</span>
      <span className={cn('text-[10px] font-semibold text-center leading-tight line-clamp-2', style.text)}>
        {project.name}
      </span>
    </div>
  );
}

export function ExecutionSlotsWidget() {
  const { projects, executionProjects, oversightProjects, personalProjects, pausedProjects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[140px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  // Slots de execução: preencher os MAX_EXECUTION slots
  const slots = Array.from({ length: MAX_EXECUTION }, (_, i) => executionProjects[i]);

  const oversightCount = oversightProjects.length;
  const personalCount = personalProjects.length;
  const pausedCount = pausedProjects.length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <LayoutGrid className="h-4 w-4" />
          Slots de Execução
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Slots visuais */}
        <div className="flex gap-2">
          {slots.map((project, i) => (
            <ExecutionSlot key={project?.id ?? `empty-${i}`} project={project} index={i} />
          ))}
        </div>

        {/* Listas compactas */}
        {oversightProjects.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">👁 Acompanhamento</p>
            <ul className="space-y-0.5">
              {oversightProjects.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{p.name}</span>
                  {p.responsibleName && (
                    <span className="text-muted-foreground shrink-0 ml-2">{p.responsibleName}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {personalProjects.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">🌱 Pessoal</p>
            <ul className="space-y-0.5">
              {personalProjects.map((p) => (
                <li key={p.id} className="text-xs truncate">{p.name}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Contador */}
        <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-2">
          {oversightCount > 0 && `${oversightCount} acompanhamento`}
          {oversightCount > 0 && personalCount > 0 && ' · '}
          {personalCount > 0 && `${personalCount} pessoal`}
          {(oversightCount > 0 || personalCount > 0) && pausedCount > 0 && ' · '}
          {pausedCount > 0 && `${pausedCount} pausado${pausedCount !== 1 ? 's' : ''}`}
          {oversightCount === 0 && personalCount === 0 && pausedCount === 0 && 'Nenhum projeto além da execução'}
        </p>
      </CardContent>
    </Card>
  );
}
