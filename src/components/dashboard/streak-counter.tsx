'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { useApp } from '@/hooks/use-app';

export function StreakCounter() {
  const { streak } = useApp();

  return (
    <Card className="bg-gradient-to-br from-accent/20 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Sequência Atual</CardTitle>
        <Flame className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-5xl font-bold text-accent">{streak}</div>
        <p className="text-xs text-muted-foreground">dias de progresso consistente</p>
      </CardContent>
    </Card>
  );
}
