'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lightbulb, Sparkles } from 'lucide-react';
import { classifyAndRouteIdea } from '@/ai/flows/classify-and-route-idea';
import { projects } from '@/lib/data';

export function IdeaCatcher() {
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcessIdea = async () => {
    if (idea.trim().length === 0) {
      toast({
        variant: 'destructive',
        title: 'Ideia Vazia',
        description: 'Por favor, anote sua ideia antes de processar.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await classifyAndRouteIdea({
        idea,
        projects: projects.map((p) => p.name),
      });

      if (!result.ok) {
        toast({
          variant: 'destructive',
          title: result.errorCode === 'NO_CREDITS' ? 'IA temporariamente sem créditos' : 'Erro de IA',
          description: result.error,
        });
        setIsProcessing(false);
        return;
      }

      const classification = result.data;

      if (classification.routeTo2027) {
        toast({
          title: 'Ideia classificada para revisão futura',
          description: classification.reason,
        });
        // Here you would typically save the idea to the 2027 bucket in Firestore
        console.log(`Idea "${idea}" classificada para revisão futura. Reason: ${classification.reason}`);
      } else {
        toast({
          title: 'Ideia Processada!',
          description: `Encaminhada para ${classification.relevantProject || 'revisão'}. Motivo: ${classification.reason}`,
        });
        // Here you would save the idea to the relevant project in Firestore
        console.log(`Idea "${idea}" routed to ${classification.relevantProject}.`, classification);
      }
      resetState();
    } catch (error) {
      console.error('AI processing failed:', error);
      toast({
        variant: 'destructive',
        title: 'Erro de IA',
        description: 'Não foi possível processar a ideia agora. O texto foi mantido para você tentar novamente.',
      });
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setOpen(false);
    setIdea('');
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isProcessing) {
            setOpen(isOpen)
        }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Lightbulb className="mr-2 h-4 w-4" />
          Captura Rápida
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Captura Rápida de Ideia
          </DialogTitle>
          <DialogDescription>
            Teve uma ideia brilhante? Anote-a aqui e deixe a IA fazer a triagem.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            id="idea"
            placeholder="O que está na sua mente? Ex: 'Uma nova máquina de café com IA...'"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            className="min-h-[120px]"
            disabled={isProcessing}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleProcessIdea} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              'Processar Ideia'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
