"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function GamificationReportPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Gamificação</CardTitle>
          <CardDescription>
            Quais conquistas, níveis e streaks você já desbloqueou?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">O que é este relatório?</h3>
            <p className="text-sm text-muted-foreground">
              Aqui você acompanha seu progresso em gamificação: conquistas, níveis, streaks e recompensas. Use esses dados para se motivar e celebrar suas vitórias!
            </p>
          </div>
          <div className="mt-8 text-muted-foreground text-sm">
            (Em breve: gráficos e conquistas desbloqueadas.)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
