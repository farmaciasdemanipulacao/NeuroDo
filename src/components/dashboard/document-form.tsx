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
import type { Document as DocumentType, DocumentType as DocTypeEnum } from '@/lib/types';
import { projects } from '@/lib/data';
import { Loader2, Save } from 'lucide-react';
import { Switch } from '../ui/switch';


const documentFormSchema = z.object({
  title: z.string().min(3, 'O título precisa ter pelo menos 3 caracteres.'),
  type: z.enum(['Playbook', 'Planejamento', 'Estratégia', 'Processo', 'Referência', 'Checklist']),
  content: z.string().min(10, 'O conteúdo precisa ter pelo menos 10 caracteres.'),
  projectId: z.string().optional(),
  isPinned: z.boolean().default(false),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

interface DocumentFormProps {
  document: DocumentType | null;
  onSuccess: () => void;
}

const documentTypes: DocTypeEnum[] = ['Playbook', 'Planejamento', 'Estratégia', 'Processo', 'Referência', 'Checklist'];


const getDefaultValues = (doc: DocumentType | null) => ({
    title: doc?.title || '',
    type: doc?.type || 'Playbook',
    content: doc?.content || '',
    projectId: doc?.projectId || 'none',
    isPinned: doc?.isPinned || false,
});

export function DocumentForm({ document: docProp, onSuccess }: DocumentFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: getDefaultValues(docProp),
  });

  const onSubmit = (data: DocumentFormValues) => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Usuário não autenticado.' });
        return;
    }

    const docData = {
        ...data,
        userId: user.uid,
        projectId: data.projectId === 'none' ? '' : data.projectId,
    };

    try {
        if (docProp) {
            const docRef = doc(firestore, 'users', user.uid, 'documents', docProp.id);
            updateDocumentNonBlocking(docRef, { ...docData, updatedAt: new Date().toISOString() });
            toast({ title: 'Documento Atualizado!', description: 'Suas alterações foram salvas.' });
        } else {
            const docsCollection = collection(firestore, 'users', user.uid, 'documents');
            const now = new Date().toISOString();
            addDocumentNonBlocking(docsCollection, { ...docData, createdAt: now, updatedAt: now });
            toast({ title: 'Documento Criado!', description: `"${data.title}" foi adicionado à sua base de conhecimento.` });
        }
        onSuccess();
    } catch (error: any) {
        console.error("Erro ao salvar documento:", error);
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
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Playbook de Vendas..." {...field} />
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
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {documentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo</FormLabel>
              <FormControl>
                <Textarea placeholder="Comece a escrever seu documento aqui..." className="min-h-[200px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
         <FormField
          control={form.control}
          name="isPinned"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Fixar Documento</FormLabel>
                <FormDescription>
                  Documentos fixados aparecem com destaque.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />


        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {docProp ? 'Salvar Alterações' : 'Salvar Documento'}
        </Button>
      </form>
    </Form>
  );
}

    