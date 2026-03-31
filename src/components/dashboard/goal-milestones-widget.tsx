'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Goal, RoadmapMilestone } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Map as MapIcon, CheckCircle2, Circle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalMilestonesWidgetProps {
  goal: Goal;
}

export function GoalMilestonesWidget({ goal }: GoalMilestonesWidgetProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const milestonesQuery = useMemoFirebase(() => {
    if (!user || !firestore || !goal.id) return null;
    return query(
      collection(firestore, 'users', user.uid, 'milestones'),
      where('linkedGoalId', '==', goal.id)
    );
  }, [user, firestore, goal.id]);

  const { data: milestones, isLoading: areMilestonesLoading } = useCollection<RoadmapMilestone>(milestonesQuery);

  const isLoading = isUserLoading || areMilestonesLoading;

  const { completedCount, progressPercent } = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      return { completedCount: 0, progressPercent: 0 };
    }
    const completed = milestones.filter(m => m.status === 'Concluído').length;
    return {
      completedCount: completed,
      progressPercent: (completed / milestones.length) * 100,
    };
  }, [milestones]);

  if (isLoading) {
    return <Card className="p-4 flex justify-center items-center h-24"><Loader2 className="animate-spin" /></Card>;
  }

  if (!milestones || milestones.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50 border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
          <MapIcon className="h-4 w-4" />
          Marcos da Meta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progresso dos Marcos</span>
            <span className="font-medium">{completedCount} / {milestones.length} concluídos</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        
        <div className="space-y-2">
          {milestones
            .sort((a, b) => (typeof a.endDate === 'string' ? new Date(a.endDate) : (a.endDate as any).toDate()).getTime() - (typeof b.endDate === 'string' ? new Date(b.endDate) : (b.endDate as any).toDate()).getTime())
            .map(milestone => {
                const isCompleted = milestone.status === 'Concluído';
                const isInProgress = milestone.status === 'Em Progresso';
                const isDelayed = milestone.status === 'Atrasado';

                return (
                  <div key={milestone.id} className="flex items-center justify-between p-2 rounded border text-sm bg-background/50">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : isDelayed ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : isInProgress ? (
                        <Circle className="h-3 w-3 text-blue-500 fill-blue-500" />
                      ) : (
                        <Circle className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className={cn(isCompleted && "line-through text-muted-foreground")}>
                        {milestone.title}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(typeof milestone.endDate === 'string' ? new Date(milestone.endDate) : (milestone.endDate as any).toDate(), 'dd MMM', { locale: ptBR })}
                    </span>
                  </div>
                )
            })}
        </div>
      </CardContent>
    </Card>
  );
}
