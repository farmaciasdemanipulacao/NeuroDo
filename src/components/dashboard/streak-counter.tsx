'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Loader2 } from 'lucide-react';
import { useUserStats } from '@/hooks/use-user-stats';

export function StreakCounter() {
  const { data: userStats, isLoading } = useUserStats();
  const streak = userStats?.currentStreak ?? 0;

  return (
    <Card className="bg-gradient-to-br from-accent/20 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Sequência Atual</CardTitle>
        <Flame className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-5xl font-bold text-accent">{streak}</div>
            <p className="text-xs text-muted-foreground">dias de progresso consistente</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
