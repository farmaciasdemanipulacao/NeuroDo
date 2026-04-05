'use client';

import { useState, useMemo } from 'react';
import { usePJRevenue } from '@/hooks/use-pj-revenue';
import { useToast } from '@/hooks/use-toast';
import type { PJRevenueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Save, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';

// ── Projetos fixos do ecossistema ─────────────────────────────────────────────
const PROJECTS = [
  { id: 'envox', name: 'Envox' },
  { id: 'farmacias', name: 'Farmácias de Manipulação' },
  { id: 'geracao-pj', name: 'Geração PJ' },
  { id: 'influencers', name: 'Influencers/Atletas' },
  { id: 'felizmente', name: 'Felizmente' },
] as const;

// Percentual de custos em relação ao bruto que aciona alerta visual
const HIGH_EXPENSE_THRESHOLD_PERCENT = 60;

// ── Utilitários ───────────────────────────────────────────────────────────────
function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getCurrentMonth(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function formatMonthLabel(yyyyMM: string): string {
  const [yyyy, mm] = yyyyMM.split('-');
  const date = new Date(Number(yyyy), Number(mm) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function getMonthOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    options.push(`${yyyy}-${mm}`);
  }
  return options;
}

function parseInput(value: string): number {
  let clean = value.replace(/[^0-9.,]/g, '');
  const hasComma = clean.includes(',');
  if (hasComma) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  }
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }
  return parseFloat(clean) || 0;
}

// ── Barra de ranking por projeto ──────────────────────────────────────────────
function ProjectRankingBar({
  name,
  gross,
  maxGross,
}: {
  name: string;
  gross: number;
  maxGross: number;
}) {
  const pct = maxGross > 0 ? (gross / maxGross) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate font-medium">{name}</span>
        <span className="shrink-0 text-muted-foreground">{formatBRL(gross)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: '#22C55E' }}
        />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function PJRevenueTracker() {
  const { data: revenueData, isLoading, savePJRevenue, getMonthData } = usePJRevenue();
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth);
  const [grossInputs, setGrossInputs] = useState<Record<string, string>>({});
  const [expenseInputs, setExpenseInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const savedData = useMemo(() => getMonthData(selectedMonth), [getMonthData, selectedMonth]);

  // Mesclamos dados salvos como base, sobrescrito pelo state local de edição
  const currentGross = useMemo(() => {
    const base: Record<string, string> = {};
    PROJECTS.forEach((p) => {
      const saved = savedData?.entries.find((e) => e.projectId === p.id);
      base[p.id] = grossInputs[p.id] ?? (saved ? saved.grossRevenue.toFixed(2).replace(/\.?0+$/, '') : '');
    });
    return base;
  }, [savedData, grossInputs]);

  const currentExpenses = useMemo(() => {
    const base: Record<string, string> = {};
    PROJECTS.forEach((p) => {
      const saved = savedData?.entries.find((e) => e.projectId === p.id);
      base[p.id] = expenseInputs[p.id] ?? (saved ? saved.expenses.toFixed(2).replace(/\.?0+$/, '') : '');
    });
    return base;
  }, [savedData, expenseInputs]);

  // Totais calculados em tempo real
  const totals = useMemo(() => {
    let totalGross = 0;
    let totalExpenses = 0;
    PROJECTS.forEach((p) => {
      totalGross += parseInput(currentGross[p.id] || '0');
      totalExpenses += parseInput(currentExpenses[p.id] || '0');
    });
    return { totalGross, totalExpenses, totalNet: totalGross - totalExpenses };
  }, [currentGross, currentExpenses]);

  // Ranking de projetos por faturamento bruto
  const projectRanking = useMemo(() => {
    return [...PROJECTS]
      .map((p) => ({ ...p, gross: parseInput(currentGross[p.id] || '0') }))
      .sort((a, b) => b.gross - a.gross);
  }, [currentGross]);

  const maxGross = projectRanking[0]?.gross ?? 0;

  // Últimos 3 meses com dados registrados
  const recentHistory = useMemo(() => {
    if (!revenueData) return [];
    return [...revenueData]
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 3);
  }, [revenueData]);

  function handleGrossChange(projectId: string, value: string) {
    setGrossInputs((prev) => ({ ...prev, [projectId]: value }));
  }

  function handleExpenseChange(projectId: string, value: string) {
    setExpenseInputs((prev) => ({ ...prev, [projectId]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const entries: PJRevenueEntry[] = PROJECTS.map((p) => {
        const gross = parseInput(currentGross[p.id] || '0');
        const expenses = parseInput(currentExpenses[p.id] || '0');
        return {
          projectId: p.id,
          projectName: p.name,
          grossRevenue: gross,
          expenses,
          netRevenue: gross - expenses,
        };
      });
      savePJRevenue(selectedMonth, entries);
      setGrossInputs({});
      setExpenseInputs({});
      toast({
        title: `Faturamento PJ de ${formatMonthLabel(selectedMonth)} salvo!`,
        description: `Bruto: ${formatBRL(totals.totalGross)} | Líquido: ${formatBRL(totals.totalNet)}`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((p) => (
            <Skeleton key={p.id} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Seletor de mês ── */}
      <div className="flex items-center gap-3">
        <Label htmlFor="pj-month-select" className="shrink-0 font-semibold">
          Mês de referência:
        </Label>
        <select
          id="pj-month-select"
          value={selectedMonth}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setSelectedMonth(e.target.value);
            setGrossInputs({});
            setExpenseInputs({});
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {/* ── Cards de input por projeto ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((project) => {
          const gross = parseInput(currentGross[project.id] || '0');
          const expenses = parseInput(currentExpenses[project.id] || '0');
          const net = gross - expenses;
          const expenseRatio = gross > 0 ? (expenses / gross) * 100 : 0;
          const isHighExpense = gross > 0 && expenseRatio > HIGH_EXPENSE_THRESHOLD_PERCENT;

          return (
            <Card key={project.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {project.name}
                  </span>
                  {isHighExpense && (
                    <AlertTriangle className="h-4 w-4 text-destructive" title="Custos acima de 60% do faturamento" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Faturamento Bruto */}
                <div>
                  <Label className="text-xs text-muted-foreground">Faturamento Bruto (R$)</Label>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                      R$
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={currentGross[project.id] || ''}
                      onChange={(e) => handleGrossChange(project.id, e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Custos/Despesas */}
                <div>
                  <Label className="text-xs text-muted-foreground">Custos/Despesas (R$)</Label>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                      R$
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={currentExpenses[project.id] || ''}
                      onChange={(e) => handleExpenseChange(project.id, e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Líquido calculado */}
                {gross > 0 && (
                  <p
                    className="text-right text-sm font-semibold"
                    style={{ color: net >= 0 ? '#22C55E' : '#EF4444' }}
                  >
                    Líquido:{' '}
                    {formatBRL(net)}
                  </p>
                )}
                {isHighExpense && (
                  <p className="text-xs" style={{ color: '#EF4444' }}>
                    ⚠️ Custos representam {expenseRatio.toFixed(0)}% do bruto
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Botão salvar ── */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full sm:w-auto"
        size="lg"
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Salvar Faturamento PJ de {formatMonthLabel(selectedMonth)}
      </Button>

      {/* ── Card de resumo total do mês ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Resumo do Mês — {formatMonthLabel(selectedMonth)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-secondary p-4 text-center">
              <p className="text-xs text-muted-foreground">Faturamento Bruto</p>
              <p className="mt-1 text-xl font-bold text-foreground">{formatBRL(totals.totalGross)}</p>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <p className="text-xs text-muted-foreground">Custos Totais</p>
              <p className="mt-1 text-xl font-bold" style={{ color: '#F59E0B' }}>
                {formatBRL(totals.totalExpenses)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <p className="text-xs text-muted-foreground">Lucro Líquido</p>
              <p
                className="mt-1 text-xl font-bold"
                style={{ color: totals.totalNet >= 0 ? '#22C55E' : '#EF4444' }}
              >
                {formatBRL(totals.totalNet)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Ranking de projetos por faturamento ── */}
      {maxGross > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking por Faturamento Bruto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectRanking.map((p) => (
              <ProjectRankingBar key={p.id} name={p.name} gross={p.gross} maxGross={maxGross} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Mini histórico dos últimos 3 meses ── */}
      {recentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico Recente (PJ)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Mês</th>
                    <th className="pb-2 text-right font-medium">Bruto</th>
                    <th className="pb-2 text-right font-medium">Custos</th>
                    <th className="pb-2 text-right font-medium">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {recentHistory.map((record) => (
                    <tr key={record.id} className="border-b border-border last:border-0">
                      <td className="py-2 capitalize text-muted-foreground">
                        {formatMonthLabel(record.month)}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatBRL(record.totalGross)}
                      </td>
                      <td className="py-2 text-right" style={{ color: '#F59E0B' }}>
                        {formatBRL(record.totalExpenses)}
                      </td>
                      <td
                        className="py-2 text-right font-semibold"
                        style={{ color: record.totalNet >= 0 ? '#22C55E' : '#EF4444' }}
                      >
                        {formatBRL(record.totalNet)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
