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
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Delegation, TeamMember, DelegationTaskStatus, DelegationPriority, Goal } from '@/lib/types';
import { projects } from '@/lib/data';
import { Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';

const statusOptions: DelegationTaskStatus[] = ["Pendente", "Em Progresso", "Aguardando Resposta", "Concluída", "Atrasada"];
const priorityOptions: DelegationPriority[] = ["Alta", "Média", "Baixa"];

const delegationFormSchema = z.object({
  taskTitle: z.string().min(5, 'O título da tarefa precisa ter pelo menos 5 caracteres.'),
  taskDescription: z.string().min(10, 'A descrição precisa ter pelo menos 10 caracteres.'),
  delegatedTo: z.string().min(1, 'Selecione um membro da equipe.'),
  dueDate: z.date({ required_error: 'A data de entrega é obrigatória.'}),
  status: z.enum(statusOptions),
  priority: z.enum(priorityOptions),
  projectId: z.string().optional(),
  goalId: z.string().optional(),
});

type DelegationFormValues = z.infer<typeof delegationFormSchema>;

interface DelegationFormProps {
  delegation: Delegation | null;
  teamMembers: TeamMember[];
  goals: Goal[];
  onSuccess: (delegation: Delegation) => void;
}

const getSafeDate = (date: any): Date => {
    if (!date) return new Date();
    if (typeof date === 'string') return new Date(date);
    if (date.toDate) return date.toDate();
    return new Date(date);
};

const getDefaultValues = (delegation: Delegation | null, teamMembers: TeamMember[]): DelegationFormValues => {
    const member = teamMembers.find(m => m.id === delegation?.delegatedTo);
    return {
        taskTitle: delegation?.taskTitle || '',
        taskDescription: delegation?.taskDescription || '',
        delegatedTo: delegation?.delegatedTo || '',
        dueDate: getSafeDate(delegation?.dueDate),
        status: delegation?.status || 'Pendente',
        priority: delegation?.priority || 'Média',
        projectId: delegation?.projectId || 'none',
        goalId: delegation?.goalId || 'none',
    }
};

export function DelegationForm({ delegation, teamMembers, goals, onSuccess }: DelegationFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const form = useForm<DelegationFormValues>({
    resolver: zodResolver(delegationFormSchema),
    defaultValues: getDefaultValues(delegation, teamMembers),
  });

  const onSubmit = async (data: DelegationFormValues) => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação' });
        return;
    }

    const member = teamMembers.find(m => m.id === data.delegatedTo);
    const delegationData = {
        ...data,
        userId: user.uid,
        dueDate: data.dueDate.toISOString(),
        delegatedToContact: member?.email || '',
        projectId: data.projectId === 'none' ? '' : data.projectId,
        goalId: data.goalId === 'none' ? '' : data.goalId,
    };

    try {
        if (delegation && delegation.id) {
            const delegationRef = doc(firestore, 'users', user.uid, 'delegations', delegation.id);
            updateDocumentNonBlocking(delegationRef, delegationData);
            toast({ title: 'Delegação Atualizada!' });
            onSuccess({ ...delegation, ...delegationData } as Delegation);
        } else {
            const now = new Date().toISOString();
            const fullDelegationData = { 
                ...delegationData, 
                createdAt: now,
                delegatedAt: now,
                followUpCount: 0,
                followUpDates: [],
            };
            const docRef = await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'delegations'), fullDelegationData);
            
            if (!docRef) {
                throw new Error("Falha ao criar o documento de delegação.");
            }

            toast({ title: 'Tarefa Delegada!', description: `"${data.taskTitle}" foi enviada para ${member?.name}.` });
            onSuccess({ id: docRef.id, ...fullDelegationData } as Delegation);
        }
    } catch (error: any) {
        console.error("Erro ao salvar delegação:", error);
        toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error.message });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="taskTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da Tarefa</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Criar apresentação para Cliente X" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taskDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição Detalhada</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva o que precisa ser feito, o resultado esperado e qualquer contexto importante..." className="min-h-[120px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="delegatedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delegar Para</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um membro da equipe" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Entrega</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value);
                          const timezoneOffset = date.getTimezoneOffset() * 60000;
                          field.onChange(new Date(date.getTime() + timezoneOffset));
                        }
                      }}
                      className="block w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Defina a prioridade" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {priorityOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Defina o status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
         <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Projeto (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Vincular a um projeto" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <FormField
            control={form.control}
            name="goalId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Meta Estratégica (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Vincular a uma meta" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {delegation ? 'Salvar Alterações' : 'Salvar Delegação'}
        </Button>
      </form>
    </Form>
  );
}

    