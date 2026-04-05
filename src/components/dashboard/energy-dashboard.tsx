'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Cell,
} from 'recharts';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Calendar,
  Loader2,
  BarChart2,
  Target,
  Sparkles,
  RefreshCw,
  Moon,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useEnergyHistory } from '@/hooks/use-energy-history';
import { useUser } from '@/firebase';
import {
  analyzeEnergyPatterns,
  type AnalyzeEnergyPatternsOutput,
} from '@/ai/flows/analyze-energy-patterns';
import { cn } from '@/lib/utils';

// ── Constantes de cores e limiares de energia ────────────────────────────────

const COLOR_GREEN = '#22C55E';
const COLOR_AMBER = '#F59E0B';
const COLOR_RED = '#EF4444';
const COLOR_BLUE = '#3B82F6';

const ENERGY_HIGH_THRESHOLD = 7;  // energia >= 7 = alto
const ENERGY_MEDIUM_THRESHOLD = 5; // energia >= 5 = médio

// ── Dias da semana em pt-BR (abreviados) ──────────────────────────────────────

const DOW_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DOW_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function energyColor(level: number): string {
  if (level >= ENERGY_HIGH_THRESHOLD) return COLOR_GREEN;
  if (level >= ENERGY_MEDIUM_THRESHOLD) return COLOR_AMBER;
  return COLOR_RED;
}

function energyBadgeClass(level: number): string {
  if (level >= ENERGY_HIGH_THRESHOLD) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (level >= ENERGY_MEDIUM_THRESHOLD) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ── Types para tooltips do Recharts ──────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  payload: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

// ── Tooltip customizado para o gráfico principal ──────────────────────────────

function EnergyTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const energy = payload.find((p) => p.dataKey === 'energyLevel');
  const completion = payload.find((p) => p.dataKey === 'completionRate');
  const point = payload[0]?.payload as { dateLabel?: string; tasksCompleted?: number; tasksTotal?: number } | undefined;

  return (
    <div className="rounded-lg border border-border/50 bg-background p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{point?.dateLabel ?? label}</p>
      {energy && (
        <p style={{ color: energyColor(energy.value) }}>
          ⚡ Energia: <strong>{energy.value}/10</strong>
        </p>
      )}
      {completion && (
        <p style={{ color: COLOR_AMBER }}>
          ✅ Conclusão: <strong>{completion.value}%</strong>
          {point && (
            <span className="text-muted-foreground ml-1">
              ({point.tasksCompleted}/{point.tasksTotal} tarefas)
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// ── Tooltip do gráfico de dias da semana ──────────────────────────────────────

function WeekdayTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg border border-border/50 bg-background p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{DOW_FULL[DOW_ABBR.indexOf(label ?? '')] ?? label}</p>
      {value !== undefined && (
        <p style={{ color: energyColor(value) }}>
          ⚡ Energia média: <strong>{value.toFixed(1)}/10</strong>
        </p>
      )}
    </div>
  );
}

// ── Ícone por tipo de insight ─────────────────────────────────────────────────

function InsightIcon({ type }: { type: 'positive' | 'warning' | 'neutral' }) {
  if (type === 'positive') return <span className="text-lg">✨</span>;
  if (type === 'warning') return <span className="text-lg">⚠️</span>;
  return <span className="text-lg">📊</span>;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function EnergyDashboard() {
  const { data, stats, isLoading } = useEnergyHistory();
  const { appUser } = useUser();
  const { toast } = useToast();

  const [aiResult, setAiResult] = useState<AnalyzeEnergyPatternsOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Dados para gráfico de padrão semanal ──────────────────────────────────

  const weekdayData = useMemo(() => {
    const map: Record<number, { sum: number; count: number }> = {};
    for (const d of data) {
      if (!map[d.dayOfWeek]) map[d.dayOfWeek] = { sum: 0, count: 0 };
      map[d.dayOfWeek].sum += d.energyLevel;
      map[d.dayOfWeek].count += 1;
    }
    return Array.from({ length: 7 }, (_, i) => ({
      day: DOW_ABBR[i],
      avgEnergy: map[i] ? Math.round((map[i].sum / map[i].count) * 10) / 10 : 0,
      hasData: !!map[i],
    }));
  }, [data]);

  const maxWeekdayEnergy = useMemo(
    () => Math.max(...weekdayData.map((d) => d.avgEnergy)),
    [weekdayData]
  );

  // ── Últimos 7 dias para a mini-timeline ──────────────────────────────────

  const last7Days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');
      const review = data.find((r) => r.date === dateStr);
      return {
        dateStr,
        dayAbbr: DOW_ABBR[d.getDay()],
        dayNum: d.getDate(),
        review: review ?? null,
      };
    });
  }, [data]);

  // ── Handler de análise IA ─────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!stats || data.length < 3) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeEnergyPatterns({
        energyHistory: data.map((d) => ({
          date: d.date,
          energyLevel: d.energyLevel,
          tasksCompleted: d.tasksCompleted,
          tasksTotal: d.tasksTotal,
          dayOfWeek: d.dayOfWeek,
        })),
        stats: {
          avgEnergy: stats.avgEnergy,
          avgCompletion: stats.avgCompletion,
          bestDayOfWeek: stats.bestDayOfWeek,
          worstDayOfWeek: stats.worstDayOfWeek,
          energyTrend: stats.energyTrend,
          streak: stats.streak,
        },
        userName: appUser?.displayName?.split(' ')[0] ?? undefined,
      });
      setAiResult(result);
    } catch (err: any) {
      toast({
        title: 'Erro na análise',
        description: err.message ?? 'Não foi possível analisar os padrões. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ── Estado: dados insuficientes ───────────────────────────────────────────

  if (!isLoading && data.length < 1) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Moon className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-lg">Nenhuma revisão noturna encontrada</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              Complete revisões noturnas regularmente para ver seu padrão de energia aqui.
              Cada revisão revela um pouco mais sobre como seu cérebro funciona.
            </p>
          </div>
          <Button asChild variant="default" size="sm">
            <a href="/dashboard/review">Fazer minha primeira revisão</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Trend icon ────────────────────────────────────────────────────────────

  const TrendIcon =
    stats?.energyTrend === 'up'
      ? TrendingUp
      : stats?.energyTrend === 'down'
      ? TrendingDown
      : Minus;

  const trendColor =
    stats?.energyTrend === 'up'
      ? 'text-green-400'
      : stats?.energyTrend === 'down'
      ? 'text-red-400'
      : 'text-muted-foreground';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Seção 1: Cards de resumo ─────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Energia Média */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Energia Média
                  </p>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: energyColor(stats?.avgEnergy ?? 0) }}
                  >
                    {stats?.avgEnergy ?? '–'}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">/10</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
                  <span className={cn('text-xs', trendColor)}>
                    {stats?.energyTrend === 'up'
                      ? 'Subindo'
                      : stats?.energyTrend === 'down'
                      ? 'Caindo'
                      : 'Estável'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Taxa de Conclusão */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Conclusão
                  </p>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                  <span
                    className="text-3xl font-bold"
                    style={{
                      color:
                        (stats?.avgCompletion ?? 0) >= 70
                          ? COLOR_GREEN
                          : (stats?.avgCompletion ?? 0) >= 40
                          ? COLOR_AMBER
                          : COLOR_RED,
                    }}
                  >
                    {stats?.avgCompletion ?? '–'}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  média últimos {stats?.totalReviews ?? 0} dias
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Melhor Dia */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Melhor Dia
                  </p>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground leading-tight">
                  {stats?.bestDayOfWeek ?? '–'}
                </p>
                <p className="text-xs text-muted-foreground">maior energia média</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sequência Atual */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Sequência
                  </p>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {stats?.streak ?? 0}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">dias</span>
                </div>
                <p className="text-xs text-muted-foreground">com energia ≥ 5</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Seção 2: Gráfico principal Energia × Produtividade ─────────────── */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            Energia × Produtividade
          </CardTitle>
          <CardDescription>
            Últimos {data.length} dias — linha verde = energia, barras âmbar = % de tarefas concluídas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground gap-3">
              <Moon className="h-10 w-10 opacity-30" />
              <p className="text-sm max-w-sm">
                Complete revisões noturnas para ver seu padrão de energia aqui.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="energy"
                  orientation="left"
                  domain={[0, 10]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickCount={6}
                />
                <YAxis
                  yAxisId="completion"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  tickCount={6}
                />
                <Tooltip content={<EnergyTooltip />} />
                <Bar
                  yAxisId="completion"
                  dataKey="completionRate"
                  fill={COLOR_AMBER}
                  fillOpacity={0.55}
                  radius={[3, 3, 0, 0]}
                  name="Conclusão"
                />
                <Line
                  yAxisId="energy"
                  type="monotone"
                  dataKey="energyLevel"
                  stroke={COLOR_GREEN}
                  strokeWidth={2.5}
                  dot={{ fill: COLOR_GREEN, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  name="Energia"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Seção 3 + 5 em grid ──────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Seção 3: Padrão semanal */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Seu padrão semanal de energia</CardTitle>
            <CardDescription>Média de energia por dia da semana</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={weekdayData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickCount={6}
                  />
                  <Tooltip content={<WeekdayTooltip />} />
                  <Bar dataKey="avgEnergy" radius={[4, 4, 0, 0]}>
                    {weekdayData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.avgEnergy === maxWeekdayEnergy && entry.hasData
                            ? COLOR_GREEN
                            : entry.hasData
                            ? energyColor(entry.avgEnergy)
                            : 'rgba(255,255,255,0.1)'
                        }
                        fillOpacity={
                          entry.avgEnergy === maxWeekdayEnergy && entry.hasData ? 1 : 0.6
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Seção 5: Mini-timeline últimos 7 dias */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Últimos 7 dias</CardTitle>
            <CardDescription>Histórico recente de energia por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 flex-1" />
                ))}
              </div>
            ) : (
              <div className="flex gap-2 justify-between">
                {last7Days.map(({ dateStr, dayAbbr, dayNum, review }) => (
                  <div
                    key={dateStr}
                    className="flex flex-col items-center gap-1.5 flex-1 min-w-0"
                  >
                    <span className="text-xs text-muted-foreground font-medium">{dayAbbr}</span>
                    <div
                      className={cn(
                        'w-full rounded-lg py-2 flex items-center justify-center text-sm font-bold border',
                        review
                          ? energyBadgeClass(review.energyLevel)
                          : 'bg-muted/30 text-muted-foreground border-border/30'
                      )}
                    >
                      {review ? review.energyLevel : '–'}
                    </div>
                    <span className="text-xs text-muted-foreground">{dayNum}</span>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Verde ≥ {ENERGY_HIGH_THRESHOLD} · Âmbar ≥ {ENERGY_MEDIUM_THRESHOLD} · Vermelho {'<'} {ENERGY_MEDIUM_THRESHOLD} · Cinza = sem revisão
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Seção 4: Insights da IA ───────────────────────────────────────────── */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Análise de Padrões com IA
              </CardTitle>
              <CardDescription className="mt-1">
                {data.length < 3
                  ? `Você precisa de pelo menos 3 revisões noturnas para ativar a análise (${data.length}/3 registradas)`
                  : 'O MentorDO analisa seus dados e revela padrões comportamentais'}
              </CardDescription>
            </div>
            {aiResult && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="shrink-0"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5">Reanalisar</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Botão de análise */}
          {!aiResult && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || data.length < 3}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analisando seus padrões...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analisar meus padrões com IA
                </>
              )}
            </Button>
          )}

          {/* Resultado da análise */}
          {aiResult && (
            <div className="space-y-5">
              {/* Padrão geral */}
              <p className="text-sm text-foreground/90 leading-relaxed">
                {aiResult.overallPattern}
              </p>

              {/* Insights */}
              <div className="space-y-3">
                {aiResult.insights.map((insight, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-lg border p-4 space-y-2',
                      insight.type === 'positive'
                        ? 'border-green-500/20 bg-green-500/5'
                        : insight.type === 'warning'
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : 'border-blue-500/20 bg-blue-500/5'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <InsightIcon type={insight.type} />
                      <p className="font-semibold text-sm">{insight.title}</p>
                    </div>
                    <p className="text-sm text-foreground/80">{insight.description}</p>
                    <div className="flex items-start gap-2 pt-1">
                      <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-primary font-medium">{insight.actionable}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Correlação energia × produtividade */}
              <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Energia × Produtividade no seu caso
                </p>
                <p className="text-sm text-foreground/80">{aiResult.energyProductivityCorrelation}</p>
              </div>

              {/* Análise semanal */}
              <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Padrão por dia da semana
                </p>
                <p className="text-sm text-foreground/80">{aiResult.weekdayAnalysis}</p>
              </div>

              {/* Recomendação principal */}
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Recomendação principal
                  </p>
                </div>
                <p className="text-sm font-medium text-foreground">{aiResult.recommendation}</p>
              </div>

              {/* Nota motivacional */}
              <p className="text-sm text-primary/80 italic text-center px-4">
                {aiResult.motivationalNote}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
