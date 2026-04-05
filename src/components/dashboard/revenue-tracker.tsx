'use client';

import { useState, useMemo } from 'react';
import { useRevenue } from '@/hooks/use-revenue';
import { useToast } from '@/hooks/use-toast';
import type { RevenueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Save, Loader2 } from 'lucide-react';

// ── Projetos fixos do ecossistema ─────────────────────────────────────────────
const PROJECTS = [
  { id: 'envox', name: 'Envox' },
  { id: 'farmacias', name: 'Farmácias de Manipulação' },
  { id: 'geracao-pj', name: 'Geração PJ' },
  { id: 'influencers', name: 'Influencers/Atletas' },
  { id: 'felizmente', name: 'Felizmente' },
] as const;

// ── Metas financeiras ─────────────────────────────────────────────────────────
const META_JULHO = 20000;
const META_DEZEMBRO = 30000;

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

function getProgressColor(pct: number): string {
  if (pct >= 70) return '#22C55E';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

function getProgressBadgeVariant(pct: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (pct >= 70) return 'default';
  if (pct >= 40) return 'secondary';
  return 'destructive';
}

// ── Gera lista de meses (12 meses anteriores + mês atual) ─────────────────────
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

// ── Barra de progresso simples ────────────────────────────────────────────────
function ProgressBar({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const pct = Math.min(target > 0 ? (current / target) * 100 : 0, 100);
  const color = getProgressColor(pct);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatBRL(current)} / {formatBRL(target)}
        </span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-right text-xs font-bold" style={{ color }}>
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function RevenueTracker() {
  const { data: revenueData, isLoading, saveRevenue, getMonthData } = useRevenue();
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Quando o mês muda, pré-preenche com dados existentes
  const savedData = useMemo(() => getMonthData(selectedMonth), [getMonthData, selectedMonth]);

  // Mesclamos: dados salvos como base, sobrescrito pelo state local de edição
  const currentAmounts = useMemo(() => {
    const base: Record<string, string> = {};
    PROJECTS.forEach((p) => {
      const saved = savedData?.entries.find((e) => e.projectId === p.id);
      base[p.id] = amounts[p.id] ?? (saved ? String(saved.amount) : '');
    });
    return base;
  }, [savedData, amounts]);

  const totalCurrentMonth = useMemo(() => {
    return PROJECTS.reduce((sum, p) => {
      const v = parseFloat(currentAmounts[p.id] || '0');
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }, [currentAmounts]);

  // Últimos 3 meses com dados registrados (excluindo o mês atual se ainda em edição)
  const recentHistory = useMemo(() => {
    if (!revenueData) return [];
    return [...revenueData]
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 3);
  }, [revenueData]);

  function handleAmountChange(projectId: string, value: string) {
    // Remove tudo que não é dígito, vírgula ou ponto
    let clean = value.replace(/[^0-9.,]/g, '');
    // Converte vírgula decimal para ponto (formato BR: "1.234,56" ou "1234,56")
    // Trata separadores de milhar (ponto) e decimal (vírgula) do formato pt-BR
    const hasComma = clean.includes(',');
    if (hasComma) {
      // Remove pontos de milhar e substitui vírgula decimal por ponto
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
    // Garante no máximo um separador decimal
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    setAmounts((prev: Record<string, string>) => ({ ...prev, [projectId]: clean }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const entries: RevenueEntry[] = PROJECTS.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        amount: parseFloat(currentAmounts[p.id] || '0') || 0,
      }));
      saveRevenue(selectedMonth, entries);
      // Limpa o state local de edição (dados virão do Firestore via listener)
      setAmounts({});
      toast({
        title: `Receita de ${formatMonthLabel(selectedMonth)} salva!`,
        description: `Total: ${formatBRL(entries.reduce((s, e) => s + e.amount, 0))}`,
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
            <Skeleton key={p.id} className="h-24" />
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
        <Label htmlFor="month-select" className="shrink-0 font-semibold">
          Mês de referência:
        </Label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setSelectedMonth(e.target.value);
            setAmounts({});
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
          const value = currentAmounts[project.id] || '';
          const numericValue = parseFloat(value) || 0;
          const expectedContribution = META_DEZEMBRO / PROJECTS.length;
          const pct = expectedContribution > 0 ? (numericValue / expectedContribution) * 100 : 0;

          return (
            <Card key={project.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{project.name}</span>
                  {numericValue > 0 && (
                    <Badge
                      variant={getProgressBadgeVariant(pct)}
                      className="text-xs"
                    >
                      {pct.toFixed(0)}%
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={value}
                    onChange={(e) => handleAmountChange(project.id, e.target.value)}
                    className="pl-9"
                  />
                </div>
                {numericValue > 0 && (
                  <p className="mt-1.5 text-right text-sm font-medium text-primary">
                    {formatBRL(numericValue)}
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
        Salvar Receita de {formatMonthLabel(selectedMonth)}
      </Button>

      {/* ── Barras de progresso ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progresso das Metas de Receita Mensal
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Comparando a receita de {formatMonthLabel(selectedMonth)} com as metas de receita mensal recorrente.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProgressBar
            label="Meta Julho/2026 — R$20.000/mês"
            current={totalCurrentMonth}
            target={META_JULHO}
          />
          <ProgressBar
            label="Meta Dezembro/2026 — R$30.000/mês"
            current={totalCurrentMonth}
            target={META_DEZEMBRO}
          />
        </CardContent>
      </Card>

      {/* ── Histórico dos últimos 3 meses ── */}
      {recentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {recentHistory.map((record) => (
                <div key={record.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="capitalize text-muted-foreground">
                    {formatMonthLabel(record.month)}
                  </span>
                  <span className="font-semibold text-primary">
                    {formatBRL(record.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
