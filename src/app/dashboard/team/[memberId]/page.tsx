'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { TeamMember, FeedbackSession, PDIHistory, GenerateFeedbackSessionOutput } from '@/lib/types';
import { Loader2, ArrowLeft, UserCircle, MessageSquareQuote, Send, Pencil, Trash2, Copy, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { TeamMemberForm } from '@/components/dashboard/team-member-form';
import { generateFeedbackSession } from '@/ai/flows/generate-feedback-session';
import { FeedbackSessionForm } from '@/components/dashboard/feedback-session-form';
import { FeedbackSessionDisplay } from '@/components/dashboard/feedback-session-display';

function MemberProfileOverview({ member }: { member: TeamMember }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Principais Funções / Tarefas</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{member.mainTasks}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Perfil Comportamental (Gerado por IA)</CardTitle>
                </CardHeader>
                <CardContent>
                    {member.profileResults ? (
                        <p className="text-muted-foreground whitespace-pre-wrap">{member.profileResults}</p>
                    ) : (
                        <p className="text-muted-foreground">Nenhum perfil gerado ainda. Envie o questionário para o membro da equipe.</p>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Observações Importantes (Comunicação/Delegação)</CardTitle>
                </CardHeader>
                <CardContent>
                     {member.observations ? (
                        <p className="text-muted-foreground whitespace-pre-wrap">{member.observations}</p>
                    ) : (
                        <p className="text-muted-foreground">Nenhuma observação gerada. Gere o perfil comportamental primeiro.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function FeedbackHistory({ memberId }: { memberId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();

    const feedbackQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'feedback_sessions'), 
            where('memberId', '==', memberId)
        );
    }, [user, firestore, memberId]);
    
    const { data: feedbackHistory, isLoading } = useCollection<FeedbackSession>(feedbackQuery);

    if (isLoading) return <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin" /></div>
    if (!feedbackHistory || feedbackHistory.length === 0) return <p className="text-muted-foreground text-center py-10">Nenhuma sessão de feedback encontrada.</p>

    const sortedHistory = [...feedbackHistory].sort((a, b) => {
      const dateA = (a.generatedAt as any)?.toDate ? (a.generatedAt as any).toDate() : new Date(a.generatedAt as string);
      const dateB = (b.generatedAt as any)?.toDate ? (b.generatedAt as any).toDate() : new Date(b.generatedAt as string);
      return dateB.getTime() - dateA.getTime();
    });

    return (
        <div className="space-y-4">
            {sortedHistory.map(session => (
                <Card key={session.id}>
                    <CardHeader>
                        <CardTitle className="text-base">
                           Sessão de {format(new Date(session.generatedAt as string), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p><strong>Abertura:</strong> {session.script.opening}</p>
                        <p><strong>Elogio:</strong> {session.script.praisePoints}</p>
                        <p><strong>Desenvolvimento:</strong> {session.script.developmentPoints}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function PdiEvolution({ memberId }: { memberId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();

     const pdiQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'pdi_history'), 
            where('memberId', '==', memberId)
        );
    }, [user, firestore, memberId]);
    
    const { data: pdiHistory, isLoading } = useCollection<PDIHistory>(pdiQuery);

    if (isLoading) return <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin" /></div>
    if (!pdiHistory || pdiHistory.length === 0) return <p className="text-muted-foreground text-center py-10">Nenhum PDI encontrado.</p>

    const sortedHistory = [...pdiHistory].sort((a, b) => {
        const dateA = (a.generatedAt as any)?.toDate ? (a.generatedAt as any).toDate() : new Date(a.generatedAt as string);
        const dateB = (b.generatedAt as any)?.toDate ? (b.generatedAt as any).toDate() : new Date(b.generatedAt as string);
        return dateB.getTime() - dateA.getTime();
    });


    return (
        <div className="relative pl-6 after:absolute after:inset-y-0 after:w-px after:bg-border after:left-0">
             {sortedHistory.map((pdi, index) => (
                <div key={pdi.id} className="relative pb-8">
                     <div className="absolute left-[-24.5px] top-0.5 h-3 w-3 rounded-full bg-primary" />
                     <Card className="ml-4">
                         <CardHeader>
                             <CardTitle className="text-base">PDI Gerado em {format(new Date(pdi.generatedAt as string), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</CardTitle>
                         </CardHeader>
                         <CardContent>
                             <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{pdi.pdiContent}</ReactMarkdown>
                             </div>
                         </CardContent>
                     </Card>
                 </div>
             ))}
        </div>
    );
}


export default function TeamMemberPage() {
    const params = useParams();
    const router = useRouter();
    const memberId = params.memberId as string;
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // State for modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [questionnaireLink, setQuestionnaireLink] = useState<string | null>(null);
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [generatedScript, setGeneratedScript] = useState<GenerateFeedbackSessionOutput | null>(null);
    const [formInitialTab, setFormInitialTab] = useState('profile');

    const memberRef = useMemoFirebase(() => {
        if (!firestore || !user || !memberId) return null;
        return doc(firestore, 'users', user.uid, 'team', memberId);
    }, [firestore, user, memberId]);

    const { data: member, isLoading: isLoadingMember } = useDoc<TeamMember>(memberRef);
    
    // Handlers
    const handleOpenEditDialog = (initialTab: 'profile' | 'pdi' = 'profile') => {
        setFormInitialTab(initialTab);
        setIsFormOpen(true);
    };
    const handleFormSuccess = () => setIsFormOpen(false);

    const handleDeleteMember = () => {
        if (!firestore || !user || !member) return;
        deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'team', member.id));
        toast({ title: 'Membro Removido' });
        router.push('/dashboard/team');
    };

    const handleSendQuestionnaire = async () => {
        if (!firestore || !user || !member) return;
        
        const questionnairesRef = collection(firestore, 'profile_questionnaires');
        const newQuestionnaire = {
            userId: user.uid,
            teamMemberId: member.id,
            status: 'pending' as 'pending' | 'completed',
            responses: {},
            createdAt: new Date().toISOString(),
            completedAt: null,
        };
        const docRef = await addDocumentNonBlocking(questionnairesRef, newQuestionnaire);
        
        if (!docRef) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o questionário.'});
            return;
        }

        updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'team', member.id), { profileQuestionnaireId: docRef.id });

        const origin = window.location.origin;
        const link = `${origin}/q/${docRef.id}`;
        setQuestionnaireLink(link);
    };

    const copyLink = () => {
        if (!questionnaireLink) return;
        navigator.clipboard.writeText(questionnaireLink);
        toast({ title: 'Link copiado!', description: 'Você pode enviar para o membro da sua equipe.'});
    };

    const handleGenerateFeedback = async (inputs: { positivePoint: string, improvementPoint: string, relatedGoal: string }) => {
        if (!member || !user) return;
        setIsGeneratingFeedback(true);
        try {
          const script = await generateFeedbackSession({
            collaboratorName: member.name,
            behavioralProfile: member.profileResults || 'Não definido',
            memberId: member.id,
            userId: user.uid,
            ...inputs
          });
          setGeneratedScript(script);
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Erro ao Gerar Roteiro', description: error.message });
        } finally {
          setIsGeneratingFeedback(false);
        }
    };

    const closeFeedbackModals = () => {
        setIsFeedbackOpen(false);
        setGeneratedScript(null);
    }
    
    if (isLoadingMember) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!member) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <p>Membro da equipe não encontrado.</p>
                 <Link href="/dashboard/team">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a Equipe
                    </Button>
                </Link>
            </div>
        );
    }
    
    return (
        <div className="flex-1 space-y-6">
            <Link href="/dashboard/team">
                <Button variant="outline" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para a Equipe
                </Button>
            </Link>

            <header className="flex flex-col sm:flex-row items-start gap-6">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback><UserCircle className="h-16 w-16 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <h1 className="text-4xl font-bold tracking-tight">{member.name}</h1>
                    <p className="text-xl text-muted-foreground">{member.role}</p>
                    <Badge variant="secondary" className="mt-2 text-sm">{member.relationshipType}</Badge>
                </div>
                 <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog()} className="hover:border-primary/50 hover:bg-primary/10 border border-transparent text-muted-foreground hover:text-primary">
                            <Pencil className="h-5 w-5" />
                        </Button>
                        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:border-red-500/50 hover:bg-red-500/10 border border-transparent text-red-500/70 hover:text-red-500">
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir {member.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação é permanente e não pode ser desfeita. Todo o histórico associado será perdido.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteMember}>Confirmar Exclusão</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => setIsFeedbackOpen(true)} className="border-primary text-primary hover:bg-primary/10 hover:text-primary"><MessageSquareQuote className="mr-2 h-4 w-4" />Feedback</Button>
                        <Button variant="outline" onClick={() => handleOpenEditDialog('pdi')} className="border-chart-1 text-chart-1 hover:bg-chart-1/10 hover:text-chart-1"><ClipboardList className="mr-2 h-4 w-4" />Gerar PDI</Button>
                        <Button 
                            variant="outline"
                            onClick={handleSendQuestionnaire}
                            className="border-chart-4 text-chart-4 hover:bg-chart-4/10 hover:text-chart-4"
                        >
                            <Send className="mr-2 h-4 w-4" />Questionário
                        </Button>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="feedback">Histórico de Feedbacks</TabsTrigger>
                    <TabsTrigger value="pdi">Evolução do PDI</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6">
                    <MemberProfileOverview member={member} />
                </TabsContent>
                <TabsContent value="feedback" className="mt-6">
                   <FeedbackHistory memberId={memberId} />
                </TabsContent>
                <TabsContent value="pdi" className="mt-6">
                    <PdiEvolution memberId={memberId} />
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar Perfil de {member.name}</DialogTitle>
                        <DialogDescription>
                            Atualize os detalhes do membro da equipe.
                        </DialogDescription>
                    </DialogHeader>
                    <TeamMemberForm 
                        key={member.id}
                        teamMember={member}
                        onSuccess={handleFormSuccess}
                        initialTab={formInitialTab}
                    />
                </DialogContent>
            </Dialog>

             <Dialog open={!!questionnaireLink} onOpenChange={() => setQuestionnaireLink(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Compartilhe o Questionário</DialogTitle>
                        <DialogDescription>
                            Envie este link para o membro da equipe responder. As respostas preencherão o perfil dele automaticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 mt-4">
                        <Input value={questionnaireLink || ''} readOnly />
                        <Button onClick={copyLink} size="icon">
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isFeedbackOpen} onOpenChange={closeFeedbackModals}>
                <DialogContent className="sm:max-w-2xl">
                    {generatedScript ? (
                    <FeedbackSessionDisplay script={generatedScript} memberName={member.name} onBack={() => setGeneratedScript(null)} />
                    ) : (
                    <FeedbackSessionForm 
                        memberName={member.name}
                        isGenerating={isGeneratingFeedback}
                        onSubmit={handleGenerateFeedback}
                    />
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}

    