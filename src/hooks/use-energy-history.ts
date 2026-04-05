'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { NightlyReview } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EnergyDataPoint {
  date: string;           // YYYY-MM-DD
  dateLabel: string;      // "dom 05/04" formatado em pt-BR
  energyLevel: number;    // 0-10
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number; // 0-100 (%)
  dayOfWeek: number;      // 0=Dom, 6=Sáb
  dayName: string;        // "Domingo", "Segunda-feira", etc. em pt-BR
  aiEnergyPattern?: string;
}

export interface EnergyStats {
  avgEnergy: number;
  avgCompletion: number;
  bestDayOfWeek: string;       // ex: "Segunda-feira"
  worstDayOfWeek: string;
  bestEnergyRange: string;     // ex: "Manhã (9h-12h)"
  peakEnergyDays: string[];    // dias com energia >= 7
  lowEnergyDays: string[];     // dias com energia <= 3
  streak: number;              // dias consecutivos com energia >= 5
  totalReviews: number;
  energyTrend: 'up' | 'down' | 'stable'; // comparando últimas 2 semanas
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

/**
 * Constrói um objeto Date sem deslocamento de fuso horário a partir de YYYY-MM-DD.
 * Usar `new Date('YYYY-MM-DD')` interpreta como UTC, gerando desfasagem no Brasil (UTC-3).
 */
function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEnergyHistory() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const reviewsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'reviews'),
      orderBy('date', 'desc'),
      limit(30)
    );
  }, [user, firestore]);

  const { data: rawReviews, isLoading: isCollectionLoading } =
    useCollection<NightlyReview>(reviewsQuery);

  // Mapeia os documentos crus para EnergyDataPoint (ordem ascendente para gráficos)
  const data: EnergyDataPoint[] = useMemo(() => {
    if (!rawReviews) return [];

    return rawReviews
      .map((r) => {
        const dateObj = parseDateLocal(r.date);
        const dow = dateObj.getDay(); // 0=Dom … 6=Sáb
        const completionRate =
          r.tasksTotal > 0
            ? Math.round((r.tasksCompleted / r.tasksTotal) * 100)
            : 0;

        return {
          date: r.date,
          dateLabel: format(dateObj, 'EEE dd/MM', { locale: ptBR }),
          energyLevel: r.energyLevel ?? 0,
          tasksCompleted: r.tasksCompleted ?? 0,
          tasksTotal: r.tasksTotal ?? 0,
          completionRate,
          dayOfWeek: dow,
          dayName: DAY_NAMES[dow],
          aiEnergyPattern: r.aiEnergyPattern,
        } satisfies EnergyDataPoint;
      })
      // Ordena crescente para o gráfico de linha do tempo
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rawReviews]);

  // Calcula estatísticas a partir dos pontos de dados
  const stats: EnergyStats | null = useMemo(() => {
    if (!data || data.length === 0) return null;

    const avgEnergy =
      Math.round((data.reduce((s, d) => s + d.energyLevel, 0) / data.length) * 10) / 10;

    const avgCompletion = Math.round(
      data.reduce((s, d) => s + d.completionRate, 0) / data.length
    );

    // Agrupa por dia da semana para encontrar melhor/pior dia
    const dowMap: Record<number, { sumEnergy: number; count: number }> = {};
    for (const d of data) {
      if (!dowMap[d.dayOfWeek]) dowMap[d.dayOfWeek] = { sumEnergy: 0, count: 0 };
      dowMap[d.dayOfWeek].sumEnergy += d.energyLevel;
      dowMap[d.dayOfWeek].count += 1;
    }

    const dowAvg = Object.entries(dowMap)
      .map(([dow, v]) => ({ dow: Number(dow), avg: v.sumEnergy / v.count }))
      .sort((a, b) => b.avg - a.avg);

    const bestDayOfWeek = dowAvg.length > 0 ? DAY_NAMES[dowAvg[0].dow] : '';
    const worstDayOfWeek =
      dowAvg.length > 0 ? DAY_NAMES[dowAvg[dowAvg.length - 1].dow] : '';

    const peakEnergyDays = data.filter((d) => d.energyLevel >= 7).map((d) => d.date);
    const lowEnergyDays = data.filter((d) => d.energyLevel <= 3).map((d) => d.date);

    // Tendência: compara média de energia das últimas 7 entradas vs 7 anteriores
    const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
    const last7 = sorted.slice(0, 7);
    const prev7 = sorted.slice(7, 14);
    let energyTrend: 'up' | 'down' | 'stable' = 'stable';

    if (last7.length >= 3 && prev7.length >= 3) {
      const avgLast7 = last7.reduce((s, d) => s + d.energyLevel, 0) / last7.length;
      const avgPrev7 = prev7.reduce((s, d) => s + d.energyLevel, 0) / prev7.length;
      if (avgLast7 > avgPrev7 + 0.5) energyTrend = 'up';
      else if (avgLast7 < avgPrev7 - 0.5) energyTrend = 'down';
    }

    // Streak: dias consecutivos mais recentes com energia >= 5
    let streak = 0;
    for (const d of sorted) {
      if (d.energyLevel >= 5) streak++;
      else break;
    }

    return {
      avgEnergy,
      avgCompletion,
      bestDayOfWeek,
      worstDayOfWeek,
      bestEnergyRange: 'Manhã (9h-12h)', // Baseado no perfil TDAH do usuário
      peakEnergyDays,
      lowEnergyDays,
      streak,
      totalReviews: data.length,
      energyTrend,
    } satisfies EnergyStats;
  }, [data]);

  return {
    data,
    stats,
    isLoading: isUserLoading || isCollectionLoading,
  };
}
