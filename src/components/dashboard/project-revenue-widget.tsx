'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/use-projects';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const META_JUL = 20000;
const META_DEZ = 30000;

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function ProjectRevenueWidget() {
  const { projects, isLoading } = useProjects();

  const { revenueProjects, total, hasAnyRevenue } = useMemo(() => {
    const relevant = (projects ?? []).filter(
      (p) => p.status === 'active' && (p.valueType === 'financial' || p.valueType === 'amplifier'),
    );
    const revenueProjects = relevant.filter((p) => p.estimatedMonthlyRevenue != null && p.estimatedMonthlyRevenue > 0);
    const total = revenueProjects.reduce((sum, p) => sum + (p.estimatedMonthlyRevenue ?? 0), 0);
    return { revenueProjects, total, hasAnyRevenue: revenueProjects.length > 0 };
  }, [projects]);

  const julProgress = Math.min(100, (total / META_JUL) * 100);
  const dezProgress = Math.min(100, (total / META_DEZ) * 100);

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
          <TrendingUp className="h-4 w-4" />
          Receita Estimada por Projetos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyRevenue ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Configure a receita estimada nos projetos financeiros para ver o progresso aqui.
            </p>
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
              <Link href="/dashboard/projects">
                <Settings className="h-3.5 w-3.5" />
                Configurar projetos
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Total */}
            <div>
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-3xl font-bold text-primary">{formatBRL(total)}</span>
                <span className="text-xs text-muted-foreground">/mês estimado</span>
              </div>

              {/* Barra Jul/26 */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Meta Jul/26</span>
                  <span className={cn('font-medium', julProgress >= 100 ? 'text-green-400' : '')}>
                    {julProgress.toFixed(0)}% — {formatBRL(META_JUL)}
                  </span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      julProgress >= 100 ? 'bg-green-500' : julProgress >= 60 ? 'bg-amber-500' : 'bg-primary/60',
                    )}
                    style={{ width: `${julProgress}%` }}
                  />
                </div>
              </div>

              {/* Barra Dez/26 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Meta Dez/26</span>
                  <span className={cn('font-medium', dezProgress >= 100 ? 'text-green-400' : '')}>
                    {dezProgress.toFixed(0)}% — {formatBRL(META_DEZ)}
                  </span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      dezProgress >= 100 ? 'bg-green-500' : dezProgress >= 60 ? 'bg-amber-500' : 'bg-muted-foreground/40',
                    )}
                    style={{ width: `${dezProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Contribuições por projeto */}
            <div className="border-t border-border/40 pt-3 space-y-1.5">
              {revenueProjects.map((p) => {
                const pct = total > 0 ? ((p.estimatedMonthlyRevenue ?? 0) / total) * 100 : 0;
                return (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.iconColor ?? '#22C55E' }}
                      />
                      <span className="truncate text-muted-foreground">{p.name}</span>
                    </div>
                    <span className="shrink-0 font-medium ml-2">
                      {formatBRL(p.estimatedMonthlyRevenue ?? 0)}
                      <span className="text-muted-foreground ml-1">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
