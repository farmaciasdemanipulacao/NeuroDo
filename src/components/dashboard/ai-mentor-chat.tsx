'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { chatWithMentor } from '@/ai/flows/chat-with-mentor';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const quickActions = [
  { label: '🔒 Estou travado', prompt: 'Estou me sentindo travado e não sei como avançar. Pode me ajudar a identificar o próximo passo?' },
  { label: '🎉 Quero celebrar', prompt: 'Quero compartilhar uma vitória! Acabei de...' },
  { label: '🤔 Preciso decidir', prompt: 'Estou diante de uma decisão e gostaria da sua perspectiva. A situação é a seguinte...' },
  { label: '😰 Estou ansioso', prompt: 'Estou me sentindo ansioso com [descreva a situação]. Pode me ajudar a organizar meus pensamentos?' },
];

export function AiMentorChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    const userMessage = input;
    if (!userMessage.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsProcessing(true);

    try {
      // O histórico enviado para o backend é o estado ANTES de adicionar a nova mensagem do modelo.
      const history = messages; 

      const result = await chatWithMentor({
        message: userMessage,
        history: history,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
    } catch (error: any) {
      console.error('AI Mentor chat failed:', error);
      const friendlyMessage = error.message.includes('configuração do servidor') 
        ? 'Ocorreu um erro de configuração no servidor. Verifique as chaves de API e IDs.'
        : 'Não foi possível obter uma resposta do mentor. Tente novamente.';
      
      toast({
        variant: 'destructive',
        title: 'Erro no Chat',
        description: friendlyMessage,
      });

      // Adiciona uma mensagem de erro ao chat para o usuário ver
      setMessages(prev => [...prev, { role: 'assistant', content: `Desculpe, ocorreu um erro de comunicação. (${friendlyMessage})` }]);
    } finally {
      setIsProcessing(false);
    }
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
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                       <AvatarFallback className="bg-primary text-primary-foreground">IA</AvatarFallback>
                    </Avatar>
                  )}
                   <div
                    className={cn(
                      'max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
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
                    <Button key={action.label} variant="outline" size="sm" onClick={() => handleQuickAction(action.prompt)}>
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
