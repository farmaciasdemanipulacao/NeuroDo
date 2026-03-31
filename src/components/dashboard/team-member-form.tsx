'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { TeamMember, RelationshipType } from '@/lib/types';
import { Loader2, Save, Wand2, BrainCircuit } from 'lucide-react';
import { useGenerateText } from '@/hooks/use-generate-text';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { generatePDI } from '@/ai/flows/generate-pdi';
import { useState } from 'react';

const relationshipTypes: RelationshipType[] = ['Profissional', 'Amigo(a)', 'Cônjuge', 'Pai/Mãe', 'Irmão/Irmã', 'Mentor(a)', 'Outro'];

const teamMemberFormSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  role: z.string().min(2, 'O cargo/função é obrigatório.'),
  relationshipType: z.enum(['Profissional', 'Amigo(a)', 'Cônjuge', 'Pai/Mãe', 'Irmão/Irmã', 'Mentor(a)', 'Outro']),
  birthDate: z.string().optional(),
  avatarUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  profileResults: z.string().optional(),
  mainTasks: z.string().min(10, 'Descreva as principais tarefas/funções.'),
  observations: z.string().optional(),
  pdi: z.string().optional(),
});

type TeamMemberFormValues = z.infer<typeof teamMemberFormSchema>;

interface TeamMemberFormProps {
  teamMember: TeamMember | null;
  onSuccess: () => void;
  initialTab?: 'profile' | 'pdi';
}

const getDefaultValues = (member: TeamMember | null): TeamMemberFormValues => ({
  name: member?.name || '',
  email: member?.email || '',
  role: member?.role || '',
  relationshipType: member?.relationshipType || 'Profissional',
  birthDate: member?.birthDate || '',
  avatarUrl: member?.avatarUrl || '',
  profileResults: member?.profileResults || '',
  mainTasks: member?.mainTasks || '',
  observations: member?.observations || '',
  pdi: member?.pdi || '',
});

export function TeamMemberForm({ teamMember, onSuccess, initialTab = 'profile' }: TeamMemberFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const { isGenerating, generateText } = useGenerateText();
  const [isGeneratingPDI, setIsGeneratingPDI] = useState(false);

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: getDefaultValues(teamMember),
  });

  const onSubmit = async (data: TeamMemberFormValues) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro de Autenticação' });
      return;
    }
    
    const memberData = { ...data, userId: user.uid };

    try {
      if (teamMember) {
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'team', teamMember.id), memberData);
        toast({ title: 'Perfil Atualizado!' });
      } else {
        addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'team'), memberData);
        toast({ title: 'Nova Pessoa Adicionada!' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error.message });
    }
  };

  const handleGenerateMainTasks = () => {
    const role = form.getValues('role');
    if (!role) {
      toast({ variant: 'destructive', title: 'Cargo não definido', description: 'Por favor, preencha o cargo para gerar as tarefas.' });
      return;
    }
    const prompt = `Liste as 3 a 5 principais responsabilidades ou tipos de tarefa para alguém no cargo de "${role}". Formate como um texto corrido separado por vírgulas. Seja conciso e focado em ações.`;
    generateText(prompt, (text) => form.setValue('mainTasks', text));
  };
  
  const handleGenerateObservations = () => {
    const profile = form.getValues('profileResults');
    if (!profile) {
      toast({ variant: 'destructive', title: 'Resultados de Perfil não preenchidos', description: 'Preencha os resultados de testes de perfil para gerar as observações.' });
      return;
    }
    const prompt = `Com base nos seguintes resultados de perfil (ex: DISC, MBTI, etc.): "${profile}", gere 2-3 observações importantes sobre como interagir e delegar para essa pessoa. Foque em pontos práticos como "prefere comunicação direta" ou "precisa de prazos claros".`;
    generateText(prompt, (text) => form.setValue('observations', text));
  };

  const handleGeneratePDI = async () => {
    if (!teamMember || !user) return;
    setIsGeneratingPDI(true);

    const formData = form.getValues();
    const contextPrompt = `
      Aqui estão os dados do membro da equipe:
      - **Cargo/Função:** ${formData.role}
      - **Principais Tarefas:** ${formData.mainTasks}
      - **Perfil Comportamental Gerado:** ${formData.profileResults || 'Nenhum perfil gerado ainda.'}
      - **Observações:** ${formData.observations || 'Nenhuma.'}

      Com base nesses dados, gere um Plano de Desenvolvimento Individual (PDI) seguindo estritamente as regras e o formato definidos.
    `;

    try {
      const result = await generatePDI({
        contextPrompt,
        memberId: teamMember.id,
        userId: user.uid,
      });
      form.setValue('pdi', result.pdi);
      updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'team', teamMember.id), { pdi: result.pdi });
      toast({ title: "PDI Gerado e Salvo!", description: "O Plano de Desenvolvimento Individual foi preenchido." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao Gerar PDI', description: error.message });
    } finally {
      setIsGeneratingPDI(false);
    }
  };
  
  const isSubmitting = form.formState.isSubmitting;
  const profileResults = form.watch('profileResults');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
        
        <Tabs defaultValue={initialTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="pdi">PDI</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Nome da pessoa" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="email@dominio.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo / Função</FormLabel>
                    <FormControl><Input placeholder="Ex: Gestor de Projetos" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              <FormField control={form.control} name="relationshipType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Relação</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                          {relationshipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento (Opcional)</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="avatarUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Foto (Opcional)</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="mainTasks" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center">
                  <span>Principais Funções / Tarefas</span>
                  <Button type="button" variant="ghost" size="sm" onClick={handleGenerateMainTasks} disabled={isGenerating}>
                    <Wand2 className="mr-2 h-4 w-4" /> Gerar com IA
                  </Button>
                </FormLabel>
                <FormControl><Textarea placeholder="Ex: Gerenciar cronogramas, acompanhar entregas, organizar reuniões..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="profileResults" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center">
                  <span>Resultados de Testes de Perfil</span>
                    {profileResults && (
                        <span className="text-xs text-primary flex items-center gap-1">
                            <BrainCircuit className="h-3 w-3" />
                            Gerado pela IA
                        </span>
                    )}
                </FormLabel>
                <FormControl>
                    <Textarea 
                        placeholder="Responda ao questionário de perfil para preencher este campo automaticamente, ou insira manualmente." 
                        {...field} 
                        className={profileResults ? 'bg-muted/50' : ''}
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="observations" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center">
                  <span>Observações Importantes (Comunicação/Delegação)</span>
                  <Button type="button" variant="ghost" size="sm" onClick={handleGenerateObservations} disabled={isGenerating || !profileResults}>
                    <Wand2 className="mr-2 h-4 w-4" /> Gerar com IA
                  </Button>
                </FormLabel>
                <FormControl><Textarea placeholder="Ex: Prefere comunicação escrita e direta. Necessita de contextos claros para iniciar." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            {isGenerating && (
              <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin"/>
                <span>O Mentor IA está pensando...</span>
              </div>
            )}
          </TabsContent>
          <TabsContent value="pdi" className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="pdi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-between items-center">
                      <span>Plano de Desenvolvimento Individual</span>
                        <Button type="button" variant="ghost" size="sm" onClick={handleGeneratePDI} disabled={isGeneratingPDI || !teamMember}>
                          {isGeneratingPDI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                          Gerar PDI com IA
                        </Button>
                    </FormLabel>
                     <DialogDescription>
                        Use o perfil comportamental e as metas da empresa para criar um plano de desenvolvimento.
                    </DialogDescription>
                    <FormControl>
                      <Textarea 
                          placeholder="Clique em 'Gerar PDI com IA' ou escreva manualmente o plano de desenvolvimento aqui..."
                          className="min-h-[300px] font-mono text-xs"
                          {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </TabsContent>
        </Tabs>
        <Button type="submit" disabled={isSubmitting || isGenerating || isGeneratingPDI} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {teamMember ? 'Salvar Alterações' : 'Adicionar Pessoa'}
        </Button>
      </form>
    </Form>
  );
}

    