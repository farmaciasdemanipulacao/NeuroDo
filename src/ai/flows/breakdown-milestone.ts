'use server';

/**
 * @fileOverview Quebra um milestone em subtasks acionáveis usando OpenAI.
 * Retorna objeto { subtasks } em sucesso ou { error, errorCode } em falha.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { classifyOpenAIError, withOpenAITimeout } from '@/ai/openai-errors';

// --- OpenAI Client Configuration ---
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
let initError: string | null = null;

if (!apiKey) {
  initError = 'A variável de ambiente OPENAI_API_KEY não está definida.';
  console.error('[BreakdownMilestone] ERRO DE CONFIGURAÇÃO:', initError);
} else {
  try {
    openai = new OpenAI({ apiKey });
    console.log('[BreakdownMilestone] OpenAI inicializado com sucesso. Modelo:', model);
  } catch (error: any) {
    initError = `Falha ao inicializar OpenAI: ${error?.message}`;
    console.error('[BreakdownMilestone] ERRO DE INICIALIZAÇÃO:', initError);
  }
}

const BreakdownInputSchema = z.object({
  milestoneTitle: z.string(),
  milestoneDescription: z.string().optional(),
  dueDate: z.date(),
  projectId: z.string(),
});

const SubtaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  estimatedMinutes: z.number(),
  energyRequired: z.number(),
  suggestedWeek: z.number(),
});

export type SubtaskSuggestion = z.infer<typeof SubtaskSchema>;

export type BreakdownMilestoneOutput = 
  | { subtasks: SubtaskSuggestion[]; error?: never; errorCode?: never }
  | { subtasks?: never; error: string; errorCode: string };

export async function breakdownMilestone(input: z.infer<typeof BreakdownInputSchema>): Promise<BreakdownMilestoneOutput> {
  const requestId = `breakdown-${Date.now()}`;
  console.log(`[BreakdownMilestone:${requestId}] Iniciando. OpenAI pronto: ${!!openai}`);

  // Verifica se OpenAI está inicializado
  if (!openai || initError) {
    const msg = initError || 'OpenAI não inicializado por motivo desconhecido.';
    console.error(`[BreakdownMilestone:${requestId}] Erro de configuração:`, msg);
    return { error: `Configuração do servidor: ${msg}`, errorCode: 'INIT_ERROR' };
  }

  // Valida entrada
  const validated = BreakdownInputSchema.safeParse(input);
  if (!validated.success) {
    console.warn(`[BreakdownMilestone:${requestId}] Entrada inválida:`, validated.error.message);
    return { error: 'Dados do milestone inválidos.', errorCode: 'VALIDATION_ERROR' };
  }

  const { milestoneTitle, milestoneDescription, dueDate, projectId } = validated.data;
  
  const weeksUntilDeadline = Math.max(1, Math.ceil(
    (dueDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)
  ));
  
  const systemPrompt = `Você é um especialista em planejamento estratégico para empreendedores neurodivergentes.
Sua missão é quebrar marcos (milestones) em tasks ACIONÁVEIS e ESPECÍFICAS.

REGRAS:
1. Cada task deve ser CONCRETA (não abstrata)
2. Tempo máximo: 2h (120 min)
3. Energia: 1-10 (tasks de venda = 6-8, operacional = 4-6, criativo = 7-9)
4. Sugerir semana realista (distribuir bem o tempo)
5. Mínimo 3 tasks, máximo 10 tasks
6. Priorizar tasks de EXECUÇÃO (não planejamento excessivo)

Retorne JSON com uma chave "subtasks" contendo um array de objetos, cada um com: "title", "description", "estimatedMinutes", "energyRequired", "suggestedWeek".`;

  const userPrompt = `Milestone: "${milestoneTitle}"
Descrição: "${milestoneDescription || 'N/A'}"
Projeto: ${projectId}
Prazo: ${dueDate.toLocaleDateString('pt-BR')} (${weeksUntilDeadline} semanas a partir de hoje)

Quebre este milestone em tasks acionáveis.`;


  try {
    console.log(`[BreakdownMilestone:${requestId}] Chamando OpenAI com modelo ${model}.`);

    const response = await withOpenAITimeout((signal) => openai!.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }, { signal }));

    const content = response.choices[0]?.message?.content;
    if (!content || content.trim() === '') {
      console.warn(`[BreakdownMilestone:${requestId}] OpenAI retornou conteúdo vazio.`);
      return { error: 'A IA não gerou subtasks. Tente novamente.', errorCode: 'EMPTY_RESPONSE' };
    }
    
    console.log(`[BreakdownMilestone:${requestId}] Parseando JSON da resposta.`);
    const result = JSON.parse(content);
    
    // Valida estrutura de resposta
    if (!result.subtasks || !Array.isArray(result.subtasks)) {
      console.error(`[BreakdownMilestone:${requestId}] Formato JSON inválido: falta chave 'subtasks'.`);
      return { error: 'A IA retornou um formato JSON inválido.', errorCode: 'INVALID_FORMAT' };
    }
    
    console.log(`[BreakdownMilestone:${requestId}] Sucesso. Geradas ${result.subtasks.length} subtasks.`);
    return { subtasks: result.subtasks };

  } catch (error: any) {
    if (error instanceof SyntaxError) {
      console.error(`[BreakdownMilestone:${requestId}] Erro ao parsear JSON:`, error.message);
      return { error: 'A IA retornou um JSON inválido. Tente novamente.', errorCode: 'PARSE_ERROR' };
    }

    const classified = classifyOpenAIError(error);
    console.error(`[BreakdownMilestone:${requestId}] Erro OpenAI. Código: ${classified.errorCode}. Status: ${classified.status ?? 'n/a'}.`);
    return { error: classified.error, errorCode: classified.errorCode };
  }
}
