'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  Wand2,
  PlusCircle,
  CheckCircle2,
  ListChecks,
  ChevronUp,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { useCollection, useDoc, useMemoFirebase, useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { RoadmapMilestone, Subtask, Goal, Project, MilestoneStatus } from '@/lib/types';
import { MilestoneForm } from './milestone-form';
import { breakdownMilestone } from '@/ai/flows/breakdown-milestone';

const getStatusVariant = (status: RoadmapMilestone['status']) => {
  switch (status) {
    case 'Concluído': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Em Progresso': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Atrasado': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'Não Iniciado': return 'bg-muted text-muted-foreground border-border';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

interface MilestoneDetailViewProps {
  milestoneId: string;
}

export function MilestoneDetailView({ milestoneId }: MilestoneDetailViewProps) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskMinutes, setNewSubtaskMinutes] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  // Load milestone
  const milestoneRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'milestones', milestoneId);
  }, [user, firestore, milestoneId]);
  const { data: milestone, isLoading: isMilestoneLoading } = useDoc<RoadmapMilestone>(milestoneRef);

  // Load subtasks
  const subtasksQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'milestones', milestoneId, 'subtasks'));
  }, [user, firestore, milestoneId]);
  const { data: subtasksRaw, isLoading: areSubtasksLoading } = useCollection<Subtask>(subtasksQuery);

  // Load goals
  const goalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals } = useCollection<Goal>(goalsQuery);

  // Load projects
  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'projects'));
  }, [user, firestore]);
  const { data: projects } = useCollection<Project>(projectsQuery);

  const isLoading = isUserLoading || isMilestoneLoading || areSubtasksLoading;

  // Sort subtasks by order
  const subtasks = useMemo(() => {
    if (!subtasksRaw) return [];
    return [...subtasksRaw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [subtasksRaw]);

  const completedCount = subtasks.filter(s => s.status === 'completed' || !!s.linkedTaskId).length;
  const totalMinutes = subtasks.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

  const linkedGoal = goals?.find(g => g.id === milestone?.linkedGoalId);

  const milestoneWithDates = useMemo(() => {
    if (!milestone) return null;
    return {
      ...milestone,
      startDate: milestone.startDate
        ? (typeof milestone.startDate === 'string' ? new Date(milestone.startDate) : (milestone.startDate as any).toDate())
        : new Date(),
      endDate: milestone.endDate
        ? (typeof milestone.endDate === 'string' ? new Date(milestone.endDate) : (milestone.endDate as any).toDate())
        : new Date(),
    };
  }, [milestone]);

  const handleCreateTaskFromSubtask = async (subtask: Subtask) => {
    if (!user || !firestore || !milestone) return;
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
      createdAt: new Date().toISOString(),
    };
    try {
      const newTaskRef = await addDocumentNonBlocking(
        collection(firestore, 'users', user.uid, 'tasks'),
        taskData
      );
      if (!newTaskRef) throw new Error('Falha ao criar tarefa.');
      const subtaskRef = doc(firestore, 'users', user.uid, 'milestones', milestoneId, 'subtasks', subtask.id);
      updateDocumentNonBlocking(subtaskRef, { linkedTaskId: newTaskRef.id, status: 'scheduled' });
      toast({ title: 'Tarefa Criada!', description: `"${subtask.title}" foi adicionada ao seu Plano do Dia.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar tarefa', description: error.message });
    }
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!user || !firestore) return;
    deleteDocumentNonBlocking(
      doc(firestore, 'users', user.uid, 'milestones', milestoneId, 'subtasks', subtaskId)
    );
    toast({ title: 'Subtarefa removida' });
  };

  const handleAddSubtask = async () => {
    if (!user || !firestore || !newSubtaskTitle.trim()) return;
    setIsAddingSubtask(true);
    try {
      await addDocumentNonBlocking(
        collection(firestore, 'users', user.uid, 'milestones', milestoneId, 'subtasks'),
        {
          title: newSubtaskTitle.trim(),
          estimatedMinutes: parseInt(newSubtaskMinutes) || 0,
          energyRequired: 3,
          status: 'template',
          order: subtasks.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
      setNewSubtaskTitle('');
      setNewSubtaskMinutes('');
      toast({ title: 'Subtarefa adicionada!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar subtarefa', description: error.message });
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleGenerateChecklist = async () => {
    if (!user || !firestore || !milestone) return;
    setIsGenerating(true);
    try {
      const endDate = milestoneWithDates?.endDate ?? new Date();
      const result = await breakdownMilestone({
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        dueDate: endDate,
        projectId: milestone.projectId,
      });
      const batch = writeBatch(firestore);
      result.subtasks.forEach((subtask, index) => {
        const subtaskRef = doc(
          collection(firestore, 'users', user.uid, 'milestones', milestoneId, 'subtasks')
        );
        batch.set(subtaskRef, {
          ...subtask,
          status: 'template',
          order: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      toast({ title: 'Checklist Gerado!', description: `A IA criou ${result.subtasks.length} subtarefas para este marco.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao gerar checklist', description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMoveSubtask = (subtask: Subtask, direction: 'up' | 'down') => {
    if (!user || !firestore) return;
    const idx = subtasks.findIndex(s => s.id === subtask.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= subtasks.length) return;
    const sibling = subtasks[swapIdx];
    const subtaskRef = doc(firestore, 'users', user.uid, 'milestones', milestoneId, 'subtasks', subtask.id);
    const siblingRef = doc(firestore, 'users', user.uid, 'milestones', milestoneId, 'subtasks', sibling.id);
    updateDocumentNonBlocking(subtaskRef, { order: sibling.order });
    updateDocumentNonBlocking(siblingRef, { order: subtask.order });
  };

  const handleStartEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const handleSaveEditSubtask = async (subtaskId: string) => {
    if (!user || !firestore || !editingSubtaskTitle.trim()) return;
    const subtaskRef = doc(firestore, 'users', user.uid, 'milestones', milestoneId, 'subtasks', subtaskId);
    updateDocumentNonBlocking(subtaskRef, { title: editingSubtaskTitle.trim(), updatedAt: new Date().toISOString() });
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
    toast({ title: 'Subtarefa atualizada' });
  };

  const handleSaveMilestone = async (data: any) => {
    if (!user?.uid || !firestore || !milestone) throw new Error('Usuário não autenticado.');
    const statusMap: { [key: string]: MilestoneStatus } = {
      pending: 'Não Iniciado',
      in_progress: 'Em Progresso',
      completed: 'Concluído',
    };
    const mappedStatus: MilestoneStatus = statusMap[data.status as keyof typeof statusMap] || 'Não Iniciado';
    const finalLinkedGoalId = data.linkedGoalId === 'none' ? '' : data.linkedGoalId;
    const milestoneRef = doc(firestore, 'users', user.uid, 'milestones', milestone.id);
    await updateDoc(milestoneRef, {
      title: data.title,
      description: data.description || '',
      projectId: data.projectId,
      linkedGoalId: finalLinkedGoalId,
      endDate: data.dueDate,
      status: mappedStatus,
      progress: mappedStatus === 'Concluído' ? 100 : (milestone.progress || 0),
      updatedAt: new Date(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Marco não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{milestone.title}</h1>
              <Badge variant="outline" className={cn(getStatusVariant(milestone.status))}>
                {milestone.status}
              </Badge>
            </div>
            {linkedGoal && (
              <p className="text-sm text-muted-foreground mt-1">Meta: {linkedGoal.title}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar Marco
        </Button>
      </div>

      {/* Dates and description */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {milestoneWithDates && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              {format(milestoneWithDates.startDate, "dd MMM yyyy", { locale: ptBR })}
              {' — '}
              {format(milestoneWithDates.endDate, "dd MMM yyyy", { locale: ptBR })}
            </span>
          </div>
        )}
      </div>

      {milestone.description && (
        <p className="text-sm text-muted-foreground">{milestone.description}</p>
      )}

      {/* Progress */}
      <div>
        <div className="mb-1 flex justify-between items-baseline text-sm">
          <span className="font-medium">Progresso geral</span>
          <span className="font-bold">{milestone.progress}%</span>
        </div>
        <Progress value={milestone.progress} className="h-3" />
      </div>

      {/* Metrics */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" />
            <span>{completedCount} de {subtasks.length} subtarefas concluídas</span>
          </div>
          {totalMinutes > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Total estimado: {formatMinutes(totalMinutes)}</span>
            </div>
          )}
        </div>
      )}

      {/* Subtasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Subtarefas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subtasks.length === 0 ? (
            <div className="text-center py-8">
              <ListChecks className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhuma subtarefa ainda. Gere com IA ou adicione manualmente.
              </p>
              <Button
                className="mt-4"
                onClick={handleGenerateChecklist}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Gerar com IA
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {subtasks.map((subtask, idx) => {
                const isDone = subtask.status === 'completed' || !!subtask.linkedTaskId;
                const isScheduled = subtask.status === 'scheduled' || !!subtask.linkedTaskId;
                const isEditingThis = editingSubtaskId === subtask.id;

                return (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group/subtask"
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/subtask:opacity-100 transition-opacity"
                        disabled={idx === 0}
                        onClick={() => handleMoveSubtask(subtask, 'up')}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/subtask:opacity-100 transition-opacity"
                        disabled={idx === subtasks.length - 1}
                        onClick={() => handleMoveSubtask(subtask, 'down')}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Checkbox */}
                    <Checkbox
                      checked={isDone}
                      disabled={isDone}
                      onCheckedChange={() => !isDone && handleCreateTaskFromSubtask(subtask)}
                    />

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      {isEditingThis ? (
                        <Input
                          value={editingSubtaskTitle}
                          autoFocus
                          className="h-7 text-sm"
                          onChange={e => setEditingSubtaskTitle(e.target.value)}
                          onBlur={() => handleSaveEditSubtask(subtask.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEditSubtask(subtask.id);
                            if (e.key === 'Escape') { setEditingSubtaskId(null); setEditingSubtaskTitle(''); }
                          }}
                        />
                      ) : (
                        <span
                          className={cn(
                            'text-sm cursor-text',
                            isDone && 'text-muted-foreground line-through'
                          )}
                          onDoubleClick={() => !isDone && handleStartEditSubtask(subtask)}
                        >
                          {subtask.title}
                        </span>
                      )}
                    </div>

                    {/* Status badge */}
                    {subtask.status === 'template' && !subtask.linkedTaskId && (
                      <Badge variant="outline" className="text-xs shrink-0">Template</Badge>
                    )}
                    {isScheduled && subtask.status !== 'completed' && (
                      <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30 shrink-0">Agendada</Badge>
                    )}
                    {subtask.status === 'completed' && (
                      <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-green-500/30 shrink-0">Concluída</Badge>
                    )}

                    {/* Estimated time */}
                    {subtask.estimatedMinutes > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">{formatMinutes(subtask.estimatedMinutes)}</span>
                    )}

                    {/* Action button */}
                    {subtask.status === 'template' && !subtask.linkedTaskId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => handleCreateTaskFromSubtask(subtask)}
                      >
                        <PlusCircle className="mr-1 h-3 w-3" />
                        Criar Tarefa
                      </Button>
                    )}
                    {(subtask.status === 'scheduled' || !!subtask.linkedTaskId) && subtask.status !== 'completed' && (
                      <span className="text-xs text-muted-foreground shrink-0">Tarefa criada</span>
                    )}
                    {subtask.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    )}

                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover/subtask:opacity-100 transition-opacity shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir subtarefa?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A subtarefa "{subtask.title}" será removida permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSubtask(subtask.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}

          {/* Generate more subtasks button */}
          {subtasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={handleGenerateChecklist}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Gerar mais subtarefas com IA
            </Button>
          )}

          {/* Add subtask manually */}
          <div className="pt-4 border-t border-dashed">
            <p className="text-sm font-medium mb-3">Adicionar Subtarefa Manualmente</p>
            <div className="flex gap-2">
              <Input
                placeholder="Título da subtarefa..."
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
              />
              <Input
                type="number"
                placeholder="min"
                value={newSubtaskMinutes}
                onChange={e => setNewSubtaskMinutes(e.target.value)}
                className="w-20"
              />
              <Button
                onClick={handleAddSubtask}
                disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                size="sm"
              >
                {isAddingSubtask ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                <span className="ml-1">Adicionar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestone edit form */}
      {isFormOpen && milestone && milestoneWithDates && (
        <MilestoneForm
          key={milestone.id}
          milestone={{ ...milestoneWithDates, dueDate: milestoneWithDates.endDate }}
          onSave={handleSaveMilestone}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
