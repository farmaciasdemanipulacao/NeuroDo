'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, MessageSquareQuote } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { GenerateFeedbackSessionInputSchema, type GenerateFeedbackSessionInput } from '@/lib/types';
import { z } from 'zod';


type FeedbackInputs = GenerateFeedbackSessionInput;

interface FeedbackSessionFormProps {
  memberName: string;
  isGenerating: boolean;
  onSubmit: (data: Omit<FeedbackInputs, 'collaboratorName' | 'behavioralProfile'>) => void;
}

export function FeedbackSessionForm({ memberName, isGenerating, onSubmit }: FeedbackSessionFormProps) {
  // We only need a schema for the fields the user fills out.
  const formSchema = GenerateFeedbackSessionInputSchema.pick({
    positivePoint: true,
    improvementPoint: true,
    relatedGoal: true
  }).extend({
    positivePoint: z.string().min(10, 'Seja específico no elogio.'),
    improvementPoint: z.string().min(10, 'Descreva o ponto de melhoria claramente.'),
    relatedGoal: z.string().min(5, 'Conecte o feedback a uma meta.'),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      positivePoint: '',
      improvementPoint: '',
      relatedGoal: '',
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
            <MessageSquareQuote className="h-6 w-6 text-primary" />
            Gerar Roteiro de Feedback para {memberName}
        </DialogTitle>
        <DialogDescription>
            Forneça o contexto e a IA criará um roteiro de conversa personalizado, baseado no perfil comportamental de {memberName}.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-4">
          <FormField
            control={form.control}
            name="positivePoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ponto Positivo (Elogio)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ex: A proatividade em resolver o problema do cliente X na semana passada." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="improvementPoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ponto de Melhoria</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ex: Atraso na entrega dos relatórios semanais." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="relatedGoal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta de Negócio Relacionada</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Atingir a meta de 95% de satisfação do cliente." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isGenerating} className="w-full">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Gerar Roteiro
          </Button>
        </form>
      </Form>
    </>
  );
}
