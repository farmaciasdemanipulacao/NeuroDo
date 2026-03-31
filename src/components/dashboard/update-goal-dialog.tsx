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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { Loader2, Target } from 'lucide-react';
import type { Goal } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';

// Schema for the form
const updateGoalSchema = z.object({
  goalId: z.string().min(1, 'Você precisa selecionar uma meta.'),
  incrementValue: z.coerce.number().min(0, 'O valor a adicionar não pode ser negativo.'),
});

type UpdateGoalFormValues = z.infer<typeof updateGoalSchema>;

interface UpdateGoalDialogProps {
  children: React.ReactNode;
}

export function UpdateGoalDialog({ children }: UpdateGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const form = useForm<UpdateGoalFormValues>({
    resolver: zodResolver(updateGoalSchema),
    defaultValues: {
      goalId: undefined,
      incrementValue: 0,
    }
  });

  const goalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);

  const { data: goals, isLoading } = useCollection<Goal>(goalsQuery);

  const watchedGoalId = form.watch('goalId');
  const selectedGoal = useMemo(() => {
    return goals?.find(g => g.id === watchedGoalId);
  }, [goals, watchedGoalId]);

  // Reset increment value when goal changes
  useEffect(() => {
    form.setValue('incrementValue', 0);
  }, [watchedGoalId, form]);

  const onSubmit = async (data: UpdateGoalFormValues) => {
    if (!firestore || !user || !selectedGoal) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Meta não encontrada ou usuário não autenticado.' });
        return;
    }

    const newCurrentValue = (selectedGoal.currentValue || 0) + data.incrementValue;
    const progress = (newCurrentValue / selectedGoal.targetValue) * 100;
    
    const updateData: Partial<Goal> = {
        currentValue: newCurrentValue,
        progress: Math.min(100, Math.round(progress)),
        status: progress >= 100 ? 'completed' : selectedGoal.status,
    };

    // Keep compatibility with old revenue fields if they exist
    if ('targetRevenue' in selectedGoal) {
        updateData.currentRevenue = newCurrentValue;
    }

    try {
        const goalRef = doc(firestore, 'users', user.uid, 'goals', selectedGoal.id);
        updateDocumentNonBlocking(goalRef, updateData);
        toast({ title: 'Meta Avançou!', description: `"${selectedGoal.title}" agora está em ${newCurrentValue} / ${selectedGoal.targetValue}.` });
        form.reset({ goalId: undefined, incrementValue: 0 });
        setOpen(false);
    } catch (error: any) {
        console.error("Erro ao avançar meta:", error);
        toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avançar Progresso da Meta</DialogTitle>
          <DialogDescription>
            Selecione uma meta e insira o valor que você acabou de conquistar para somar ao seu progresso atual.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="goalId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Meta</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger disabled={isLoading}><SelectValue placeholder={isLoading ? "Carregando metas..." : "Selecione uma meta"} /></SelectTrigger></FormControl>
                            <SelectContent>
                                {goals?.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {selectedGoal && (
                            <p className="text-xs text-muted-foreground pt-1">
                                Progresso Atual: {selectedGoal.currentValue} / {selectedGoal.targetValue} {selectedGoal.unit === 'currency' ? 'BRL' : selectedGoal.unit}
                            </p>
                        )}
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="incrementValue"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Valor a Adicionar</FormLabel>
                        <FormControl>
                            <div className="relative flex items-center">
                                {selectedGoal?.unit === 'currency' && <span className="absolute left-3 text-muted-foreground text-sm">R$</span>}
                                <Input 
                                    type="number" 
                                    placeholder="+2" 
                                    className={selectedGoal?.unit === 'currency' ? 'pl-8' : ''}
                                    {...field} 
                                />
                                {selectedGoal?.unit === 'percentage' && <span className="absolute right-3 text-muted-foreground text-sm">%</span>}
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting || isLoading || !selectedGoal}>
                        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
                        Avançar Meta
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    