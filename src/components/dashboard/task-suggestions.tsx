'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader2, Wand2 } from 'lucide-react';
import { useApp } from '@/hooks/use-app';
import type { ProvideContextAwareAssistanceOutput } from '@/ai/flows/provide-context-aware-assistance';
import { provideContextAwareAssistance } from '@/ai/flows/provide-context-aware-assistance';
import { projects } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

export function TaskSuggestions() {
  const { energyLevel } = useApp();
  const [suggestions, setSuggestions] = useState<ProvideContextAwareAssistanceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getSuggestions = async () => {
    if (energyLevel === null) {
        toast({ title: "Defina seu nível de energia primeiro!", description: "Faça o check-in de sua energia para obter sugestões de tarefas personalizadas."})
        return
    };

    setIsLoading(true);
    setSuggestions(null);
    const result = await provideContextAwareAssistance({
      energyLevel: energyLevel,
      project: projects[0].name,
      prompt: 'Sugira proativamente uma tarefa para mim com base no meu nível de energia e no projeto atual.',
    });

    // Server action nunca lança — checa flag de erro embutida
    if (result._isError) {
      toast({
        variant: 'destructive',
        title: 'Erro do Mentor de IA',
        description: result._errorMessage || 'Não foi possível gerar sugestões. Tente novamente.',
      });
      setIsLoading(false);
      return;
    }

    setSuggestions(result);
    setIsLoading(false);
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="text-primary" />
                    Sugestões do Mentor de IA
                </CardTitle>
                <CardDescription>Top 3 tarefas com base na sua energia atual.</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={getSuggestions} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                <span className="sr-only">Gerar sugestões</span>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-40 space-y-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Seu Mentor de IA está pensando...</p>
          </div>
        )}
        {!isLoading && !suggestions && (
          <div className="flex flex-col items-center justify-center h-40 space-y-4 text-center">
            <p className="text-muted-foreground">
                {energyLevel === null ? "Faça o check-in de sua energia para ver no que você deve focar." : "Pronto para suas tarefas? Clique na varinha mágica!"}
            </p>
            <Button onClick={getSuggestions}>
              <Wand2 className="mr-2 h-4 w-4" />
              Sugerir Tarefas
            </Button>
          </div>
        )}
        {suggestions && (
          <div className="space-y-4">
             <div className="p-4 rounded-lg bg-muted">
                <h3 className="font-semibold">{suggestions.suggestion}</h3>
                <p className="text-sm text-muted-foreground mt-1 italic">"{suggestions.reasoning}"</p>
            </div>
            {suggestions.breakdown && (
                 <div className="space-y-2">
                    {suggestions.breakdown.split('\n').filter(s => s.trim().length > 0).slice(0,3).map((step, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-md border border-dashed">
                             <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">{index + 1}</span>
                             <p className="text-sm">{step.replace(/^- /, '')}</p>
                        </div>
                    ))}
                 </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
