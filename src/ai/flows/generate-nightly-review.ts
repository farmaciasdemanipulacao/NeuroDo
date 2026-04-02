'use server';

import OpenAI from 'openai';
import { z } from 'zod';

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

const SYSTEM_PROMPT = `Você é o "Mentor IA NeuroDO", um mentor pessoal para Gustavo, um CEO neurodivergente (TDAH). 

CONTEXTO: OS 5 PROJETOS ATIVOS: ENVOX (agência), FARMÁCIAS DE MANIPULAÇÃO (SaaS), GERAÇÃO PJ (podcast), FELIZMENTE (congelado), INFLUENCERS.

META: R$30.000/mês líquido até 1º de dezembro de 2026.

REGRAS OBRIGATÓRIAS:
1. LINGUAGEM EMPÁTICA: nunca use "falha" — use "ajuste de rota".
2. ADAPTE À ENERGIA: sugestões devem respeitar o nível de energia informado.
3. FOCO: máximo 3 tarefas sugeridas, cada uma com no máximo 50 min.
4. SEJA DIRETO: análise objetiva, sem floreios excessivos.
5. PROTOCOLO DE ENERGIA:
   - 7-10: tarefas de alto impacto (vendas, estratégia, criatividade)
   - 4-6: tarefas operacionais (emails, revisões, organização)
   - 1-3: tarefas leves (leitura, organização simples)
   - 0: "Hoje é dia de manutenção. Descanse."

Seu output DEVE ser um objeto JSON válido e nada mais.`;

// --- Input/Output Schemas ---

// tasksSummary items: content must be a string. The calling component is responsible
// for mapping legacy "title" fields to "content" via getTaskLabel() before calling this.
const TaskSummaryItemSchema = z.object({
  content: z.string(),
  completed: z.boolean(),
});

const InputSchema = z.object({
  energyLevel: z.number().min(0).max(10),
  tasksCompleted: z.number(),
  tasksTotal: z.number(),
  tasksSummary: z.array(TaskSummaryItemSchema),
  date: z.string(),
  hasTasks: z.boolean(),
});

export type GenerateNightlyReviewInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  dayAnalysis: z.string(),
  energyPattern: z.string(),
  suggestedTasks: z.array(z.object({
    content: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    scheduledTime: z.enum(['Manhã', 'Tarde', 'Noite']),
    estimatedMinutes: z.number(),
    reasoning: z.string(),
  })),
  motivationalNote: z.string(),
});

export type GenerateNightlyReviewOutput = z.infer<typeof OutputSchema>;

// --- Main Function ---

export async function generateNightlyReview(
  input: GenerateNightlyReviewInput
): Promise<GenerateNightlyReviewOutput> {
  if (!openai || initError) {
    console.error('[generate-nightly-review] OpenAI não inicializado:', initError);
    throw new Error(`Erro de configuração do servidor: ${initError}`);
  }

  const validated = InputSchema.safeParse(input);
  if (!validated.success) {
    console.error('[generate-nightly-review] Dados de entrada inválidos:', JSON.stringify(validated.error.issues));
    throw new Error(`Dados de entrada inválidos: ${JSON.stringify(validated.error.issues)}`);
  }

  const { energyLevel, tasksCompleted, tasksTotal, tasksSummary, date, hasTasks } = validated.data;

  // Filter out tasks without a meaningful content label so the prompt is clean
  const tasksSummaryWithContent = tasksSummary.filter((t) => t.content.trim().length > 0);

  let userPrompt: string;

  if (!hasTasks || tasksSummaryWithContent.length === 0) {
    userPrompt = `
Hoje é ${date}. Gustavo não cadastrou tarefas para hoje (ou as tarefas existentes não possuem descrição).
Nível de energia ATUAL dele: ${energyLevel}/10.

Como não há tarefas do dia para analisar, faça o seguinte:
1. dayAnalysis: Uma análise empática reconhecendo que hoje foi um dia sem estrutura de tarefas, normalizando isso (TDAH traz dias assim).
2. energyPattern: Observação sobre o nível de energia ${energyLevel} e o que isso significa para amanhã.
3. suggestedTasks: Sugira EXATAMENTE 3 tarefas para AMANHÃ, adequadas para energia ${energyLevel}, focadas nos 5 projetos ativos. Cada tarefa deve ter: content, priority (high/medium/low), scheduledTime (Manhã/Tarde/Noite), estimatedMinutes (máx 50), reasoning.
4. motivationalNote: 1 frase motivacional curta e empática.

Responda APENAS com JSON válido com os campos: dayAnalysis, energyPattern, suggestedTasks, motivationalNote.`;
  } else {
    const completedTasks = tasksSummaryWithContent.filter(t => t.completed).map(t => t.content);
    const pendingTasks = tasksSummaryWithContent.filter(t => !t.completed).map(t => t.content);
    const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

    userPrompt = `
Hoje é ${date}. Analise o dia de Gustavo:
- Nível de energia: ${energyLevel}/10
- Tarefas concluídas: ${tasksCompleted} de ${tasksTotal} (${completionRate}%)
- Concluídas: ${completedTasks.length > 0 ? completedTasks.join(', ') : 'nenhuma'}
- Pendentes: ${pendingTasks.length > 0 ? pendingTasks.join(', ') : 'nenhuma'}

Gere:
1. dayAnalysis: Análise qualitativa do dia (${completionRate}% de conclusão). Se alto: reforço positivo. Se baixo: consciência sem culpa, ajuste de rota.
2. energyPattern: Observação sobre padrão de energia ${energyLevel} vs resultado do dia. O que isso sugere para amanhã?
3. suggestedTasks: EXATAMENTE 3 tarefas para AMANHÃ, adequadas para energia ${energyLevel}. Considere as pendentes de hoje e os 5 projetos. Campos: content, priority (high/medium/low), scheduledTime (Manhã/Tarde/Noite), estimatedMinutes (máx 50), reasoning.
4. motivationalNote: 1 frase motivacional curta e empática.

Responda APENAS com JSON válido com os campos: dayAnalysis, energyPattern, suggestedTasks, motivationalNote.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    const rawOutput = response.choices[0]?.message?.content?.trim();
    if (!rawOutput) {
      throw new Error('A API da OpenAI não retornou conteúdo.');
    }

    const parsed = JSON.parse(rawOutput);
    const validatedOutput = OutputSchema.safeParse(parsed);

    if (!validatedOutput.success) {
      console.error('[generate-nightly-review] Validação do output falhou:', JSON.stringify(validatedOutput.error.issues));
      return {
        dayAnalysis: 'O Mentor IA não conseguiu analisar o dia agora. Tente novamente.',
        energyPattern: 'Não foi possível analisar o padrão de energia.',
        suggestedTasks: [],
        motivationalNote: 'Amanhã é um novo começo. 💚',
      };
    }

    return validatedOutput.data;
  } catch (error: any) {
    console.error('[generate-nightly-review] Erro ao chamar OpenAI:', error?.message ?? error);
    throw new Error(`Erro ao gerar revisão noturna: ${error?.message ?? 'Tente novamente.'}`);
  }
}
