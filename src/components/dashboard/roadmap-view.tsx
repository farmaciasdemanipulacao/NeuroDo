'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { RoadmapMilestone, Goal, Project, Subtask, MilestoneStatus } from '@/lib/types';
import { PlusCircle, Rocket, Calendar, GitMerge, Loader2, Trash2, Map as MapIcon, Pencil, Target, ListChecks, X, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useCollection, useUser, deleteDocumentNonBlocking, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, writeBatch, addDoc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { MilestoneForm } from './milestone-form';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { HelpButton } from '../ui/help-button';
import { helpContent } from '@/lib/help-content';
import { breakdownMilestone } from '@/ai/flows/breakdown-milestone';

const getStatusVariant = (status: RoadmapMilestone['status']) => {
    switch (status) {
        case 'Concluído': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'Em Progresso': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'Atrasado': return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'Não Iniciado': return 'bg-muted text-muted-foreground border-border';
        default: return 'bg-muted text-muted-foreground border-border';
    }
}

type RoadmapMilestoneWithDate = RoadmapMilestone & { startDate: Date; endDate: Date };

function MilestoneCard({ 
    milestone, 
    allGoals,
    onEdit,
    onDelete,
} : { 
    milestone: RoadmapMilestoneWithDate, 
    allGoals: Goal[] | null,
    onEdit: () => void,
    onDelete: () => void,
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [deleteChecked, setDeleteChecked] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const subtasksQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'milestones', milestone.id, 'subtasks')
        );
    }, [user, firestore, milestone.id]);

    const { data: subtasks } = useCollection<Subtask>(subtasksQuery);
    
    const dependsOnMilestone = null; // This needs to be passed in if needed
    const linkedGoal = allGoals?.find(g => g.id === milestone.linkedGoalId);

    const completedSubtasks = subtasks?.filter(s => s.status === 'completed' || !!s.linkedTaskId).length || 0;

    const handleCreateTaskFromSubtask = async (subtask: Subtask) => {
        if (!user || !firestore) return;

        const today = new Date().toISOString().split('T')[0];

        const taskData = {
            userId: user.uid,
            content: subtask.title,
            projectId: milestone.projectId,
            linkedMilestoneId: milestone.id,
            linkedGoalId: milestone.linkedGoalId,
            estimatedMinutes: subtask.estimatedMinutes,
            priority: 'medium' as const,
            type: 'Operacional' as const,
            completed: false,
            isMIT: false,
            scheduledDate: today,
            scheduledTime: 'Tarde' as const,
            order: Date.now(),
            createdAt: new Date().toISOString()
        };
        
        try {
            const newTaskRef = await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'tasks'), taskData);
            if (!newTaskRef) throw new Error("Falha ao criar task.");

            const subtaskRef = doc(firestore, 'users', user.uid, 'milestones', milestone.id, 'subtasks', subtask.id);
            updateDocumentNonBlocking(subtaskRef, {
                linkedTaskId: newTaskRef.id,
                status: 'scheduled',
            });
            toast({ title: "Tarefa Criada!", description: `"${subtask.title}" foi adicionada ao seu Plano do Dia.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erro ao criar tarefa", description: error.message });
        }
    };
    
    const handleGenerateChecklist = async () => {
        if (!user || !firestore) return;
        setIsGenerating(true);
        try {
            const result = await breakdownMilestone({
                milestoneTitle: milestone.title,
                milestoneDescription: milestone.description,
                dueDate: milestone.endDate, // milestone.endDate is already a Date object
                projectId: milestone.projectId,
            });
    
            const batch = writeBatch(firestore);
            result.subtasks.forEach((subtask, index) => {
                const subtaskRef = doc(collection(firestore, 'users', user.uid, 'milestones', milestone.id, 'subtasks'));
                batch.set(subtaskRef, {
                    ...subtask,
                    status: 'template',
                    order: index,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            });
            await batch.commit();
    
            toast({ title: "Checklist Gerado!", description: `A IA criou ${result.subtasks.length} subtarefas para este marco.` });
    
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao gerar checklist', description: error.message });
        } finally {
            setIsGenerating(false);
        }
    };


    return (
        <Card className="group transition-all hover:border-primary/50 relative">
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog onOpenChange={() => setDeleteChecked(false)}>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Marco "{milestone.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Esta ação é permanente e não pode ser desfeita. As dependências e subtarefas vinculadas a este marco serão perdidas.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex items-center space-x-2 my-4">
                            <Checkbox id={`confirm-delete-${milestone.id}`} checked={deleteChecked} onCheckedChange={(checked) => setDeleteChecked(!!checked)} />
                            <Label htmlFor={`confirm-delete-${milestone.id}`} className="text-sm">Entendo que esta ação não pode ser desfeita.</Label>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete} disabled={!deleteChecked}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="cursor-pointer" onClick={onEdit}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg pr-20">{milestone.title}</CardTitle>
                        <Badge variant="outline" className={cn("ml-4", getStatusVariant(milestone.status))}>
                            {milestone.status}
                        </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 pt-1 text-xs">
                        <Calendar className="h-3 w-3"/>
                        <span>
                            {format(milestone.startDate, "dd MMM yyyy", { locale: ptBR })} - {format(milestone.endDate, "dd MMM yyyy", { locale: ptBR })}
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="mb-1 flex justify-between items-baseline text-xs">
                            <p className="font-medium">Progresso</p>
                            <p className="font-bold">{milestone.progress}%</p>
                        </div>
                        <Progress value={milestone.progress} className="h-2" />
                    </div>
                    {dependsOnMilestone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <GitMerge className="h-3 w-3" />
                            <span>Depende de: <span className="font-semibold">{dependsOnMilestone.title}</span></span>
                        </div>
                    )}
                    {linkedGoal && (
                        <Badge variant="outline" className="font-normal">
                            <div className="flex items-center gap-1.5">
                                <Target className="h-3 w-3" />
                                <span>Meta: {linkedGoal.title}</span>
                            </div>
                        </Badge>
                    )}
                     {subtasks && (
                        <div className="mt-4 pt-4 border-t border-dashed space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <ListChecks className="h-4 w-4" />
                            <span>Checklist ({completedSubtasks}/{subtasks.length})</span>
                          </div>
                          {subtasks.length > 0 ? (
                            <div className="space-y-1">
                                {subtasks.slice(0, 3).map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-2 text-sm ml-2">
                                    <Checkbox
                                    id={`subtask-${subtask.id}`}
                                    checked={subtask.status !== 'template' || !!subtask.linkedTaskId}
                                    disabled={subtask.status !== 'template' || !!subtask.linkedTaskId}
                                    onCheckedChange={() => handleCreateTaskFromSubtask(subtask)}
                                    />
                                    <label htmlFor={`subtask-${subtask.id}`} className={cn("flex-1", (subtask.status !== 'template' || !!subtask.linkedTaskId) && "text-muted-foreground line-through")}>
                                    {subtask.title}
                                    </label>
                                    {(subtask.status === 'scheduled' || !!subtask.linkedTaskId) && (
                                    <Badge variant="secondary" className="text-xs">
                                        Agendada
                                    </Badge>
                                    )}
                                </div>
                                ))}
                                {subtasks.length > 3 && (
                                <Button variant="link" size="sm" className="text-xs h-auto p-0 ml-8" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                                    Ver todos ({subtasks.length})
                                </Button>
                                )}
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="w-full" onClick={handleGenerateChecklist} disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                                Gerar Checklist com IA
                            </Button>
                          )}
                        </div>
                      )}
                </CardContent>
            </div>
        </Card>
    )
}

export function RoadmapView() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<RoadmapMilestone | null>(null);

  const milestonesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'milestones'));
  }, [user, firestore]);
  const { data: milestones, isLoading: areMilestonesLoading } = useCollection<RoadmapMilestone>(milestonesQuery);
  
  const goalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals, isLoading: areGoalsLoading } = useCollection<Goal>(goalsQuery);

  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'projects'));
  }, [user, firestore]);
  const { data: projects, isLoading: areProjectsLoading } = useCollection<Project>(projectsQuery);

  const isLoading = isUserLoading || areMilestonesLoading || areGoalsLoading || areProjectsLoading;

  const projectsWithMilestones = useMemo(() => {
    if (!milestones || !projects) return [];
    const milestonesWithDate: RoadmapMilestoneWithDate[] = milestones.map(m => {
        const endDate = m.endDate ? (typeof m.endDate === 'string' ? new Date(m.endDate) : (m.endDate as any).toDate()) : new Date();
        let finalStatus: MilestoneStatus = m.status;
        if(endDate && endDate < new Date() && m.status !== 'Concluído') {
            finalStatus = 'Atrasado';
        }
        return {
            ...m,
            startDate: m.startDate ? (typeof m.startDate === 'string' ? new Date(m.startDate) : (m.startDate as any).toDate()) : new Date(),
            endDate: endDate,
            status: finalStatus,
        }
    });

    return projects.map(project => ({
      ...project,
      milestones: milestonesWithDate
        .filter(m => m.projectId === project.id)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    })).filter(p => p.milestones.length > 0);
  }, [milestones, projects]);

  const handleOpenCreateDialog = () => {
    setEditingMilestone(null);
    setIsFormOpen(true);
  };

  const handleOpenEditDialog = (milestone: RoadmapMilestone) => {
    setEditingMilestone(milestone);
    setIsFormOpen(true);
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    if (!firestore || !user) return;
    deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'milestones', milestoneId));
    toast({
        title: 'Marco Excluído',
        description: 'O marco foi removido do seu roadmap.',
    });
  };

    const handleSaveMilestone = async (data: any) => {
        if (!user?.uid || !firestore) {
            console.error('User não autenticado ou firestore indisponível');
            throw new Error('Usuário não autenticado.');
        }

        const statusMap: { [key: string]: MilestoneStatus } = {
            pending: 'Não Iniciado',
            in_progress: 'Em Progresso',
            completed: 'Concluído',
        };
        const mappedStatus: MilestoneStatus = statusMap[data.status as keyof typeof statusMap] || 'Não Iniciado';
        const finalLinkedGoalId = data.linkedGoalId === 'none' ? '' : data.linkedGoalId;

        if (editingMilestone) {
            const milestoneRef = doc(firestore, 'users', user.uid, 'milestones', editingMilestone.id);
            const updateData = {
                title: data.title,
                description: data.description || '',
                projectId: data.projectId,
                linkedGoalId: finalLinkedGoalId,
                endDate: data.dueDate,
                status: mappedStatus,
                progress: mappedStatus === 'Concluído' ? 100 : (editingMilestone.progress || 0),
                updatedAt: new Date(),
            };
            await updateDoc(milestoneRef, updateData);
        } else {
            const milestonesCollection = collection(firestore, 'users', user.uid, 'milestones');
            const newData = {
                title: data.title,
                description: data.description || '',
                projectId: data.projectId,
                linkedGoalId: finalLinkedGoalId,
                startDate: new Date(),
                endDate: data.dueDate,
                status: mappedStatus,
                progress: 0,
                userId: user.uid,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await addDoc(milestonesCollection, newData);
        }
    };


  return (
    <div>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Roadmap</h1>
                <HelpButton title="Como usar o Roadmap" content={helpContent.roadmap} />
            </div>
             <Button onClick={handleOpenCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Marco
            </Button>
        </div>

        {isFormOpen && (
            <MilestoneForm
                key={editingMilestone?.id || 'new'}
                milestone={editingMilestone}
                onSave={handleSaveMilestone}
                onClose={() => {
                  setIsFormOpen(false);
                  setEditingMilestone(null);
                }}
            />
        )}
        
        {isLoading && (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )}

        {!isLoading && milestones && milestones.length === 0 && (
             <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8">
                <MapIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum marco definido</h3>
                <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro marco para começar a construir seu roadmap.</p>
                <Button onClick={handleOpenCreateDialog} className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Marco
                </Button>
            </div>
        )}

        {!isLoading && projectsWithMilestones.length > 0 && (
            <div className="space-y-8">
                {projectsWithMilestones.map(project => (
                    <div key={project.id}>
                        <div className="flex items-center gap-3 mb-4">
                            <Rocket className="h-6 w-6" style={{ color: project.color }} />
                            <h2 className="text-2xl font-bold">{project.name}</h2>
                        </div>
                        <div className="border-l-2 pl-6 ml-3 space-y-6" style={{ borderColor: project.color }}>
                            {project.milestones.map(milestone => (
                                <MilestoneCard
                                  key={milestone.id}
                                  milestone={milestone}
                                  allGoals={goals}
                                  onEdit={() => handleOpenEditDialog(milestone)}
                                  onDelete={() => handleDeleteMilestone(milestone.id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}
