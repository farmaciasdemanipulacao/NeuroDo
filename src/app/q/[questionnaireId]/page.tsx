
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Sparkles, BrainCircuit, CheckCircle2, Flag } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import type { ProfileQuestionnaire, Message, TeamMember } from '@/lib/types';
import { conductProfileInterview } from '@/ai/flows/conduct-profile-interview';
import { generateBehavioralProfile } from '@/ai/flows/generate-behavioral-profile';
import { useMemoFirebase } from '@/firebase/provider';

type PageStatus = 'interview' | 'generating_profile' | 'completed';

const INTERVIEW_END_PHRASE = "obrigado(a) pelas suas respostas";

export default function QuestionnairePage() {
  const params = useParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const questionnaireId = params.questionnaireId as string;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [pageStatus, setPageStatus] = useState<PageStatus>('interview');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const questionnaireRef = useMemoFirebase(() => 
    (firestore && questionnaireId) ? doc(firestore, 'profile_questionnaires', questionnaireId) : null, 
    [firestore, questionnaireId]
  );
  const { data: questionnaire, isLoading: isLoadingQuestionnaire } = useDoc<ProfileQuestionnaire>(questionnaireRef);
  
  const teamMemberRef = useMemoFirebase(() => 
    (firestore && questionnaire?.userId && questionnaire.teamMemberId) ? doc(firestore, 'users', questionnaire.userId, 'team', questionnaire.teamMemberId) : null,
    [firestore, questionnaire]
  );
  const { data: teamMember } = useDoc<TeamMember>(teamMemberRef);

  const startInterview = useCallback(() => {
    if (messages.length > 0) return;
    const initialMessage: Message = {
      role: 'assistant',
      content: `Olá! Sou o assistente de perfil do NeuroDO. Vou fazer algumas perguntas para entender melhor como você trabalha. Não há respostas certas ou erradas, apenas seja você mesmo(a). Vamos começar?\n\nQual é a primeira coisa que você faz quando recebe uma tarefa nova e complexa?`,
    };
    setMessages([initialMessage]);
  }, [messages.length]);

  useEffect(() => {
    if (!isLoadingQuestionnaire && questionnaire && questionnaire.status !== 'completed') {
      startInterview();
    } else if (questionnaire?.status === 'completed') {
      setPageStatus('completed');
    }
  }, [isLoadingQuestionnaire, questionnaire, startInterview]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, pageStatus]);
  
  const handleFinishInterview = useCallback(async () => {
    if (isFinishing || !questionnaireRef || !firestore || !questionnaire) return;

    setIsFinishing(true);
    setPageStatus('generating_profile');
    
    try {
      // 1. Get the latest questionnaire data directly
      const qSnapshot = await getDoc(questionnaireRef);
      if (!qSnapshot.exists()) {
        throw new Error("Documento do questionário não encontrado.");
      }
      const qData = qSnapshot.data();
      const responses = qData.responses;

      if (!responses || Object.keys(responses).length === 0) {
        throw new Error("Nenhuma resposta encontrada para analisar.");
      }

      // 2. Format responses and call the AI flow
      const responsesString = Object.entries(responses)
        .map(([question, answer]) => `Pergunta: ${question}\nResposta: ${answer}`)
        .join('\n\n');

      const profileData = await generateBehavioralProfile({ responses: responsesString });

      // 3. Save the generated profile to Firestore
      const profileText = `Resumo: ${profileData.profileSummary}\n\nComo Delegar: ${profileData.howToDelegate}\n\nComo Dar Feedback: ${profileData.howToGiveFeedback}\n\nMotivadores: ${profileData.motivators}\n\nSugestões de Reconhecimento: ${profileData.recognitionSuggestions}`;
      const memberRef = doc(firestore, 'users', qData.userId, 'team', qData.teamMemberId);

      await runTransaction(firestore, async (transaction) => {
        transaction.update(questionnaireRef, {
          generatedProfile: profileText,
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        transaction.update(memberRef, {
          profileResults: profileText
        });
      });

      setPageStatus('completed');

    } catch (error: any) {
        console.error('Profile generation failed:', error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Gerar Perfil',
            description: error.message || 'Não foi possível analisar as respostas. Por favor, contate o administrador.',
        });
        setPageStatus('interview');
    } finally {
        setIsFinishing(false);
    }
  }, [questionnaireRef, firestore, questionnaire, isFinishing, toast]);


  const handleSend = async () => {
    const userMessage = input;
    if (!userMessage.trim() || isProcessing || isFinishing) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
setInput('');
    setIsProcessing(true);

    try {
      if (!questionnaireRef) throw new Error("Questionnaire reference not found");

      // Save user response
      const question = messages.filter(m => m.role === 'assistant').slice(-1)[0].content;
      updateDocumentNonBlocking(questionnaireRef, {
          responses: { ...questionnaire?.responses, [question]: userMessage }
      });

      const result = await conductProfileInterview({
        history: newMessages,
        userName: teamMember?.name || 'usuário'
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
      
      // Check if the interview is over
      if (result.response.toLowerCase().includes(INTERVIEW_END_PHRASE.toLowerCase())) {
        await handleFinishInterview();
      }
    } catch (error: any) {
      console.error('Interview step failed:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Entrevista',
        description: 'Não foi possível obter a próxima pergunta. Tente novamente.',
      });
      setMessages(prev => [...prev, { role: 'assistant', content: `Desculpe, ocorreu um erro.` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const userResponseCount = messages.filter(m => m.role === 'user').length;

  if (isLoadingQuestionnaire) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <p>Questionário não encontrado ou inválido.</p>
      </div>
    );
  }
  
  if (pageStatus === 'completed') {
    return (
         <div className="flex h-screen flex-col bg-background text-foreground">
            <header className="p-4 border-b flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">NeuroDO - Perfil Comportamental</h1>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold">Obrigado!</h2>
                <p className="text-muted-foreground mt-2">
                    Suas respostas foram enviadas com sucesso. Seu perfil foi gerado e enviado para o gestor.
                </p>
                 <Button onClick={() => router.push('/')} className="mt-6">Voltar para o Início</Button>
            </main>
        </div>
    );
  }
  
   if (pageStatus === 'generating_profile') {
    return (
         <div className="flex h-screen flex-col bg-background text-foreground">
            <header className="p-4 border-b flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">NeuroDO - Perfil Comportamental</h1>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h2 className="text-2xl font-bold">Analisando seu perfil...</h2>
                <p className="text-muted-foreground mt-2">
                    A IA está processando suas respostas para gerar um perfil comportamental detalhado.
                </p>
            </main>
        </div>
    );
  }


  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
        <header className="p-4 border-b flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">NeuroDO - Perfil Comportamental</h1>
        </header>

        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
            <ScrollArea className="flex-1 -mx-4" ref={scrollAreaRef}>
                <div className="space-y-6 px-4">
                {messages.map((message, index) => (
                    <div
                    key={index}
                    className={cn('flex items-start gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                    {message.role === 'assistant' && (
                        <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">IA</AvatarFallback>
                        </Avatar>
                    )}
                    <div className={cn('max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        {message.content}
                    </div>
                    {message.role === 'user' && (
                        <Avatar className="h-8 w-8">
                        <AvatarFallback>{teamMember?.name.charAt(0) || 'V'}</AvatarFallback>
                        </Avatar>
                    )}
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex items-start gap-3 justify-start">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground">IA</AvatarFallback></Avatar>
                        <div className="bg-muted rounded-lg p-3 flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Pensando...</span>
                        </div>
                    </div>
                )}
                </div>
            </ScrollArea>
            
             {userResponseCount >= 2 && pageStatus === 'interview' && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Sente que já respondeu o suficiente?</p>
                <Button variant="secondary" onClick={handleFinishInterview} disabled={isFinishing}>
                    {isFinishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
                    Finalizar e Gerar Perfil
                </Button>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
                <Input
                id="message"
                placeholder="Digite sua resposta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                disabled={isProcessing || isFinishing}
                className="flex-1"
                />
                <Button type="submit" size="icon" onClick={handleSend} disabled={isProcessing || isFinishing}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Enviar</span>
                </Button>
            </div>
        </main>
    </div>
  );
}

    