'use client';

import { useState, useMemo, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Task, AISuggestedTask } from '@/lib/types';
import {
  Moon, Sparkles, Loader2, CheckCircle2, Circle, ThumbsUp, ThumbsDown,
  Pencil, Save, AlertTriangle, Zap, Brain, Calendar,
} from 'lucide-react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useUser, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/context/app-provider';
import { generateNightlyReview } from '@/ai/flows/generate-nightly-review';
import { cn } from '@/lib/utils';

type SuggestionState = 'pending' | 'accepted' | 'rejected' | 'editing';

interface SuggestionItem extends AISuggestedTask {
  state: SuggestionState;
  editedContent: string;
}

const priorityLabel: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

export function EveningReviewForm() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const appContext = useContext(AppContext);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  // Local energy slider if AppContext has no value
  const [localEnergy, setLocalEnergy] = useState<number>(5);
  const energyLevel = appContext?.energyLevel ?? localEnergy;
  const handleSetEnergy = (val: number) => {
    if (appContext?.setEnergyLevel) {
      appContext.setEnergyLevel(val);
    } else {
      setLocalEnergy(val);
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiResult, setAiResult] = useState<{
    dayAnalysis: string;
    energyPattern: string;
    motivationalNote: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);

  // Load today's tasks from Firestore
  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'tasks');
  }, [firestore, user]);
  const { data: allTasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  const todaysTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(t => t.scheduledDate && t.scheduledDate.startsWith(todayStr));
  }, [allTasks, todayStr]);

  const completedTasks = useMemo(() => todaysTasks.filter(t => t.completed), [todaysTasks]);
  const completionPct = todaysTasks.length > 0 ? Math.round((completedTasks.length / todaysTasks.length) * 100) : 0;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await generateNightlyReview({
        tasksToday: todaysTasks.map(t => ({
          content: t.content,
          completed: t.completed,
          scheduledTime: t.scheduledTime,
          priority: t.priority,
          estimatedMinutes: t.estimatedMinutes,
          projectId: t.projectId,
        })),
        energyLevel,
        date: todayStr,
      });

      setAiResult({
        dayAnalysis: result.dayAnalysis,
        energyPattern: result.energyPattern,
        motivationalNote: result.motivationalNote,
      });

      setSuggestions(
        result.suggestedTasks.map(t => ({
          ...t,
          state: 'pending',
          editedContent: t.content,
        }))
      );
    } catch (err: any) {
      toast({
        title: 'Erro na análise',
        description: err.message || 'Não foi possível gerar a análise. Verifique sua conexão.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSuggestionAction = (idx: number, action: 'accept' | 'reject' | 'edit' | 'save') => {
    setSuggestions(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      if (action === 'accept') return { ...s, state: 'accepted' };
      if (action === 'reject') return { ...s, state: 'rejected' };
      if (action === 'edit') return { ...s, state: 'editing' };
      if (action === 'save') return { ...s, state: 'accepted' as SuggestionState };
      return s;
    }));
  };

  const handleEditContent = (idx: number, value: string) => {
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, editedContent: value } : s));
  };

  const handleSave = async () => {
    if (!user || !firestore) return;
    setIsSaving(true);

    try {
      const acceptedSuggestions = suggestions.filter(s => s.state === 'accepted');

      // Build review document
      const reviewData = {
        userId: user.uid,
        date: todayStr,
        energyLevel,
        tasksCompleted: completedTasks.length,
        tasksTotal: todaysTasks.length,
        tasksSummary: completedTasks.map(t => t.content),
        aiAnalysis: aiResult?.dayAnalysis ?? '',
        aiEnergyPattern: aiResult?.energyPattern ?? '',
        aiSuggestedTasks: suggestions.map(({ state, editedContent, ...rest }) => ({
          ...rest,
          content: state === 'accepted' ? editedContent : rest.content,
        })),
        aiMotivationalNote: aiResult?.motivationalNote ?? '',
        createdAt: new Date().toISOString(),
      };

      // Save review using setDoc (docId = YYYY-MM-DD)
      const reviewRef = doc(firestore, 'users', user.uid, 'reviews', todayStr);
      setDocumentNonBlocking(reviewRef, reviewData, { merge: true });

      // Create accepted tasks for tomorrow
      const tasksColRef = collection(firestore, 'users', user.uid, 'tasks');
      for (const suggestion of acceptedSuggestions) {
        const taskData = {
          userId: user.uid,
          content: suggestion.editedContent || suggestion.content,
          completed: false,
          completedAt: null,
          isMIT: suggestion.priority === 'high',
          priority: suggestion.priority,
          type: 'Tático' as const,
          scheduledDate: tomorrowStr,
          scheduledTime: suggestion.scheduledTime,
          estimatedMinutes: suggestion.estimatedMinutes,
          createdAt: new Date().toISOString(),
        };
        addDocumentNonBlocking(tasksColRef, taskData);
      }

      toast({
        title: '✅ Revisão salva!',
        description: acceptedSuggestions.length > 0
          ? `${acceptedSuggestions.length} tarefa(s) programada(s) para amanhã.`
          : 'Revisão salva. Bom descanso!',
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar a revisão.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || areTasksLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Card — tasks summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="text-primary" /> Resumo do Dia
          </CardTitle>
          <CardDescription>
            {todayStr} — tarefas carregadas automaticamente do Plano do Dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando tarefas...
            </div>
          ) : todaysTasks.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Nenhuma tarefa registrada hoje. A IA vai sugerir com base na sua energia.</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{completedTasks.length} de {todaysTasks.length} concluídas</span>
                <span className="text-muted-foreground">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-2" />
              <ul className="space-y-1 mt-2">
                {todaysTasks.map(task => (
                  <li key={task.id} className="flex items-center gap-2 text-sm">
                    {task.completed
                      ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={cn(task.completed && 'line-through text-muted-foreground')}>
                      {task.content}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs shrink-0">
                      {task.scheduledTime}
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Energy Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="text-yellow-400" /> Energia do Dia
          </CardTitle>
          <CardDescription>Como você se sente ao encerrar o dia? (0 = esgotado, 10 = cheio de energia)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Slider
              min={0}
              max={10}
              step={1}
              value={[energyLevel]}
              onValueChange={([val]) => handleSetEnergy(val)}
              className="flex-1"
            />
            <span className="text-2xl font-bold w-8 text-center">{energyLevel}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {energyLevel <= 3 && '😴 Energia baixa — sugestões de tarefas leves e sprints de 15 min.'}
            {energyLevel >= 4 && energyLevel <= 6 && '😐 Energia média — Pomodoros de 25 min recomendados.'}
            {energyLevel >= 7 && '⚡ Energia alta — pronto para foco profundo de 50 min!'}
          </p>
        </CardContent>
      </Card>

      {/* AI Analysis button */}
      {!aiResult && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleAnalyze}
          disabled={isAnalyzing || isLoading}
        >
          {isAnalyzing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando seu dia...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Analisar meu dia com IA</>
          )}
        </Button>
      )}

      {/* AI Result */}
      {aiResult && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="text-primary" /> Análise do Mentor IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Análise do dia</p>
                <p className="text-sm">{aiResult.dayAnalysis}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Padrão de energia</p>
                <p className="text-sm">{aiResult.energyPattern}</p>
              </div>
              <div className="rounded-md bg-primary/10 p-3">
                <p className="text-sm italic">💚 {aiResult.motivationalNote}</p>
              </div>
            </CardContent>
          </Card>

          {/* Suggested tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-primary" /> Sugestões para Amanhã
              </CardTitle>
              <CardDescription>
                Aceite, edite ou rejeite cada sugestão. As aceitas serão criadas no Plano do Dia de amanhã.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-lg border p-4 space-y-2 transition-opacity',
                    s.state === 'rejected' && 'opacity-40',
                    s.state === 'accepted' && 'border-primary/50 bg-primary/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    {s.state === 'editing' ? (
                      <Input
                        value={s.editedContent}
                        onChange={e => handleEditContent(idx, e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                    ) : (
                      <p className={cn(
                        'text-sm flex-1',
                        s.state === 'rejected' && 'line-through',
                        s.state === 'accepted' && 'font-medium',
                      )}>
                        {s.state === 'accepted' ? s.editedContent : s.content}
                      </p>
                    )}
                    <div className="flex gap-1 shrink-0">
                      {s.state === 'editing' ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSuggestionAction(idx, 'save')}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      ) : s.state !== 'rejected' ? (
                        <>
                          <Button
                            size="sm"
                            variant={s.state === 'accepted' ? 'default' : 'outline'}
                            onClick={() => handleSuggestionAction(idx, s.state === 'accepted' ? 'reject' : 'accept')}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSuggestionAction(idx, 'edit')}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSuggestionAction(idx, 'reject')}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSuggestionAction(idx, 'accept')}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={priorityVariant[s.priority] ?? 'secondary'} className="text-xs">
                      {priorityLabel[s.priority] ?? s.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{s.scheduledTime}</Badge>
                    <Badge variant="outline" className="text-xs">{s.estimatedMinutes} min</Badge>
                  </div>

                  {s.reasoning && (
                    <p className="text-xs text-muted-foreground italic">💡 {s.reasoning}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Save button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Salvar revisão e programar amanhã</>
            )}
          </Button>

          <Button
            className="w-full"
            variant="outline"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando nova análise...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Gerar nova análise</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
