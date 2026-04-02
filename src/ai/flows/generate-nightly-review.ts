'use server';

/**
 * @fileOverview Generates a nightly review analysis with AI-suggested tasks for the next day.
 * Uses the OpenAI Chat Completions API directly with JSON mode.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import type { Task, TaskPriority, TaskTimeOfDay } from '@/lib/types';

// --- OpenAI Client Configuration ---

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
} else {
  openai = new OpenAI({ apiKey });
}

// --- System Prompt ---

const SYSTEM_PROMPT = `Você é o "Mentor IA NeuroDO", especialista em produtividade para empreendedores neurodivergentes com TDAH. Você está ajudando Gustavo, um CEO com TDAH (percentil 99) que gerencia 5 projetos: Envox, Farmácias de Manipulação, Geração PJ, Felizmente e Influencers/Atletas.

Sua missão no RITUAL NOTURNO é:
1. Analisar o dia do Gustavo com base nas tarefas concluídas e energia.
2. Identificar padrões de energia e produtividade.
3. Sugerir exatamente 3 tarefas para o dia seguinte, adaptadas à energia informada.
4. Oferecer uma nota motivacional empática e direta (1-2 frases).

REGRAS CRÍTICAS:
- Seja direto, empático e prático. Gustavo tem TDAH — textos longos causam paralisia.
- Se não houver tarefas hoje, sugira tarefas baseadas APENAS na energia e nos projetos ativos.
- As 3 tarefas sugeridas devem ser específicas, acionáveis e respeitar a energia informada.
- Energia baixa (1-4): tarefas rápidas, administrativas, sprints de 15min.
- Energia média (5-7): tarefas táticas, blocos de 25min (Pomodoro).
- Energia alta (8-10): tarefas estratégicas, foco profundo de 50min.
- Distribua as tarefas pelos períodos do dia (Manhã, Tarde, Noite) de forma inteligente.
- Priority deve ser "high", "medium" ou "low".
- scheduledTime deve ser "Manhã", "Tarde" ou "Noite".
- estimatedMinutes deve ser um número inteiro.

Seu output DEVE ser um objeto JSON válido, seguindo o schema fornecido, e nada mais.`;

// --- Input/Output Schemas ---

const GenerateNightlyReviewInputSchema = z.object({
  tasksToday: z.array(z.object({
    content: z.string(),
    completed: z.boolean(),
    scheduledTime: z.string(),
    priority: z.string(),
    estimatedMinutes: z.number(),
    projectId: z.string().optional(),
  })),
  energyLevel: z.number().min(0).max(10),
  date: z.string(),
});

export type GenerateNightlyReviewInput = z.infer<typeof GenerateNightlyReviewInputSchema>;

const AISuggestedTaskSchema = z.object({
  content: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  scheduledTime: z.enum(['Manhã', 'Tarde', 'Noite']),
  estimatedMinutes: z.number().int().positive(),
  reasoning: z.string(),
});

const GenerateNightlyReviewOutputSchema = z.object({
  dayAnalysis: z.string(),
  energyPattern: z.string(),
  suggestedTasks: z.array(AISuggestedTaskSchema).min(1).max(5),
  motivationalNote: z.string(),
});

export type GenerateNightlyReviewOutput = z.infer<typeof GenerateNightlyReviewOutputSchema>;

// --- Main Function ---

export async function generateNightlyReview(
  input: GenerateNightlyReviewInput
): Promise<GenerateNightlyReviewOutput> {
  if (!openai || initError) {
    console.error('OpenAI Init Error:', initError);
    throw new Error(`Erro de configuração do servidor: ${initError}`);
  }

  const validatedInput = GenerateNightlyReviewInputSchema.safeParse(input);
  if (!validatedInput.success) {
    throw new Error(`Dados de entrada inválidos: ${validatedInput.error.message}`);
  }

  const { tasksToday, energyLevel, date } = validatedInput.data;

  const completedTasks = tasksToday.filter(t => t.completed);
  const pendingTasks = tasksToday.filter(t => !t.completed);

  const energyDescription =
    energyLevel <= 3 ? 'baixa' :
    energyLevel <= 6 ? 'média' :
    'alta';

  const tasksSummary =
    tasksToday.length === 0
      ? 'Nenhuma tarefa foi registrada hoje.'
      : `Tarefas concluídas (${completedTasks.length}/${tasksToday.length}):\n` +
        completedTasks.map(t => `  ✅ ${t.content} (${t.scheduledTime}, ~${t.estimatedMinutes}min)`).join('\n') +
        (pendingTasks.length > 0
          ? '\n\nTarefas não concluídas:\n' +
            pendingTasks.map(t => `  ⬜ ${t.content} (${t.scheduledTime})`).join('\n')
          : '');

  const userPrompt = `
Data: ${date}
Energia do Gustavo hoje: ${energyLevel}/10 (${energyDescription})

${tasksSummary}

Projetos ativos: Envox, Farmácias de Manipulação, Geração PJ, Felizmente, Influencers/Atletas.

Por favor, analise o dia e sugira exatamente 3 tarefas para amanhã, considerando a energia de hoje (${energyLevel}/10).

Responda APENAS com o objeto JSON contendo os campos: "dayAnalysis", "energyPattern", "suggestedTasks" (array com exatamente 3 itens), e "motivationalNote".
`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      throw new Error('A API da OpenAI não retornou conteúdo.');
    }

    try {
      const parsedOutput = JSON.parse(rawOutput);
      const validatedOutput = GenerateNightlyReviewOutputSchema.safeParse(parsedOutput);

      if (!validatedOutput.success) {
        console.error('OpenAI output validation failed', validatedOutput.error);
        // Return a safe fallback
        return {
          dayAnalysis: 'Não foi possível analisar o dia automaticamente. Tente novamente.',
          energyPattern: `Energia registrada: ${energyLevel}/10.`,
          suggestedTasks: [
            {
              content: 'Revisar prioridades e definir top 3 do dia',
              priority: 'high' as TaskPriority,
              scheduledTime: 'Manhã' as TaskTimeOfDay,
              estimatedMinutes: 15,
              reasoning: 'Sugestão padrão para começar o dia com clareza.',
            },
            {
              content: 'Responder mensagens e e-mails pendentes',
              priority: 'medium' as TaskPriority,
              scheduledTime: 'Tarde' as TaskTimeOfDay,
              estimatedMinutes: 25,
              reasoning: 'Manter comunicação em dia.',
            },
            {
              content: 'Planejar o dia seguinte',
              priority: 'low' as TaskPriority,
              scheduledTime: 'Noite' as TaskTimeOfDay,
              estimatedMinutes: 15,
              reasoning: 'Fechar o dia com clareza.',
            },
          ],
          motivationalNote: 'Cada dia é uma nova oportunidade. Você está no caminho certo!',
        };
      }

      return validatedOutput.data;
    } catch (parsingError) {
      console.error('Failed to parse or validate AI response:', parsingError);
      throw new Error('A IA retornou uma resposta em formato inesperado. Tente novamente.');
    }
  } catch (error: any) {
    console.error('Error communicating with OpenAI API:', error);
    throw new Error(`Erro ao se comunicar com o Mentor IA: ${error.message}`);
  }
}
