'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/hooks/use-app';
import { StreakCounter } from '@/components/dashboard/streak-counter';
import { ProjectOverview } from '@/components/dashboard/project-overview';
import { TaskSuggestions } from '@/components/dashboard/task-suggestions';
import { Sparkles, Loader2, Target } from 'lucide-react';
import { DailyGoalWidget } from '@/components/dashboard/daily-goal-widget';
import { useFirestore, useUser } from '@/firebase';
import { seedDatabase } from '@/lib/seed';
import { useToast } from '@/hooks/use-toast';
import { GamificationHeader } from '@/components/dashboard/gamification-header';
import { HelpButton } from '@/components/ui/help-button';
import { helpContent } from '@/lib/help-content';
import { RevenueGoalWidget } from '@/components/dashboard/revenue-goal-widget';
import { UpdateGoalDialog } from '@/components/dashboard/update-goal-dialog';
import { XPWidget } from '@/components/dashboard/xp-widget';
import { DailyPlanView } from '@/components/dashboard/daily-plan-view';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSeed = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Usuário não autenticado',
        description: 'Por favor, aguarde a autenticação antes de popular os dados.',
      });
      return;
    }
    setIsSeeding(true);
    try {
      const seeded = await seedDatabase(firestore, user.uid);
      if (seeded) {
        toast({
          title: 'Dados Criados!',
          description: 'Seu banco de dados foi populado com dados de teste. Atualize a página para vê-los.',
        });
      } else {
         toast({
          title: 'Dados Já Existem',
          description: 'Nenhuma ação foi necessária.',
        });
      }
    } catch (error: any) {
      console.error('Falha ao popular o banco de dados:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Popular Dados',
        description: error.message,
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
          <HelpButton title="Como usar o Painel" content={helpContent.dashboard} />
        </div>
        <div className="flex items-center gap-2">
            <UpdateGoalDialog>
                <Button variant="outline">
                    <Target className="mr-2 h-4 w-4" />
                    Avançar Meta
                </Button>
            </UpdateGoalDialog>
             <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
              {isSeeding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Popular Dados
            </Button>
        </div>
      </div>

      {/* Grid Superior */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <RevenueGoalWidget />
        </div>
        <StreakCounter />
        <XPWidget />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-2 space-y-6">
          <DailyPlanView />
          <TaskSuggestions />
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
           <DailyGoalWidget />
           <ProjectOverview />
        </div>
      </div>
    </div>
  );
}
