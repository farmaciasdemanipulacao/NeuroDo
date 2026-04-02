'use client';

import { useState, useRef, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, Send, Sparkles, AlertCircle } from 'lucide-react';
import { chatWithMentor } from '@/ai/flows/chat-with-mentor';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '@/lib/utils';
import { FirebaseContext, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

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

// Constantes para retry
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const RETRYABLE_CODES = ['TIMEOUT', 'RATE_LIMIT', 'OPENAI_SERVER_ERROR'];

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

  // Novo padrão: chatWithMentor retorna objeto com error em vez de throw
  if (result.error) {
    console.error(`[MentorDo Retry ${retryCount}/${MAX_RETRIES}] errorCode=${result.errorCode} — ${result.error}`);

    const canRetry = retryCount < MAX_RETRIES && RETRYABLE_CODES.includes(result.errorCode ?? '');
    if (canRetry) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return chatWithMentorWithRetry(message, history, profileContext, retryCount + 1);
    }

    throw new Error(result.error);
  }

  return result.response;
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const firebaseCtx = useContext(FirebaseContext);
  const firestore = firebaseCtx?.firestore ?? null;
  const user = firebaseCtx?.user ?? null;
  const mentorProfileRef = user && firestore ? doc(firestore, 'users', user.uid, 'mentorDo', 'profile') : null;
  const { data: mentorProfile } = useDoc(mentorProfileRef);

  const profileContext = mentorProfile
    ? `Perfil MentorDo do usuário: neurodivergência=${mentorProfile.neurodivergence?.join(', ') || 'não informado'}; medicação=${mentorProfile.medication || 'não informado'}; diagnósticos=${mentorProfile.diagnoses || 'não informado'}; crenças limitantes=${mentorProfile.limitingBeliefs || 'não informado'}; desafios=${mentorProfile.challenges || 'não informado'}; preferências=${mentorProfile.preferences ? JSON.stringify(mentorProfile.preferences) : 'não informado'}; vícios=${mentorProfile.addictions?.map((a: any) => `${a.name}${a.willingToChange ? ' (quer mudar)' : ''}`).join(', ') || 'não informado'}.`
    : '';

  useEffect(() => {
    // Scroll to bottom quando mensagens mudam
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
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsProcessing(true);

    console.log('[AI Mentor Chat] Enviando mensagem:', { length: userMessage.length });

    try {
      const result = await chatWithMentorWithRetry(userMessage, messages, profileContext);

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

      // Determinar mensagem amigável baseada no erro
      const friendlyMessage = determineFriendlyErrorMessage(errorMessage);

      // Mostrar toast de erro
      toast({
        variant: 'destructive',
        title: 'Problemas ao Consultar Mentor',
        description: friendlyMessage,
        duration: 5000,
      });

      // Adicionar mensagem de erro ao chat
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

  const determineFriendlyErrorMessage = (error: string): string => {
    const lowerError = error.toLowerCase();

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

    if (lowerError.includes('timeout') || lowerError.includes('levou muito tempo')) {
      return 'A resposta levou muito tempo. Tente novamente.';
    }

    if (lowerError.includes('conexão') || lowerError.includes('network')) {
      return 'Verifique sua conexão com a internet e tente novamente.';
    }

    if (lowerError.includes('vazia') || lowerError.includes('inválida')) {
      return 'Por favor, escreva uma mensagem válida e tente novamente.';
    }

    // Fallback
    return 'Desculpe, ocorreu um problema ao consultar o mentor. Tente novamente em alguns instantes.';
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <Button onClick={() => setOpen(true)} size="lg" className="rounded-full shadow-lg w-16 h-16">
          <MessageCircle className="h-7 w-7" />
          <span className="sr-only">Falar com Mentor</span>
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5" />
              Falar com Mentor
            </SheetTitle>
            <SheetDescription>
              Seu parceiro de IA para destravar, celebrar e decidir. Como posso ajudar agora?
            </SheetDescription>
          </SheetHeader>

          {/* Alert de erro persistente */}
          {hasError && (
            <Alert variant="destructive" className="my-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Estou tendo dificuldades de comunicação. Tente novamente ou aguarde um momento.
              </AlertDescription>
            </Alert>
          )}

          <ScrollArea className="flex-1 my-4 pr-4 -mr-4" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground p-4">
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
                  {(message.role === 'assistant' || message.role === 'error') && (
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
                      <AvatarImage src="https://picsum.photos/seed/user-avatar/100/100" alt="@user" />
                      <AvatarFallback>G</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="flex items-start gap-3 justify-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">IA</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3 flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="mt-auto space-y-4">
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button type="submit" size="icon" onClick={handleSend} disabled={isProcessing}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Enviar</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
