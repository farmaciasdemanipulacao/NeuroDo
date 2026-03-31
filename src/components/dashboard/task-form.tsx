'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import type { Task, TeamMember, TaskType, Delegation, Goal } from '@/lib/types';
import { projects } from '@/lib/data';
import { Loader2, Save, User, UserCheck, Target, HelpCircle, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn, formatValue } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { DelegationForm } from './delegation-form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { Label } from '@/components/ui/label';


// --- SKILL & TYPE MATCHING LOGIC ---

const analyzeTaskForDelegation = (taskTitle: string, teamMembers: TeamMember[]): TeamMember | null => {
  const keywords: { [key: string]: string[] } = {
    'elen': ["financeiro", "nota", "boleto", "pagamento", "cobrança", "banco", "fiscal", "contador", "administrativo"],
    'kaory': ["organizar", "processo", "planilha", "documentar", "checklist", "acompanhar", "projeto", "cronograma", "gestão"],
    'bia': ["post", "social", "instagram", "conteúdo", "stories", "feed", "legenda", "social media", "atendimento", "cliente"],
    'wesley': ["tráfego", "anúncio", "campanha", "meta ads", "google ads", "pixel", "conversão", "ads"],
    'bruno': ["lead", "prospecção", "cold", "linkedin", "contato", "lista", "prospectar", "sdr", "outbound"],
    'isa': ["vídeo", "edição", "editar", "cortar", "youtube", "reels", "podcast", "thumbnail", "render"],
  };

  const text = taskTitle.toLowerCase();
  
  for (const member of teamMembers) {
      const memberKeywords = keywords[member.id as keyof typeof keywords];
      if(memberKeywords && memberKeywords.some(word => text.includes(word))) {
          return member;
      }
  }
  
  return null;
};

const taskTypes: TaskType[] = ['Operacional', 'Tático', 'Estratégico'];

const taskFormSchema = z.object({
  content: z.string().min(5, 'A tarefa precisa ter pelo menos 5 caracteres.'),
  projectId: z.string().optional(),
  type: z.enum(['Operacional', 'Tático', 'Estratégico']).default('Operacional'),
  isMIT: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  scheduledTime: z.enum(['Manhã', 'Tarde', 'Noite']).default('Manhã'),
  specificTime: z.string().optional(),
  estimatedMinutes: z.coerce.number().positive('Os minutos devem ser um número positivo.'),
  linkedGoalId: z.string().optional(),
  goalIncrementValue: z.coerce.number().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  task: Task | null;
  goals: Goal[];
  closeDialog: () => void;
}

const getDefaultValues = (task: Task | null): TaskFormValues => {
    if (task) {
        return {
            content: task.content || '',
            projectId: task.projectId || 'none',
            type: task.type || 'Operacional',
            isMIT: task.isMIT || false,
            priority: task.priority || 'medium',
            scheduledTime: task.scheduledTime || 'Manhã',
            specificTime: task.specificTime || '',
            estimatedMinutes: task.estimatedMinutes || 30,
            linkedGoalId: task.linkedGoalId || 'none',
            goalIncrementValue: task.goalIncrementValue || 0,
        };
    }
    return {
        content: '',
        projectId: 'none',
        type: 'Operacional',
        isMIT: false,
        priority: 'medium',
        scheduledTime: 'Manhã',
        specificTime: '',
        estimatedMinutes: 30,
        linkedGoalId: 'none',
        goalIncrementValue: 0,
    };
};

export function TaskForm({ task, goals, closeDialog }: TaskFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const teamQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'team'));
  }, [user, firestore]);
  const { data: teamMembers } = useCollection<TeamMember>(teamQuery);
  
  const [suggestedMember, setSuggestedMember] = useState<TeamMember | null>(null);
  const [decision, setDecision] = useState<'self' | 'delegate' | null>(null);
  const [selfReason, setSelfReason] = useState<string | null>(null);
  const [isDelegationFormOpen, setIsDelegationFormOpen] = useState(false);
  const [isContributionReadOnly, setIsContributionReadOnly] = useState(false);
  
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: getDefaultValues(task),
  });

  const taskContent = form.watch('content');
  const taskType = form.watch('type');
  const linkedGoalId = form.watch('linkedGoalId');
  
  useEffect(() => {
    if (teamMembers && !task && taskContent && taskContent.length > 10 && (taskType === 'Operacional' || taskType === 'Tático')) {
      const member = analyzeTaskForDelegation(taskContent, teamMembers);
      setSuggestedMember(member);
    } else {
      setSuggestedMember(null);
      setDecision(null);
    }
  }, [task, taskContent, taskType, teamMembers]);

  useEffect(() => {
    if (linkedGoalId && linkedGoalId !== 'none') {
        const goal = goals?.find(g => g.id === linkedGoalId);
        if (goal?.unit === 'number' && (goal.title.toLowerCase().includes('task') || goal.title.toLowerCase().includes('tarefa'))) {
            form.setValue('goalIncrementValue', 1);
            setIsContributionReadOnly(true);
        } else {
            setIsContributionReadOnly(false);
        }
    } else {
        setIsContributionReadOnly(false);
    }
  }, [linkedGoalId, goals, form]);

  const onSubmit = (data: TaskFormValues) => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Usuário não autenticado.' });
        return;
    }
    
    const finalData = {
        ...data,
        projectId: data.projectId === 'none' ? '' : data.projectId,
        linkedGoalId: data.linkedGoalId === 'none' ? '' : data.linkedGoalId,
        goalIncrementValue: (data.linkedGoalId === 'none' || !data.linkedGoalId) ? 0 : data.goalIncrementValue,
    };

    try {
        if (task) {
            const taskRef = doc(firestore, 'users', user.uid, 'tasks', task.id);
            updateDocumentNonBlocking(taskRef, finalData);
            toast({ title: 'Tarefa Atualizada!', description: 'Suas alterações foram salvas.' });
        } else {
            const today = new Date().toISOString().split('T')[0];
            const tasksCollection = collection(firestore, 'users', user.uid, 'tasks');
            addDocumentNonBlocking(tasksCollection, { ...finalData, userId: user.uid, completed: false, scheduledDate: today, order: Date.now() });
            toast({ title: 'Tarefa Criada!', description: `"${data.content}" foi adicionada ao seu plano.` });
        }
        closeDialog();
    } catch (error: any) {
        console.error("Erro ao salvar tarefa:", error);
        toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error.message });
    }
  };
  
  const handleSaveTask = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleOpenDelegation = () => {
    setIsDelegationFormOpen(true);
  };
  
  const handleDelegationSuccess = (delegationData: Delegation) => {
    setIsDelegationFormOpen(false);
    toast({ title: 'Tarefa Delegada com Sucesso!', description: 'As tarefas de acompanhamento foram criadas no seu plano.'});

    if (firestore && user) {
        const tasksCollection = collection(firestore, 'users', user.uid, 'tasks');
        const today = new Date().toISOString().split('T')[0];
        const memberName = teamMembers?.find(m => m.id === delegationData.delegatedTo)?.name || 'membro da equipe';

        addDocumentNonBlocking(tasksCollection, {
            userId: user.uid, content: `Passar o bastão: ${delegationData.taskTitle} para ${memberName}`,
            projectId: delegationData.projectId, completed: false, isMIT: false, priority: 'medium', type: 'Operacional',
            scheduledDate: today, scheduledTime: 'Tarde', estimatedMinutes: 15, linkedGoalId: delegationData.goalId, order: Date.now() + 1
        });

        const dueDate = typeof delegationData.dueDate === 'string' ? new Date(delegationData.dueDate) : (delegationData.dueDate as any).toDate();
        addDocumentNonBlocking(tasksCollection, {
            userId: user.uid, content: `Follow-up: Cobrar entrega da tarefa "${delegationData.taskTitle}" de ${memberName}`,
            projectId: delegationData.projectId, completed: false, isMIT: false, priority: 'medium', type: 'Operacional',
            scheduledDate: dueDate.toISOString().split('T')[0], scheduledTime: 'Tarde', estimatedMinutes: 15, linkedGoalId: delegationData.goalId, order: Date.now() + 2
        });
    }
    closeDialog();
  };

  const initialDelegation: Partial<Delegation> = {
    taskTitle: form.getValues('content'), taskDescription: 'Adicione mais detalhes aqui...',
    delegatedTo: suggestedMember?.id || '',
    priority: form.getValues('priority') === 'high' ? 'Alta' : form.getValues('priority') === 'medium' ? 'Média' : 'Baixa',
    projectId: form.getValues('projectId') !== 'none' ? form.getValues('projectId') : '',
    goalId: form.getValues('linkedGoalId') !== 'none' ? form.getValues('linkedGoalId') : '',
  };

  const showDelegationPanel = (taskType === 'Operacional' || taskType === 'Tático') && !task;
  const selectedGoal = goals?.find(g => g.id === linkedGoalId);

  return (
    <>
    <Dialog open={isDelegationFormOpen} onOpenChange={setIsDelegationFormOpen}>
        <DialogContent className="sm:max-w-xl">
             <DialogHeader><DialogTitle>Delegar Tarefa</DialogTitle></DialogHeader>
            <DelegationForm delegation={initialDelegation as Delegation} teamMembers={teamMembers || []} goals={goals || []} onSuccess={handleDelegationSuccess} />
        </DialogContent>
    </Dialog>

    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
        <FormField control={form.control} name="content" render={({ field }) => ( <FormItem> <FormLabel>Descrição da Tarefa</FormLabel> <FormControl><Textarea placeholder="Ex: Rascunhar o novo texto de marketing..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Tipo de Tarefa</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl><SelectContent>{taskTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
          <FormField control={form.control} name="projectId" render={({ field }) => ( <FormItem><FormLabel>Projeto</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhum</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        </div>
        <FormField control={form.control} name="linkedGoalId" render={({ field }) => ( <FormItem><FormLabel>Contribui para qual Meta?</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Vincular a uma meta" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhuma meta</SelectItem>{goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        
        {linkedGoalId && linkedGoalId !== 'none' && (
           <FormField control={form.control} name="goalIncrementValue" render={({ field }) => ( <FormItem>
              <FormLabel>Quanto esta tarefa avança a meta?</FormLabel>
              <FormControl>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Input type="number" placeholder={selectedGoal?.unit === 'currency' ? "Ex: 3000 para R$3000" : selectedGoal?.unit === 'percentage' ? "Ex: 5 para 5%" : "Ex: 1"} {...field} readOnly={isContributionReadOnly} className={isContributionReadOnly ? "cursor-not-allowed" : ""} />
                    </TooltipTrigger>
                    {isContributionReadOnly && <TooltipContent><p>Metas de contagem de tarefas avançam 1 por tarefa.</p></TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
              </FormControl>
              <FormMessage /> </FormItem> )}/>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="scheduledTime" render={({ field }) => ( <FormItem><FormLabel>Período do Dia</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Escolha um período" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Manhã">Manhã</SelectItem><SelectItem value="Tarde">Tarde</SelectItem><SelectItem value="Noite">Noite</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField
              control={form.control}
              name="specificTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="priority" render={({ field }) => ( <FormItem><FormLabel>Prioridade</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Defina a prioridade" /></SelectTrigger></FormControl><SelectContent><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="low">Baixa</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
          <FormField control={form.control} name="estimatedMinutes" render={({ field }) => ( <FormItem><FormLabel>Minutos Estimados</FormLabel><FormControl><Input type="number" placeholder="Ex: 50" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        </div>
        
        <FormField control={form.control} name="isMIT" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Tarefa Mais Importante (MIT)?</FormLabel><FormDescription>Marque se esta for uma de suas 3 tarefas principais do dia.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>)}/>
        
        {showDelegationPanel && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                 <h3 className="font-semibold text-center text-lg">🤔 Você precisa fazer isso pessoalmente?</h3>
                 <p className="text-sm text-center text-muted-foreground">Esta é uma tarefa **{taskType}**. {suggestedMember ? <>A IA sugere que <span className="text-primary font-semibold"> {suggestedMember.name}</span> pode fazer isso.</> : " Considere delegar para liberar seu tempo para foco estratégico."}</p>
                 {!decision ? (<div className="grid grid-cols-2 gap-4 pt-2"><Button variant="outline" onClick={() => setDecision('self')} className="h-12 flex-col gap-1"><User className="h-4 w-4"/>Fazer eu mesmo</Button><Button onClick={() => setDecision('delegate')} className="h-12 flex-col gap-1 bg-primary/90 hover:bg-primary"><UserCheck className="h-4 w-4"/>Delegar Tarefa</Button></div>)
                 : decision === 'self' ? (<div className="p-4 bg-background rounded-md border border-amber-500/30"><FormLabel>Tem certeza? Por que só você pode fazer isso?</FormLabel><RadioGroup onValueChange={setSelfReason} className="mt-3 space-y-2"><div className="flex items-center space-x-2"><RadioGroupItem value="strategic" id="r1" /><Label htmlFor="r1">É decisão estratégica que só eu posso tomar</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="relationship" id="r2" /><Label htmlFor="r2">Precisa do meu relacionamento pessoal</Label></div><div className="flex flex-col"><div className="flex items-center space-x-2"><RadioGroupItem value="faster" id="r3" /><Label htmlFor="r3">É mais rápido eu fazer do que explicar</Label></div>{selfReason === 'faster' && <p className="text-xs text-amber-600 ml-6 mt-1">⚠️ Armadilha! Explicar uma vez = ganhar tempo sempre.</p>}</div><div className="flex flex-col"><div className="flex items-center space-x-2"><RadioGroupItem value="trust" id="r4" /><Label htmlFor="r4">Não confio que vai ficar bom</Label></div>{selfReason === 'trust' && <p className="text-xs text-amber-600 ml-6 mt-1">⚠️ Delegar com feedback é melhor que centralizar.</p>}</div></RadioGroup><Button onClick={handleSaveTask} className="w-full mt-4" disabled={!selfReason}>Confirmar - Vou fazer eu mesmo</Button></div>)
                 : (<div className="p-4 bg-background rounded-md border border-blue-500/30 space-y-4"><h4 className="font-semibold">Delegar para {suggestedMember?.name || 'alguém da equipe'}</h4><p className="text-sm text-muted-foreground -mt-2">Ótima decisão! Você será direcionado para o formulário de delegação.</p><Button className="w-full" onClick={handleOpenDelegation}><UserCheck className="mr-2 h-4 w-4"/>Abrir Formulário de Delegação</Button></div>)}
                <p className="text-xs text-center text-muted-foreground pt-2">💡 Lembre-se: Você não chegará nos R$30k/mês fazendo tudo.</p>
            </div>
        )}
        {!showDelegationPanel && (<Button type="button" onClick={handleSaveTask} disabled={form.formState.isSubmitting} className="w-full">{form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{task ? 'Salvar Alterações' : 'Salvar Tarefa'}</Button>)}
      </form>
    </Form>
    </>
  );
}
