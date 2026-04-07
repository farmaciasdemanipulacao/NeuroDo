'use server';

/**
 * @fileOverview Analisa padrões de energia e produtividade do usuário nos últimos 30 dias.
 * Identifica correlações, tendências e entrega insights personalizados para o perfil TDAH.
 */

import OpenAI from 'openai';
import { z } from 'zod';

// ── OpenAI Client ─────────────────────────────────────────────────────────────

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEURODO_MODEL ?? 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
} else {
  openai = new OpenAI({ apiKey });
}

// ── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o MentorDO, um coach executivo especializado em produtividade para pessoas neurodivergentes.

CONTEXTO DO USUÁRIO:
- Diagnóstico: TDAH com Desatenção, Gerenciamento de Tempo e Autorregulação em percentil 99 (Significância Clínica Grave)
- Perfil Sólides: Alto Comunicador — assertivo, iniciativo, orientado a ação, senso de urgência, precisa de feedback visual e reconhecimento imediato
- Picos naturais de energia: Manhã (9h-12h) e Tarde (16h-18h)
- Objetivo central: atingir R$30.000/mês líquido PF até dezembro de 2026 gerenciando 5 projetos simultâneos

REGRAS DA ANÁLISE:
1. Identifique padrões REAIS nos dados fornecidos — não generalize com conteúdo genérico
2. Foque no que é ACIONÁVEL: sugestões específicas que podem ser implementadas amanhã
3. Tom: encorajador mas direto — como um coach que acredita no usuário e entende o TDAH
4. Reconheça conquistas antes de apontar melhorias
5. Conecte insights ao objetivo financeiro (R$30k/mês) quando relevante
6. Use linguagem energética e clara em português (pt-BR)
7. Cada insight deve ter título conciso + descrição de 1-2 frases + sugestão acionável concreta

Seu output DEVE ser um objeto JSON válido seguindo o schema especificado, sem texto adicional.`;

// ── Input Schema ──────────────────────────────────────────────────────────────

const EnergyHistoryItemSchema = z.object({
  date: z.string().describe('Data no formato YYYY-MM-DD'),
  energyLevel: z.number().min(0).max(10).describe('Nível de energia de 0 a 10'),
  tasksCompleted: z.number().min(0).describe('Tarefas concluídas no dia'),
  tasksTotal: z.number().min(0).describe('Total de tarefas planejadas no dia'),
  dayOfWeek: z.number().min(0).max(6).describe('Dia da semana: 0=Domingo, 6=Sábado'),
});

const AnalyzeEnergyPatternsInputSchema = z.object({
  energyHistory: z
    .array(EnergyHistoryItemSchema)
    .min(1)
    .describe('Histórico de energia e produtividade'),
  stats: z.object({
    avgEnergy: z.number().describe('Energia média dos últimos 30 dias'),
    avgCompletion: z.number().describe('Taxa média de conclusão de tarefas (%)'),
    bestDayOfWeek: z.string().describe('Dia da semana com maior energia média'),
    worstDayOfWeek: z.string().describe('Dia da semana com menor energia média'),
    energyTrend: z.string().describe('Tendência: up, down ou stable'),
    streak: z.number().describe('Dias consecutivos com energia >= 5'),
  }),
  userName: z.string().optional().describe('Nome do usuário para personalização'),
});

export type AnalyzeEnergyPatternsInput = z.infer<typeof AnalyzeEnergyPatternsInputSchema>;

// ── Output Schema ─────────────────────────────────────────────────────────────

const InsightSchema = z.object({
  title: z.string().describe('Título conciso do insight (máx. 5 palavras)'),
  description: z.string().describe('Descrição explicativa em 1-2 frases'),
  type: z
    .enum(['positive', 'warning', 'neutral'])
    .describe('Tipo: positive=conquista, warning=atenção, neutral=informativo'),
  actionable: z.string().describe('Sugestão prática e específica para implementar'),
});

const AnalyzeEnergyPatternsOutputSchema = z.object({
  overallPattern: z
    .string()
    .describe('Análise geral dos padrões em 2-3 frases, baseada nos dados reais'),
  insights: z
    .array(InsightSchema)
    .min(3)
    .max(5)
    .describe('De 3 a 5 insights específicos sobre os dados'),
  weekdayAnalysis: z
    .string()
    .describe('Análise do padrão de energia por dia da semana'),
  energyProductivityCorrelation: z
    .string()
    .describe('Como a energia afeta a produtividade neste caso específico'),
  recommendation: z
    .string()
    .describe('1 recomendação principal acionável baseada nos dados'),
  motivationalNote: z
    .string()
    .describe('Nota motivacional personalizada para o perfil TDAH de alta performance'),
});

export type AnalyzeEnergyPatternsOutput = z.infer<typeof AnalyzeEnergyPatternsOutputSchema>;

export type AnalyzeEnergyPatternsResult =
  | ({ error?: never } & AnalyzeEnergyPatternsOutput)
  | { error: string; errorCode: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

const DOW_PT: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

// ── Main Function ─────────────────────────────────────────────────────────────

export async function analyzeEnergyPatterns(
  input: AnalyzeEnergyPatternsInput
): Promise<AnalyzeEnergyPatternsResult> {
  if (!openai || initError) {
    return { error: `Erro de configuração do servidor: ${initError}`, errorCode: 'CONFIG_ERROR' };
  }

  const validated = AnalyzeEnergyPatternsInputSchema.safeParse(input);
  if (!validated.success) {
    return { error: `Input inválido: ${validated.error.message}`, errorCode: 'VALIDATION_ERROR' };
  }

  const { energyHistory, stats, userName } = validated.data;
  const name = userName || 'você';

  const trendLabel =
    stats.energyTrend === 'up'
      ? 'subindo ↑'
      : stats.energyTrend === 'down'
      ? 'caindo ↓'
      : 'estável →';

  const historyLines = energyHistory
    .map(
      (d) =>
        `  ${d.date} (${DOW_PT[d.dayOfWeek] ?? d.dayOfWeek}): energia ${d.energyLevel}/10, tarefas ${d.tasksCompleted}/${d.tasksTotal}`
    )
    .join('\n');

  const userPrompt = `Analise os dados de energia e produtividade de ${name} e forneça insights personalizados.

ESTATÍSTICAS GERAIS (últimos ${energyHistory.length} registros):
- Energia média: ${stats.avgEnergy}/10
- Taxa de conclusão média de tarefas: ${stats.avgCompletion}%
- Melhor dia da semana: ${stats.bestDayOfWeek}
- Pior dia da semana: ${stats.worstDayOfWeek}
- Tendência de energia: ${trendLabel}
- Sequência atual (energia ≥ 5): ${stats.streak} dias

HISTÓRICO DETALHADO:
${historyLines}

Retorne APENAS o objeto JSON com os campos: overallPattern, insights (3-5 itens com title, description, type, actionable), weekdayAnalysis, energyProductivityCorrelation, recommendation, motivationalNote.`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      return { error: 'A IA não retornou conteúdo.', errorCode: 'EMPTY_RESPONSE' };
    }

    const parsed = JSON.parse(rawOutput);
    const validatedOutput = AnalyzeEnergyPatternsOutputSchema.safeParse(parsed);

    if (!validatedOutput.success) {
      console.error('Validação do output falhou:', validatedOutput.error);
      return { error: 'A IA retornou um formato inesperado. Tente novamente.', errorCode: 'INVALID_OUTPUT' };
    }

    return validatedOutput.data;
  } catch (error: unknown) {
    console.error('Erro ao comunicar com OpenAI:', error);
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Erro ao analisar padrões de energia: ${message}`, errorCode: 'OPENAI_ERROR' };
  }
}
