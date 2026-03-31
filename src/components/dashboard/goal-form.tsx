'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import type { Goal } from '@/lib/types';
import { projects } from '@/lib/data';
import { Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';

const goalFormSchema = z.object({
  title: z.string().min(5, 'O título da meta precisa ter pelo menos 5 caracteres.'),
  description: z.string().optional(),
  type: z.enum(['yearly', 'quarterly', 'monthly', 'weekly']),
  targetValue: z.coerce.number().positive('O valor alvo deve ser positivo.'),
  currentValue: z.coerce.number().min(0, 'O valor atual não pode ser negativo.').default(0),
  unit: z.enum(['currency', 'number', 'percentage']),
  endDate: z.date({ required_error: 'A data final é obrigatória.'}),
  projectId: z.string().optional(),
  parentGoalId: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormProps {
  goal: Goal | null;
  allGoals: Goal[];
  onSuccess: () => void;
}

const getDefaultValues = (goal: Goal | null) => ({
    title: goal?.title || '',
    description: goal?.description || '',
    type: goal?.type || 'monthly',
    endDate: goal?.endDate ? (typeof goal.endDate === 'string' ? new Date(goal.endDate) : (goal.endDate as any).toDate ? (goal.endDate as any).toDate() : new Date(goal.endDate)) : new Date(),
    targetValue: goal?.targetValue || 100,
    currentValue: goal?.currentValue || 0,
    unit: goal?.unit || 'number',
    projectId: goal?.projectId || 'none',
    parentGoalId: goal?.parentGoalId || 'none',
});

export function GoalForm({ goal, allGoals, onSuccess }: GoalFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: getDefaultValues(goal),
  });

  const onSubmit = (data: GoalFormValues) => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Usuário não autenticado.' });
        return;
    }

    const progress = Math.round((data.currentValue / data.targetValue) * 100);
    const goalData: Partial<Goal> = {
        ...data,
        userId: user.uid,
        startDate: goal?.startDate || new Date().toISOString(),
        endDate: data.endDate.toISOString(),
        progress: progress,
        status: progress >= 100 ? 'completed' : 'active',
        // Converte 'none' para um campo vazio antes de salvar
        projectId: data.projectId === 'none' ? '' : data.projectId,
        parentGoalId: data.parentGoalId === 'none' ? '' : data.parentGoalId,
    };
    
    if (data.unit === 'currency') {
      goalData.targetRevenue = data.targetValue;
      goalData.currentRevenue = data.currentValue;
    }

    try {
        if (goal) {
            const goalRef = doc(firestore, 'users', user.uid, 'goals', goal.id);
            updateDocumentNonBlocking(goalRef, goalData);
            toast({ title: 'Meta Atualizada!', description: 'Suas alterações foram salvas.' });
        } else {
            const goalsCollection = collection(firestore, 'users', user.uid, 'goals');
            addDocumentNonBlocking(goalsCollection, goalData);
            toast({ title: 'Meta Criada!', description: `A meta "${data.title}" foi adicionada à sua pirâmide.` });
        }
        onSuccess();
    } catch (error: any) {
        console.error("Erro ao salvar meta:", error);
        toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error.message });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da Meta</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Atingir X de faturamento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva o que significa alcançar esta meta..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nível da Meta</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="yearly">Anual</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Final</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Add timezone offset to avoid off-by-one day errors
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Valor Atual</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Valor Alvo</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="currency">Moeda (R$)</SelectItem>
                                <SelectItem value="number">Número</SelectItem>
                                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="parentGoalId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Meta Pai (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Vincular a uma meta pai" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {allGoals.filter(g => g.id !== goal?.id).map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {goal ? 'Salvar Alterações' : 'Salvar Meta'}
        </Button>
      </form>
    </Form>
  );
}

    