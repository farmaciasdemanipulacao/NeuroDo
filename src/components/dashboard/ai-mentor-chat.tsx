'use client';

import { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, Send, Sparkles, AlertCircle, X } from 'lucide-react';
import { chatWithMentor } from '@/ai/flows/chat-with-mentor';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '@/lib/utils';
import { FirebaseContext, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useTimesheets } from '@/hooks/use-timesheets';
import { useAboutMe } from '@/hooks/use-about-me';
import { useSharedGoals, useSharedTasks } from '@/context/dashboard-data-provider';
import type {
  Document as KnowledgeDocument,
  ManagedProject,
  RoadmapMilestone,
} from '@/lib/types';

type Message = {
  role: 'user' | 'assistant' | 'error';
  content: string;
};

const quickActions = [
  { label: '🔒 Estou travado', prompt: 'Estou me sentindo travado e não sei como avançar. Pode me ajudar a identificar o próximo passo?' },
  { label: '🎉 Quero celebrar', prompt: 'Quero compartilhar uma vitória! Acabei de...' },
  { label: '🤔 Preciso decidir', prompt: 'Estou diante de uma decisão e gostaria da sua perspectiva. A situação é a seguinte...' },
  { label: '😰 Estou ansioso', prompt: 'Estou me sentindo ansioso com [descreva a situação]. Pode me ajudar a organizar meus pensamentos?' },
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_CODES = ['TIMEOUT', 'RATE_LIMIT', 'OPENAI_SERVER_ERROR'];

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const GOAL_TYPE_ORDER: Record<string, number> = {
  yearly: 0,
  quarterly: 1,
  monthly: 2,
  weekly: 3,
};

class MentorRequestError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'MentorRequestError';
    this.code = code;
  }
}

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function toDateLabel(value: string | { toDate: () => Date } | undefined) {
  if (!value) return 'sem prazo';
  const date = typeof value === 'string' ? new Date(value) : value.toDate();
  return Number.isNaN(date.getTime()) ? 'sem prazo' : date.toLocaleDateString('pt-BR');
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}…`
    : normalized;
}

async function chatWithMentorWithRetry(
  message: string,
  history: Message[],
  profileContext = '',
  retryCount = 0
): Promise<string> {
  const historyForApi = history
    .filter(m => m.role !== 'error')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const result = await chatWithMentor({ message, history: historyForApi, profileContext });

  if (result.error) {
    console.error(
      `[MentorDo Retry ${retryCount}/${MAX_RETRIES}] errorCode=${result.errorCode} — ${result.error} retryAfterMs=${result.retryAfterMs ?? 'n/a'}`
    );

    const canRetry =
      retryCount < MAX_RETRIES &&
      RETRYABLE_CODES.includes(result.errorCode ?? '');

    if (canRetry) {
      const serverRetryMs =
        typeof result.retryAfterMs === 'number' ? result.retryAfterMs : undefined;
      const baseDelay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      let delay = baseDelay;

      if (serverRetryMs && serverRetryMs > baseDelay) {
        delay = serverRetryMs + Math.floor(Math.random() * 1000);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      return chatWithMentorWithRetry(
        message,
        history,
        profileContext,
        retryCount + 1
      );
    }

    throw new MentorRequestError(result.error, result.errorCode);
  }

  return result.response ?? '';
}

interface AiMentorChatProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AiMentorChat({ open: openProp, onOpenChange }: AiMentorChatProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const firebaseCtx = useContext(FirebaseContext);
  const firestore = firebaseCtx?.firestore ?? null;
  const user = firebaseCtx?.user ?? null;

  const { profile: mentorProfile } = useAboutMe();
  const { data: tasks } = useSharedTasks();
  const { data: goals } = useSharedGoals();
  const { data: timesheets } = useTimesheets();

  // Coleções menos usadas só ficam com listener ativo enquanto o Mentor estiver aberto.
  const milestonesQuery = useMemoFirebase(() => {
    if (!open || !user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'milestones'));
  }, [open, user, firestore]);

  const projectsQuery = useMemoFirebase(() => {
    if (!open || !user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'projects'));
  }, [open, user, firestore]);

  const documentsQuery = useMemoFirebase(() => {
    if (!open || !user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'documents'));
  }, [open, user, firestore]);

  const { data: milestones } = useCollection<RoadmapMilestone>(milestonesQuery);
  const { data: projects } = useCollection<ManagedProject>(projectsQuery);
  const { data: documents } = useCollection<KnowledgeDocument>(documentsQuery);

  const fullProfileContext = useMemo(() => {
    const sections: string[] = [
      'CONTEXTO OPERACIONAL ATUAL DO NEURODO. Use estes dados como fonte de verdade para orientar prioridades. Não invente tarefas, metas, prazos, documentos ou projetos que não estejam aqui.',
    ];

    if (mentorProfile) {
      sections.push(
        `PERFIL MENTORDO: neurodivergência=${mentorProfile.neurodivergence?.join(', ') || 'não informado'}; medicação=${mentorProfile.medication || 'não informado'}; diagnósticos=${mentorProfile.diagnoses || 'não informado'}; crenças limitantes=${mentorProfile.limitingBeliefs || 'não informado'}; desafios=${mentorProfile.challenges || 'não informado'}; preferências=${mentorProfile.preferences ? JSON.stringify(mentorProfile.preferences) : 'não informado'}; vícios=${mentorProfile.addictions?.map((a: any) => `${a.name}${a.willingToChange ? ' (quer mudar)' : ''}`).join(', ') || 'não informado'}.`
      );
    }

    const activeProjects = (projects ?? [])
      .filter(project => project.status === 'active' || project.status === 'paused')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return (a.priority ?? 99) - (b.priority ?? 99);
      })
      .slice(0, 10);

    if (activeProjects.length > 0) {
      sections.push(
        `PROJETOS: ${activeProjects.map(project =>
          `"${project.name}" [${project.status}; categoria=${project.category}; prioridade=${project.priority ?? 'sem prioridade'}; responsável=${project.responsibleName || 'não informado'}; papel do usuário=${project.ownerRole}; receita estimada/mês=${project.estimatedMonthlyRevenue ?? 0}]`
        ).join('; ')}.`
      );
    }

    const projectNameById = new Map(
      (projects ?? []).map(project => [project.id, project.name])
    );

    const today = localDateKey();
    const pendingTasks = (tasks ?? [])
      .filter(task => !task.completed)
      .sort((a, b) => {
        if (a.isMIT !== b.isMIT) return a.isMIT ? -1 : 1;
        const priorityDiff =
          (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        if (priorityDiff !== 0) return priorityDiff;
        return (a.scheduledDate || '9999-12-31').localeCompare(
          b.scheduledDate || '9999-12-31'
        );
      })
      .slice(0, 12);

    if (pendingTasks.length > 0) {
      sections.push(
        `TAREFAS PENDENTES PRIORITÁRIAS: ${pendingTasks.map(task => {
          const dateState =
            task.scheduledDate < today
              ? `ATRASADA desde ${task.scheduledDate}`
              : task.scheduledDate === today
                ? 'HOJE'
                : task.scheduledDate || 'sem data';
          const project = task.projectId
            ? projectNameById.get(task.projectId) ?? task.projectId
            : 'sem projeto';
          return `"${task.content}" [${dateState}; prioridade=${task.priority}; MIT=${task.isMIT ? 'sim' : 'não'}; projeto=${project}; estimativa=${task.estimatedMinutes ?? 0}min]`;
        }).join('; ')}.`
      );
    }

    const activeGoals = (goals ?? [])
      .filter(goal => goal.status === 'active')
      .sort((a, b) => {
        const typeDiff =
          (GOAL_TYPE_ORDER[a.type] ?? 9) - (GOAL_TYPE_ORDER[b.type] ?? 9);
        if (typeDiff !== 0) return typeDiff;
        return toDateLabel(a.endDate).localeCompare(toDateLabel(b.endDate));
      })
      .slice(0, 8);

    if (activeGoals.length > 0) {
      sections.push(
        `METAS ATIVAS: ${activeGoals.map(goal => {
          const progress =
            goal.targetValue > 0
              ? Math.min(100, (goal.currentValue / goal.targetValue) * 100)
              : goal.progress ?? 0;
          const project = goal.projectId
            ? projectNameById.get(goal.projectId) ?? goal.projectId
            : 'geral';
          return `"${goal.title}" [tipo=${goal.type}; progresso=${progress.toFixed(0)}%; projeto=${project}; prazo=${toDateLabel(goal.endDate)}]`;
        }).join('; ')}.`
      );
    }

    const activeMilestones = (milestones ?? [])
      .filter(milestone => milestone.status !== 'Concluído')
      .sort((a, b) => {
        if (a.status !== b.status) {
          if (a.status === 'Atrasado') return -1;
          if (b.status === 'Atrasado') return 1;
        }
        return toDateLabel(a.endDate).localeCompare(toDateLabel(b.endDate));
      })
      .slice(0, 8);

    if (activeMilestones.length > 0) {
      sections.push(
        `ROADMAP: ${activeMilestones.map(milestone => {
          const project =
            projectNameById.get(milestone.projectId) ?? milestone.projectId;
          return `"${milestone.title}" [${milestone.status}; progresso=${milestone.progress ?? 0}%; projeto=${project}; prazo=${toDateLabel(milestone.endDate)}]`;
        }).join('; ')}. Priorize tarefas ligadas a marcos ativos ou atrasados quando isso fizer sentido.`
      );
    }

    const usefulDocuments = [...(documents ?? [])]
      .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)))
      .slice(0, 6);

    if (usefulDocuments.length > 0) {
      sections.push(
        `BASE DE CONHECIMENTO: ${usefulDocuments.map(doc => {
          const project = doc.projectId
            ? projectNameById.get(doc.projectId) ?? doc.projectId
            : 'geral';
          return `"${doc.title}" [${doc.type}; projeto=${project}; fixado=${doc.isPinned ? 'sim' : 'não'}]: ${compactText(doc.content || '', 360)}`;
        }).join(' | ')}.`
      );
    }

    if (timesheets && timesheets.length > 0) {
      const totalHours =
        timesheets.reduce((sum, item) => sum + (item.duration || 0), 0) / 3600;
      const topTaskTitles = [
        ...new Set(timesheets.map(item => item.taskTitle).filter(Boolean)),
      ].slice(0, 5);

      sections.push(
        `PRODUTIVIDADE RECENTE: ${timesheets.length} sessões, ${totalHours.toFixed(1)} horas registradas. Tarefas mais trabalhadas: ${topTaskTitles.join(', ') || 'não informado'}.`
      );
    }

    return sections.join('\n\n');
  }, [documents, goals, mentorProfile, milestones, projects, tasks, timesheets]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const timer = setTimeout(() => {
        scrollAreaRef.current?.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isProcessing]);

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage) return;

    setHasError(false);
    setLastErrorMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsProcessing(true);

    console.log('[AI Mentor Chat] Enviando mensagem:', { length: userMessage.length });

    try {
      const result = await chatWithMentorWithRetry(
        userMessage,
        messages,
        fullProfileContext
      );

      if (!result || !result.trim()) {
        throw new Error('Resposta vazia do mentor');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
      console.log('[AI Mentor Chat] Resposta recebida com sucesso');
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido';

      console.error('[AI Mentor Chat] Erro durante requisição:', {
        error: errorMessage,
        stack: error?.stack,
      });

      setHasError(true);
      const friendlyMessage = determineFriendlyErrorMessage(
        errorMessage,
        error?.code
      );
      setLastErrorMessage(friendlyMessage);

      toast({
        variant: 'destructive',
        title: 'Problemas ao Consultar Mentor',
        description: friendlyMessage,
        duration: 5000,
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content: friendlyMessage,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const determineFriendlyErrorMessage = (
    error: string,
    errorCode?: string
  ): string => {
    const lowerError = error.toLowerCase();

    if (
      errorCode === 'NO_CREDITS' ||
      lowerError.includes('sem créditos') ||
      lowerError.includes('sem creditos') ||
      lowerError.includes('quota disponível')
    ) {
      return 'A IA do NeuroDO está temporariamente sem créditos. O restante do sistema continua funcionando normalmente.';
    }

    if (lowerError.includes('chave') || lowerError.includes('401')) {
      return 'A chave de API não está configurada corretamente. Entre em contato com o administrador.';
    }

    if (lowerError.includes('429') || lowerError.includes('muitas requisições')) {
      return 'Muitas requisições rápidas. Aguarde um pouco e tente novamente.';
    }

    if (
      lowerError.includes('500') ||
      lowerError.includes('indisponível') ||
      lowerError.includes('temporário')
    ) {
      return 'O servidor de IA está temporariamente fora. Tente novamente em alguns instantes.';
    }

    if (
      lowerError.includes('timeout') ||
      lowerError.includes('levou muito tempo')
    ) {
      return 'A resposta levou muito tempo. Tente novamente.';
    }

    if (lowerError.includes('conexão') || lowerError.includes('network')) {
      return 'Verifique sua conexão com a internet e tente novamente.';
    }

    if (lowerError.includes('vazia') || lowerError.includes('inválida')) {
      return 'Por favor, escreva uma mensagem válida e tente novamente.';
    }

    return 'Desculpe, ocorreu um problema ao consultar o mentor. Tente novamente em alguns instantes.';
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="rounded-full shadow-lg w-16 h-16"
        >
          <MessageCircle className="h-7 w-7" />
          <span className="sr-only">Falar com Mentor</span>
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          overlayClassName="bg-background sm:bg-black/80"
          closeButtonClassName="hidden sm:flex"
          className="inset-0 flex h-dvh max-h-dvh w-screen max-w-none flex-col overflow-hidden border-0 p-0 shadow-none sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-full sm:max-w-md sm:border-l sm:p-6 sm:shadow-lg"
        >
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:p-0">
            <div className="flex items-start gap-3">
              <SheetHeader className="min-w-0 flex-1 text-left">
                <SheetTitle className="flex items-center gap-2 pr-2">
                  <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                  Falar com Mentor
                </SheetTitle>
                <SheetDescription>
                  Seu parceiro de IA para destravar, celebrar e decidir. Como posso ajudar agora?
                </SheetDescription>
              </SheetHeader>

              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 sm:hidden"
                  aria-label="Fechar Mentor"
                >
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>

            {hasError && (
              <Alert variant="destructive" className="my-2 shrink-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {lastErrorMessage ||
                    'Estou tendo dificuldades de comunicação. Tente novamente ou aguarde um momento.'}
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea
              className="my-4 min-h-0 flex-1 pr-4 -mr-4"
              ref={scrollAreaRef}
            >
              <div className="space-y-6">
                {messages.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Comece uma conversa digitando abaixo ou usando uma ação rápida.
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {(message.role === 'assistant' ||
                      message.role === 'error') && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {message.role === 'error' ? '⚠️' : 'IA'}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.role === 'error'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : 'bg-muted'
                      )}
                    >
                      {message.content}
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src="https://picsum.photos/seed/user-avatar/100/100"
                          alt="@user"
                        />
                        <AvatarFallback>G</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        IA
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3 flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Pensando...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="shrink-0 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map(action => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isProcessing}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  id="message"
                  placeholder="Digite sua mensagem..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) =>
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    (event.preventDefault(), handleSend())
                  }
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  onClick={handleSend}
                  disabled={isProcessing}
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Enviar</span>
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
