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
import { useProjects } from '@/hooks/use-projects';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

export function IdeaCatcher() {
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { projects: managedProjects } = useProjects();
  const activeProjects = (managedProjects ?? []).filter((project) => project.status === 'active');

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
        projects: activeProjects.map((project) => project.name),
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

      if (!user || !firestore) {
        toast({
          variant: 'destructive',
          title: 'Não foi possível salvar a ideia',
          description: 'Sua sessão ainda não está pronta. O texto foi mantido para você tentar novamente.',
        });
        setIsProcessing(false);
        return;
      }

      const matchedProject = classification.relevantProject
        ? activeProjects.find(
            (project) => project.name.trim().toLowerCase() === classification.relevantProject!.trim().toLowerCase()
          )
        : undefined;

      const bucket = classification.routeTo2027 ? '2027' : (matchedProject?.id ?? '2027');

      await addDocumentNonBlocking(
        collection(firestore, 'users', user.uid, 'ideas'),
        {
          userId: user.uid,
          content: idea.trim(),
          bucket,
          relevantProjectName: matchedProject?.name ?? classification.relevantProject ?? null,
          routeTo2027: classification.routeTo2027 || !matchedProject,
          reason: classification.reason,
          createdAt: new Date().toISOString(),
        }
      );

      if (bucket === '2027') {
        toast({
          title: 'Ideia salva para revisão futura',
          description: classification.reason,
        });
      } else {
        toast({
          title: 'Ideia salva e encaminhada!',
          description: `Encaminhada para ${matchedProject?.name}. Motivo: ${classification.reason}`,
        });
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
        <Button variant="outline" size="sm" className="shadow-none hover:bg-transparent hover:text-foreground md:hover:bg-accent md:hover:text-accent-foreground">
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
