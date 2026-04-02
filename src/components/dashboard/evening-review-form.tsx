'use client';

import { useState, useMemo, useContext } from 'react';
import { collection, doc } from 'firebase/firestore';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Brain,
  Sparkles,
  Zap,
  MessageSquare,
  CheckCircle,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Moon,
} from 'lucide-react';

import { AppContext } from '@/context/app-provider';
import {
  useCollection,
  useUser,
  addDocumentNonBlocking,
  setDocumentNonBlocking,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { generateNightlyReview, type GenerateNightlyReviewOutput } from '@/ai/flows/generate-nightly-review';
import type { Task, AISuggestedTask } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type SuggestedTaskItem = AISuggestedTask & {
  accepted: boolean;
  editedContent: string;
  showReasoning: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const priorityLabel: Record<AISuggestedTask['priority'], string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const priorityColor: Record<AISuggestedTask['priority'], string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return format(new Date(year, month - 1, day), "EEEE, d 'de' MMMM", { locale: ptBR });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EveningReviewForm() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { energyLevel, setEnergyLevel } = useContext(AppContext)!;

  // Date strings computed inside the component so they stay correct across midnight
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => addDays(new Date(), 1).toISOString().split('T')[0], []);

  // AI result state
  const [aiResult, setAiResult] = useState<GenerateNightlyReviewOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Suggested tasks with per-item accept/edit state
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTaskItem[]>([]);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // ── Load today's tasks from Firestore ──────────────────────────────────────
  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'tasks');
  }, [firestore, user]);

  const { data: allTasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  const todaysTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(
      (task) => task.scheduledDate && task.scheduledDate.startsWith(todayStr)
    );
  }, [allTasks, todayStr]);

  const tasksCompleted = useMemo(
    () => todaysTasks.filter((t) => t.completed).length,
    [todaysTasks]
  );
  const tasksTotal = todaysTasks.length;
  const completionPct = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  // ── Progress bar color ─────────────────────────────────────────────────────
  const progressColor =
    completionPct >= 70
      ? 'bg-green-500'
      : completionPct >= 40
      ? 'bg-yellow-500'
      : 'bg-red-500';

  // ── Handle AI analysis ─────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (energyLevel == null) return;

    setIsGenerating(true);
    try {
      const result = await generateNightlyReview({
        energyLevel: energyLevel,
        tasksCompleted,
        tasksTotal,
        tasksSummary: todaysTasks.map((t) => ({
          content: t.content,
          completed: t.completed,
        })),
        date: todayStr,
        hasTasks: tasksTotal > 0,
      });

      setAiResult(result);
      setSuggestedTasks(
        result.suggestedTasks.map((t) => ({
          ...t,
          accepted: true,
          editedContent: t.content,
          showReasoning: false,
        }))
      );
    } catch (err: any) {
      toast({
        title: 'Erro ao analisar o dia',
        description: err.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Handle save ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user || !firestore || !aiResult || energyLevel == null) return;

    setIsSaving(true);

    const acceptedTasks = suggestedTasks.filter((t) => t.accepted);
    const getFinalContent = (t: SuggestedTaskItem) => t.editedContent || t.content;

    // 1. Save review document (use date as docId for idempotency)
    const reviewRef = doc(firestore, 'users', user.uid, 'reviews', todayStr);
    setDocumentNonBlocking(
      reviewRef,
      {
        userId: user.uid,
        date: todayStr,
        energyLevel: energyLevel,
        tasksCompleted,
        tasksTotal,
        tasksSummary: todaysTasks.map((t) => ({
          id: t.id,
          content: t.content,
          completed: t.completed,
        })),
        aiAnalysis: aiResult.dayAnalysis,
        aiEnergyPattern: aiResult.energyPattern,
        aiSuggestedTasks: acceptedTasks.map((t) => ({
          content: getFinalContent(t),
          priority: t.priority,
          scheduledTime: t.scheduledTime,
          estimatedMinutes: t.estimatedMinutes,
          reasoning: t.reasoning,
        })),
        aiMotivationalNote: aiResult.motivationalNote,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2. Create tasks for tomorrow for each accepted suggestion
    const tasksCol = collection(firestore, 'users', user.uid, 'tasks');
    for (const t of acceptedTasks) {
      addDocumentNonBlocking(tasksCol, {
        userId: user.uid,
        content: getFinalContent(t),
        scheduledDate: tomorrowStr,
        scheduledTime: t.scheduledTime,
        estimatedMinutes: t.estimatedMinutes,
        isMIT: t.priority === 'high',
        priority: t.priority,
        type: 'Operacional',
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }

    setIsSaving(false);
    setHasSaved(true);

    toast({
      title: 'Ritual noturno salvo!',
      description: `${acceptedTasks.length} tarefa${acceptedTasks.length !== 1 ? 's' : ''} programada${acceptedTasks.length !== 1 ? 's' : ''} para amanhã.`,
    });
  }

  // ── Helpers for task item state ────────────────────────────────────────────
  function toggleAccepted(index: number) {
    setSuggestedTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, accepted: !t.accepted } : t))
    );
  }

  function updateContent(index: number, value: string) {
    setSuggestedTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, editedContent: value } : t))
    );
  }

  function toggleReasoning(index: number) {
    setSuggestedTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, showReasoning: !t.showReasoning } : t))
    );
  }

  function acceptAll() {
    setSuggestedTasks((prev) => prev.map((t) => ({ ...t, accepted: true })));
  }

  const acceptedCount = suggestedTasks.filter((t) => t.accepted).length;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────


  // indicador de carregamento usado na UI
  const isLoading = isUserLoading || areTasksLoading;
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── SEÇÃO 1: Cabeçalho visual do dia ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="text-primary h-5 w-5" />
            Ritual Noturno
          </CardTitle>
          <p className="text-sm text-muted-foreground capitalize">{formatDate(todayStr)}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {areTasksLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-2 bg-muted rounded" />
            </div>
          ) : tasksTotal === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa registrada hoje. A IA vai sugerir com base na sua energia.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {tasksCompleted} de {tasksTotal} tarefas concluídas
                </span>
                <span
                  className={cn(
                    'font-bold',
                    completionPct >= 70
                      ? 'text-green-400'
                      : completionPct >= 40
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  )}
                >
                  {completionPct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', progressColor)}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <ul className="space-y-1 mt-2">
                {todaysTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'h-4 w-4 rounded-sm border flex items-center justify-center flex-shrink-0',
                        task.completed
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      )}
                    >
                      {task.completed && (
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      )}
                    </span>
                    <span
                      className={cn(
                        task.completed ? 'line-through text-muted-foreground' : ''
                      )}
                    >
                      {task.content}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SEÇÃO 2: Energia do dia ── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {energyLevel !== null ? (
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-medium">Energia registrada:</span>
              <Badge
                className={cn(
                  'text-sm',
                  energyLevel >= 7
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : energyLevel >= 4
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                )}
                variant="outline"
              >
                {energyLevel}/10
              </Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <label htmlFor="energy-slider" className="text-sm font-medium">
                  Como foi sua energia hoje?
                </label>
                <span className="ml-auto text-sm text-muted-foreground">
                  {energyLevel !== null ? `${energyLevel}/10` : 'Deslize para registrar'}
                </span>
              </div>
              <Slider
                id="energy-slider"
                min={0}
                max={10}
                step={1}
                value={[energyLevel ?? 5]}
                onValueChange={([val]) => setEnergyLevel(val)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Sem energia</span>
                <span>Energia máxima</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SEÇÃO 3: Botão analisar ── */}
      {!aiResult && (
        <Button
          className="w-full"
          onClick={handleAnalyze}
          disabled={isGenerating || energyLevel == null}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando seu dia...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Analisar meu dia com IA
            </>
          )}
        </Button>
      )}

      {/* ── SEÇÃO 4: Resultado da análise ── */}
      {aiResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{aiResult.dayAnalysis}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Padrão de Energia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{aiResult.energyPattern}</p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Nota do Mentor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-primary">{aiResult.motivationalNote}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SEÇÃO 5: Tarefas sugeridas para amanhã ── */}
      {aiResult && suggestedTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Sugestões para Amanhã
              </h3>
              <p className="text-sm text-muted-foreground capitalize mt-0.5">
                {formatDate(tomorrowStr)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={acceptAll}>
              Aceitar Todas
            </Button>
          </div>

          {suggestedTasks.map((task, index) => (
            <Card
              key={index}
              className={cn(
                'transition-opacity',
                !task.accepted && 'opacity-50'
              )}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`task-${index}`}
                    checked={task.accepted}
                    onCheckedChange={() => toggleAccepted(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={task.editedContent}
                      onChange={(e) => updateContent(index, e.target.value)}
                      aria-label={`Editar tarefa sugerida ${index + 1}`}
                      className="w-full bg-transparent text-sm resize-none border-none outline-none focus:ring-0 p-0 min-h-[1.5rem]"
                      rows={2}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {task.scheduledTime}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.estimatedMinutes} min
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', priorityColor[task.priority])}
                      >
                        {priorityLabel[task.priority]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleReasoning(index)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {task.showReasoning ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {task.showReasoning ? 'Ocultar justificativa' : 'Ver justificativa'}
                </button>

                {task.showReasoning && (
                  <p className="text-xs text-muted-foreground pl-1 border-l-2 border-primary/30">
                    {task.reasoning}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── SEÇÃO 6: Botão salvar ── */}
      {aiResult && (
        hasSaved ? (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-semibold text-green-400">Ritual noturno concluído!</p>
                <p className="text-sm text-muted-foreground">
                  Amanhã está programado. Descanse bem. 🌙
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving || acceptedCount === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Salvar e programar {acceptedCount} tarefa{acceptedCount !== 1 ? 's' : ''} para amanhã
              </>
            )}
          </Button>
        )
      )}
    </div>
  );
}
