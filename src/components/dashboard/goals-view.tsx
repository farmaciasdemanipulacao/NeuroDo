'use client';

import { useState, useMemo } from 'react';
import type { Goal } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import { Award, Calendar, Flag, Target, PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useCollection, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, doc } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { GoalForm } from './goal-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ptBR } from 'date-fns/locale';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { HelpButton } from '../ui/help-button';
import { helpContent } from '@/lib/help-content';
import { GoalMilestonesWidget } from './goal-milestones-widget';

const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
};

const GoalTimeline = ({ goal }: { goal: Goal }) => {
    const startDate = typeof goal.startDate === 'string' ? new Date(goal.startDate) : (goal.startDate as any)?.toDate();
    const endDate = typeof goal.endDate === 'string' ? new Date(goal.endDate) : (goal.endDate as any)?.toDate();

    if (!startDate || !endDate) return null;

    const today = new Date();

    // Prevent division by zero or negative duration
    const totalDuration = Math.max(1, differenceInDays(endDate, startDate));
    const elapsedDuration = differenceInDays(today, startDate);
    const progressPercentage = Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100));
    
    const daysRemaining = differenceInDays(endDate, today);

    let statusText;
    let statusColor = 'text-muted-foreground';

    if (goal.status === 'completed') {
        statusText = 'Concluída!';
        statusColor = 'text-green-500';
    } else if (daysRemaining < 0) {
        statusText = `Atrasada por ${Math.abs(daysRemaining)} dias`;
        statusColor = 'text-red-500';
    } else {
        statusText = `${daysRemaining} dias restantes`;
    }

    return (
        <div className="space-y-2 mt-4">
            <div className="relative w-full h-1 bg-muted rounded-full">
                <div 
                    className="absolute h-1 bg-primary rounded-full" 
                    style={{ 
                        left: 0,
                        width: `${progressPercentage}%`
                    }}
                ></div>
                 <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full border-2 border-background"
                    style={{ left: `${progressPercentage}%`}}
                    title="Hoje"
                ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{format(startDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                <span>{format(endDate, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <p className={cn("text-center text-xs", statusColor)}>{statusText}</p>
        </div>
    );
};


const GoalCard = ({ goal, level, onEdit, onDelete }: { goal: Goal, level: string, onEdit: () => void, onDelete: () => void }) => {
    const progressColor = getProgressColor(goal.progress);
    const [deleteChecked, setDeleteChecked] = useState(false);

    const levelStyles = {
        yearly: { icon: Award, color: 'text-amber-400', cardBg: 'bg-amber-400/5', borderColor: 'border-amber-400/20' },
        quarterly: { icon: Flag, color: 'text-sky-400', cardBg: 'bg-sky-400/5', borderColor: 'border-sky-400/20' },
        monthly: { icon: Target, color: 'text-indigo-400', cardBg: 'bg-indigo-400/5', borderColor: 'border-indigo-400/20' },
        weekly: { icon: Calendar, color: 'text-fuchsia-400', cardBg: 'bg-fuchsia-400/5', borderColor: 'border-fuchsia-400/20' },
    };
    const levelMapping = {
        yearly: 'Anual',
        quarterly: 'Trimestral',
        monthly: 'Mensal',
        weekly: 'Semanal',
    }

    const { icon: Icon, color, cardBg, borderColor } = levelStyles[level as keyof typeof levelStyles] || levelStyles.weekly;

    return (
        <Card className={cn("flex flex-col group transition-all relative", cardBg, borderColor, "hover:border-primary/50")}>
            <AlertDialog onOpenChange={() => setDeleteChecked(false)}>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Meta "{goal.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Tem certeza? Esta ação é permanente. Considere editar a meta em vez de excluir. Metas filhas serão desvinculadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <div className="flex items-center space-x-2 my-4">
                        <Checkbox id="confirm-delete" checked={deleteChecked} onCheckedChange={(checked) => setDeleteChecked(!!checked)} />
                        <Label htmlFor="confirm-delete" className="text-sm">Entendo que esta ação não pode ser desfeita.</Label>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} disabled={!deleteChecked}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="cursor-pointer flex-grow" onClick={onEdit}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className={cn("text-lg flex items-center gap-2", color)}>
                            <Icon className="h-5 w-5" />
                            Meta {levelMapping[level as keyof typeof levelMapping]}
                        </CardTitle>
                    </div>
                    <CardDescription className="pt-1 !ml-0 text-base text-card-foreground font-semibold">{goal.title}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                    <div>
                        <div className="mb-1 flex justify-between items-baseline text-xs">
                            <p className="font-medium">Progresso</p>
                            <p className="font-bold">{goal.progress}%</p>
                        </div>
                        <Progress value={goal.progress} indicatorClassName={progressColor} />
                    </div>
                    <GoalTimeline goal={goal} />
                </CardContent>
            </div>
        </Card>
    );
}

export function GoalsView() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    const goalsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'goals'));
    }, [user, firestore]);

    const { data: goals, isLoading: areGoalsLoading } = useCollection<Goal>(goalsQuery);

    const { annualGoals, quarterlyGoals, monthlyGoals, weeklyGoals } = useMemo(() => {
        const sortedGoals = goals ? [...goals].sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()) : [];
        return {
            annualGoals: sortedGoals.filter(g => g.type === 'yearly'),
            quarterlyGoals: sortedGoals.filter(g => g.type === 'quarterly'),
            monthlyGoals: sortedGoals.filter(g => g.type === 'monthly'),
            weeklyGoals: sortedGoals.filter(g => g.type === 'weekly'),
        };
    }, [goals]);
    
    const isLoading = isUserLoading || areGoalsLoading;

    const handleOpenEditDialog = (goal: Goal) => {
        setEditingGoal(goal);
        setIsFormOpen(true);
    };
    
    const handleOpenCreateDialog = () => {
        setEditingGoal(null);
        setIsFormOpen(true);
    };

    const handleDeleteGoal = (goalId: string) => {
        if (!firestore || !user) return;
        deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'goals', goalId));
        toast({
            title: 'Meta excluída',
            description: 'Sua meta foi removida da pirâmide.',
        });
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingGoal(null);
    };

  return (
    <>
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Pirâmide de Metas</h1>
          <HelpButton title="Como usar a Pirâmide de Metas" content={helpContent.goals} />
        </div>
        <Button onClick={handleOpenCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Meta
        </Button>
      </div>
     
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{editingGoal ? 'Editar Meta' : 'Adicionar Nova Meta'}</DialogTitle>
            </DialogHeader>
            <GoalForm 
                key={editingGoal?.id || 'new'} 
                goal={editingGoal} 
                allGoals={goals || []} 
                onSuccess={handleFormSuccess} 
            />
        </DialogContent>
      </Dialog>
      
        {isLoading && (
            <div className="flex items-center justify-center py-24">
                 <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )}

        {!isLoading && goals && goals.length === 0 && (
             <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8">
                <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma meta definida</h3>
                <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira meta para começar a construir sua pirâmide.</p>
                <Button onClick={handleOpenCreateDialog} className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Meta
                </Button>
            </div>
        )}

      {!isLoading && goals && goals.length > 0 && (
         <div className="space-y-8 mt-8">
            {annualGoals.length > 0 && (
                <div className="relative flex justify-center">
                    {annualGoals.map(goal => (
                      <div key={goal.id} className="space-y-4 w-full max-w-sm">
                        <GoalCard goal={goal} level="yearly" onEdit={() => handleOpenEditDialog(goal)} onDelete={() => handleDeleteGoal(goal.id)} />
                        <GoalMilestonesWidget goal={goal} />
                      </div>
                    ))}
                </div>
            )}
            
            {quarterlyGoals.length > 0 && <div className="relative h-8"><div className="absolute top-0 left-1/2 w-px h-full bg-border -translate-x-1/2"></div></div>}

            {quarterlyGoals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                    <div className="absolute top-[-2rem] left-0 w-full h-px bg-border"></div>
                    {quarterlyGoals.map(goal => (
                      <div key={goal.id} className="space-y-4">
                        <GoalCard key={goal.id} goal={goal} level="quarterly" onEdit={() => handleOpenEditDialog(goal)} onDelete={() => handleDeleteGoal(goal.id)} />
                        <GoalMilestonesWidget goal={goal} />
                      </div>
                    ))}
                </div>
            )}

            {monthlyGoals.length > 0 && <div className="relative h-8"><div className="absolute top-0 left-1/2 w-px h-full bg-border -translate-x-1/2"></div></div>}

            {monthlyGoals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                    <div className="absolute top-[-2rem] left-0 w-full h-px bg-border"></div>
                    {monthlyGoals.map(goal => (
                       <div key={goal.id} className="space-y-4">
                        <GoalCard key={goal.id} goal={goal} level="monthly" onEdit={() => handleOpenEditDialog(goal)} onDelete={() => handleDeleteGoal(goal.id)} />
                        <GoalMilestonesWidget goal={goal} />
                       </div>
                    ))}
                </div>
            )}

            {weeklyGoals.length > 0 && <div className="relative h-8"><div className="absolute top-0 left-1/2 w-px h-full bg-border -translate-x-1/2"></div></div>}

            {weeklyGoals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    <div className="absolute top-[-2rem] left-0 w-full h-px bg-border"></div>
                    {weeklyGoals.map(goal => (
                      <div key={goal.id} className="space-y-4">
                        <GoalCard key={goal.id} goal={goal} level="weekly" onEdit={() => handleOpenEditDialog(goal)} onDelete={() => handleDeleteGoal(goal.id)} />
                        <GoalMilestonesWidget goal={goal} />
                      </div>
                    ))}
                </div>
            )}
         </div>
      )}
    </>
  );
}
