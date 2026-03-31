'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useGoals } from '@/hooks/use-goals';
import type { MilestoneStatus } from '@/lib/types';

const milestoneSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  linkedGoalId: z.string().optional(),
  dueDate: z.date({
    required_error: 'Data de entrega é obrigatória',
  }),
  status: z.enum(['pending', 'in_progress', 'completed']),
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

interface MilestoneFormProps {
  milestone?: any;
  onSave: (data: MilestoneFormData) => Promise<void>;
  onClose: () => void;
}

// Helper to map DB status to form status
const getFormStatus = (dbStatus?: MilestoneStatus): 'pending' | 'in_progress' | 'completed' => {
  if (!dbStatus) return 'pending';
  switch (dbStatus) {
    case 'Não Iniciado':
      return 'pending';
    case 'Em Progresso':
      return 'in_progress';
    case 'Concluído':
      return 'completed';
    case 'Atrasado':
      return 'in_progress';
    default:
      // If it's already in the correct format, return it
      if (['pending', 'in_progress', 'completed'].includes(dbStatus)) {
          return dbStatus as 'pending' | 'in_progress' | 'completed';
      }
      return 'pending';
  }
};


export function MilestoneForm({ milestone, onSave, onClose }: MilestoneFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { data: goals } = useGoals();

  const form = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: milestone ? {
      title: milestone.title || '',
      description: milestone.description || '',
      projectId: milestone.projectId || '',
      linkedGoalId: milestone.linkedGoalId || 'none',
      dueDate: milestone.dueDate instanceof Date 
        ? milestone.dueDate 
        : milestone.dueDate?.toDate?.() || new Date(),
      status: getFormStatus(milestone.status),
    } : {
      title: '',
      description: '',
      projectId: '',
      linkedGoalId: 'none',
      dueDate: new Date(),
      status: 'pending',
    },
  });

  const handleSubmit = async (data: MilestoneFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      toast({
        title: '✅ Sucesso!',
        description: milestone ? 'Marco atualizado' : 'Marco criado',
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar milestone:', error);
      toast({
        title: '❌ Erro',
        description: 'Não foi possível salvar o marco',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        key={milestone?.id || 'new'}
        className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {milestone ? 'Editar Marco' : 'Novo Marco'}
          </DialogTitle>
          <DialogDescription>
            Defina um marco importante do seu projeto
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 10 farmácias pagantes"
                      {...field}
                    />
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
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes sobre este marco..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ENVOX">Envox</SelectItem>
                        <SelectItem value="FARMACIAS">Farmácias</SelectItem>
                        <SelectItem value="GERACAO_PJ">Geração PJ</SelectItem>
                        <SelectItem value="FELIZMENTE">Felizmente</SelectItem>
                        <SelectItem value="INFLUENCERS">Influencers</SelectItem>
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
                    <FormLabel>Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <div className="grid grid-cols-2 gap-4">
              
              <FormField
                control={form.control}
                name="linkedGoalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta vinculada</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhuma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma meta</SelectItem>
                        {goals
                          ?.filter(g => g.status === 'active')
                          .map(goal => (
                            <SelectItem key={goal.id} value={goal.id}>
                              {goal.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Opcional
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de entrega *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {milestone ? 'Salvar Alterações' : 'Criar Marco'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
