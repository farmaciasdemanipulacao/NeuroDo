'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/use-projects';
import type { OwnerRole } from '@/lib/types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const ROLE_CONFIG: Record<OwnerRole, { label: string; hours: number; color: string; emoji: string }> = {
  leader:     { label: 'Líder',     hours: 15,  color: '#EF4444', emoji: '🔴' },
  trainer:    { label: 'Treinador', hours: 4,   color: '#F59E0B', emoji: '🟡' },
  consultant: { label: 'Consultor', hours: 1.5, color: '#22C55E', emoji: '🟢' },
  away:       { label: 'Ausente',   hours: 0,   color: '#6B7280', emoji: '⚪' },
};

export function OwnerRoleWidget() {
  const { projects, isLoading } = useProjects();

  const { totalHours, roleData, allLeader, overloaded } = useMemo(() => {
    const active = (projects ?? []).filter((p) => p.status === 'active');
    if (active.length === 0) {
      return { totalHours: 0, roleData: [], allLeader: false, overloaded: false };
    }

    const counts: Partial<Record<OwnerRole, number>> = {};
    for (const p of active) {
      counts[p.ownerRole] = (counts[p.ownerRole] ?? 0) + 1;
    }

    let total = 0;
    const data: { name: string; value: number; hours: number; color: string; emoji: string; count: number }[] = [];
    for (const [role, count] of Object.entries(counts) as [OwnerRole, number][]) {
      const cfg = ROLE_CONFIG[role];
      if (!cfg) continue; // ignora papéis desconhecidos/undefined
      const hours = cfg.hours * count;
      total += hours;
      if (count > 0) {
        data.push({ name: cfg.label, value: count, hours, color: cfg.color, emoji: cfg.emoji, count });
      }
    }

    const leaderCount = counts['leader'] ?? 0;
    const allLeaderFlag = active.length > 0 && leaderCount === active.length;
    return {
      totalHours: total,
      roleData: data,
      allLeader: allLeaderFlag,
      overloaded: total > 40,
    };
  }, [projects]);

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[140px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!projects || projects.filter((p) => p.status === 'active').length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <UserCircle className="h-4 w-4" />
            Papel do Dono
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Nenhum projeto ativo.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <UserCircle className="h-4 w-4" />
          Papel do Dono
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          {/* Donut chart */}
          <div className="relative w-24 h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={40}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1c1c27', border: '1px solid #2a2a3a', borderRadius: 6 }}
                  formatter={(value: number, name: string) => [`${value} proj.`, name]}
                  labelStyle={{ display: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centro do donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-lg font-bold', overloaded ? 'text-red-400' : '')}>
                {totalHours}h
              </span>
              <span className="text-[9px] text-muted-foreground leading-tight">
                /semana
              </span>
            </div>
          </div>

          {/* Legenda */}
          <div className="space-y-1.5 flex-1 min-w-0">
            {roleData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span>{d.emoji}</span>
                  <span className="text-muted-foreground">{d.name}</span>
                </span>
                <span className="text-right font-medium">
                  {d.count}× <span className="text-muted-foreground">({d.hours}h)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas */}
        {overloaded && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-red-400 leading-relaxed">
              ⚠️ Carga estimada acima de 40h/semana. Considere delegar ou pausar projetos.
            </p>
          </div>
        )}
        {!overloaded && allLeader && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-400 leading-relaxed">
              Todos os projetos dependem 100% de você. Pense em como delegar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
