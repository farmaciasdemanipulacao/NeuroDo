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

const InputSchema = z.object({
  energyLevel: z.number().min(0).max(10),
  tasksCompleted: z.number(),
  tasksTotal: z.number(),
  tasksSummary: z.array(z.object({
    content: z.string(),
    completed: z.boolean(),
  })),
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

export type GenerateNightlyReviewResult =
  | { ok: true; data: GenerateNightlyReviewOutput }
  | { ok: false; error: string; errorCode: string };

// --- Main Function ---

export async function generateNightlyReview(
  input: GenerateNightlyReviewInput
): Promise<GenerateNightlyReviewResult> {
  const requestId = `nightly-${Date.now()}`;
  console.log(`[NightlyReview:${requestId}] Iniciando. OpenAI pronto: ${!!openai}`);

  if (!openai || initError) {
    const msg = initError || 'OpenAI não inicializado por motivo desconhecido.';
    console.error(`[NightlyReview:${requestId}] Erro de configuração:`, msg);
    return { ok: false, error: `Configuração do servidor: ${msg}`, errorCode: 'INIT_ERROR' };
  }

  const validated = InputSchema.safeParse(input);
  if (!validated.success) {
    console.warn(`[NightlyReview:${requestId}] Entrada inválida:`, validated.error.message);
    return { ok: false, error: 'Dados da revisão inválidos.', errorCode: 'VALIDATION_ERROR' };
  }

  const { energyLevel, tasksCompleted, tasksTotal, tasksSummary, date, hasTasks } = validated.data;

  let userPrompt: string;

  if (!hasTasks) {
    userPrompt = `
Hoje é ${date}. Gustavo não cadastrou tarefas para hoje.
Nível de energia ATUAL dele: ${energyLevel}/10.

Como não há tarefas do dia para analisar, faça o seguinte:
1. dayAnalysis: Uma análise empática reconhecendo que hoje foi um dia sem estrutura de tarefas, normalizando isso (TDAH traz dias assim).
2. energyPattern: Observação sobre o nível de energia ${energyLevel} e o que isso significa para amanhã.
3. suggestedTasks: Sugira EXATAMENTE 3 tarefas para AMANHÃ, adequadas para energia ${energyLevel}, focadas nos 5 projetos ativos. Cada tarefa deve ter: content, priority (high/medium/low), scheduledTime (Manhã/Tarde/Noite), estimatedMinutes (máx 50), reasoning.
4. motivationalNote: 1 frase motivacional curta e empática.

Responda APENAS com JSON válido com os campos: dayAnalysis, energyPattern, suggestedTasks, motivationalNote.`;
  } else {
    const completedTasks = tasksSummary.filter(t => t.completed).map(t => t.content);
    const pendingTasks = tasksSummary.filter(t => !t.completed).map(t => t.content);
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    console.log(`[NightlyReview:${requestId}] Chamando OpenAI.`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1200,
    });

    clearTimeout(timeoutId);

    const rawOutput = response.choices[0]?.message?.content?.trim();
    if (!rawOutput) {
      console.warn(`[NightlyReview:${requestId}] OpenAI retornou conteúdo vazio.`);
      return { ok: false, error: 'A IA não gerou uma revisão. Tente novamente.', errorCode: 'EMPTY_RESPONSE' };
    }

    // Tentativas robustas de parsing
    let parsed: any = null;
    const parseErrors: string[] = [];

    // 1) JSON direto
    try {
      parsed = JSON.parse(rawOutput);
    } catch (err) {
      parseErrors.push(`direct-json: ${(err as Error).message}`);
    }

    // 2) Extrair bloco JSON entre chaves
    if (!parsed) {
      const jsonBlockMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (jsonBlockMatch) {
        try {
          parsed = JSON.parse(jsonBlockMatch[0]);
        } catch (err) {
          parseErrors.push(`block-json: ${(err as Error).message}`);
        }
      }
    }

    // 3) Heurística: procurar por linhas numeradas com tarefas
    if (!parsed) {
      try {
        const lines = rawOutput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const taskLines = lines.filter(l => /^\d+\.|^-\s|^•\s/.test(l));
        if (taskLines.length > 0) {
          const suggestedTasks: any[] = taskLines.slice(0, 3).map((l) => {
            const text = l.replace(/^\d+\.|^-\s|^•\s/, '').trim();
            const scheduledMatch = text.match(/(Manhã|Tarde|Noite)/i);
            const minutesMatch = text.match(/(\d+)\s?min/);
            const priority = /alta|prioridade alta|alta prioridade|importante/i.test(text)
              ? 'high'
              : /baixa|prioridade baixa/i.test(text)
              ? 'low'
              : 'medium';
            return {
              content: text,
              priority,
              scheduledTime: scheduledMatch ? (scheduledMatch[1].charAt(0).toUpperCase() + scheduledMatch[1].slice(1).toLowerCase()) : 'Tarde',
              estimatedMinutes: minutesMatch ? parseInt(minutesMatch[1], 10) : 25,
              reasoning: '',
            };
          });

          parsed = {
            dayAnalysis: lines.slice(0, 3).join(' '),
            energyPattern: '',
            suggestedTasks,
            motivationalNote: lines.slice(-1)[0] || '',
          };
        }
      } catch (err) {
        parseErrors.push(`heuristic: ${(err as Error).message}`);
      }
    }

    // 4) Normalizar nomes alternativos de chaves
    if (parsed) {
      if (!parsed.suggestedTasks && parsed.suggestions) parsed.suggestedTasks = parsed.suggestions;
      if (!parsed.suggestedTasks && parsed.tasks) parsed.suggestedTasks = parsed.tasks;
      if (!parsed.dayAnalysis && parsed.analysis) parsed.dayAnalysis = parsed.analysis;
      if (!parsed.motivationalNote && parsed.note) parsed.motivationalNote = parsed.note;

      if (typeof parsed.suggestedTasks === 'string') {
        try {
          parsed.suggestedTasks = JSON.parse(parsed.suggestedTasks);
        } catch (err) {
          parseErrors.push(`string-suggestedTasks-parse: ${(err as Error).message}`);
        }
      }

      if (Array.isArray(parsed.suggestedTasks)) {
        parsed.suggestedTasks = parsed.suggestedTasks.slice(0, 3).map((t: any) => ({
          content: t.content || t.title || String(t).slice(0, 200),
          priority: (t.priority === 'high' || /alto|alta/i.test(t.priority || '')) ? 'high' : (t.priority === 'low' || /baixa|baixo/i.test(t.priority || '')) ? 'low' : 'medium',
          scheduledTime: t.scheduledTime || t.when || 'Tarde',
          estimatedMinutes: Number(t.estimatedMinutes || t.estimated_time || t.minutes) || 25,
          reasoning: t.reasoning || t.why || '',
        }));
      }
    }

    // Validar resultado
    const validatedOutput = OutputSchema.safeParse(parsed || {});
    if (!validatedOutput.success) {
      console.error(`[NightlyReview:${requestId}] Validação falhou:`, validatedOutput.error.flatten());
      console.error(`[NightlyReview:${requestId}] Raw output:`, rawOutput);
      console.error(`[NightlyReview:${requestId}] Parse attempts:`, parseErrors);
      return { ok: false, error: 'A resposta da IA não seguiu o formato esperado. Tente novamente.', errorCode: 'INVALID_FORMAT' };
    }

    console.log(`[NightlyReview:${requestId}] Sucesso.`);
    return { ok: true, data: validatedOutput.data };

  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      console.error(`[NightlyReview:${requestId}] Timeout (30s).`);
      return { ok: false, error: 'A revisão demorou demais. Tente novamente.', errorCode: 'TIMEOUT' };
    }

    const status = error?.status ?? error?.response?.status;
    console.error(`[NightlyReview:${requestId}] Erro OpenAI. Status: ${status}. Mensagem: ${error?.message}`);

    if (status === 401) {
      return { ok: false, error: 'OPENAI_API_KEY inválida ou expirada.', errorCode: 'INVALID_API_KEY' };
    }
    if (status === 429) {
      return { ok: false, error: 'Limite de requisições OpenAI atingido. Aguarde um momento.', errorCode: 'RATE_LIMIT' };
    }
    if (status === 500 || status === 503) {
      return { ok: false, error: 'Servidores da OpenAI indisponíveis. Tente em alguns instantes.', errorCode: 'OPENAI_SERVER_ERROR' };
    }

    return {
      ok: false,
      error: `Erro ao gerar revisão (${error?.message ?? 'desconhecido'}). Verifique os logs.`,
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}
