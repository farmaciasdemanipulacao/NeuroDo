'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2 } from 'lucide-react';
import type { UserStats } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSharedUserStats } from '@/context/dashboard-data-provider';

const getBusinessTitle = (level: number): string => {
  if (level >= 50) return 'Soberano';
  if (level >= 30) return 'Visionário';
  if (level >= 20) return 'Estrategista';
  if (level >= 10) return 'Tático';
  return 'Operador';
};

export function XPWidget() {
  const { data: userStats, isLoading } = useSharedUserStats();

  const { level, currentXP, nextLevelXP, title, progressPercentage } = useMemo(() => {
    const stats = userStats;
    const totalXP = stats?.totalXP ?? 0;
    const currentLevel = stats?.level ?? Math.floor(totalXP / 1000) + 1;
    const currentLevelBaseXP = (currentLevel - 1) * 1000;
    const xpIntoLevel = totalXP - currentLevelBaseXP;
    const xpForNextLevel = 1000;
    
    return {
      level: currentLevel,
      currentXP: xpIntoLevel,
      nextLevelXP: xpForNextLevel,
      title: getBusinessTitle(currentLevel),
      progressPercentage: Math.min(100, (xpIntoLevel / xpForNextLevel) * 100),
    };
  }, [userStats]);

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[180px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Nível {level} • {title}</span>
           <Sparkles className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{userStats?.totalXP ?? 0} XP</div>
        <p className="text-xs text-muted-foreground">
          {currentXP} / {nextLevelXP} para o próximo nível
        </p>
        <Progress value={progressPercentage} className="mt-2 h-2" />
      </CardContent>
    </Card>
  );
}

    