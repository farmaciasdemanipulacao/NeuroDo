'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Loader2 } from 'lucide-react';
import type { UserStats } from '@/lib/types';
import { cn } from '@/lib/utils';

const getBusinessTitle = (level: number): string => {
  if (level >= 50) return 'Soberano';
  if (level >= 30) return 'Visionário';
  if (level >= 20) return 'Estrategista';
  if (level >= 10) return 'Tático';
  return 'Operador';
};

const calculateLevelInfo = (totalXP: number) => {
    // Linear progression: every 1000 XP is a new level.
    const level = Math.floor(totalXP / 1000) + 1;
    const currentLevelBaseXP = (level - 1) * 1000;
    const currentXP = totalXP - currentLevelBaseXP;
    const nextLevelXP = 1000;

    return {
        level,
        currentXP,
        nextLevelXP,
    };
};


export function GamificationHeader() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userStatsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'user_stats', 'data');
  }, [user, firestore]);

  const { data: userStats, isLoading: areStatsLoading } = useDoc<UserStats>(userStatsRef);

  const isLoading = isAuthLoading || areStatsLoading;

  const { level, currentXP, nextLevelXP, title, progressPercentage } = useMemo(() => {
    const stats = userStats;
    const { level, currentXP, nextLevelXP } = calculateLevelInfo(stats?.totalXP ?? 0);
    
    return {
      level: stats?.level ?? level,
      currentXP: currentXP,
      nextLevelXP: nextLevelXP,
      title: getBusinessTitle(stats?.level ?? level),
      progressPercentage: Math.min(100, (currentXP / nextLevelXP) * 100),
    };
  }, [userStats]);

  const streak = userStats?.currentStreak ?? 0;

  if (isLoading) {
    return (
      <Card className="p-4 col-span-full h-24 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-4 col-span-full">
      <div className="flex justify-between items-start">
        <div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                Nível {level} • {title}
            </h2>
             <p className="text-xs text-muted-foreground">
                {currentXP} / {nextLevelXP} XP para o próximo nível
            </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{streak}</span>
          <Flame
            className={cn(
              'h-6 w-6',
              streak > 0 ? 'text-orange-500 fill-orange-400' : 'text-muted-foreground/50'
            )}
          />
        </div>
      </div>
      <Progress value={progressPercentage} className="mt-2 h-2" indicatorClassName="bg-gradient-to-r from-blue-600 to-purple-600" />
    </Card>
  );
}

    