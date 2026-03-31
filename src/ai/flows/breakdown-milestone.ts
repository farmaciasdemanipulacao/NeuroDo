'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export async function breakdownMilestone(input: z.infer<typeof BreakdownInputSchema>): Promise<{ subtasks: SubtaskSuggestion[] }> {
  const { milestoneTitle, milestoneDescription, dueDate, projectId } = input;
  
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("A IA não retornou conteúdo.");
  }
  
  const result = JSON.parse(content);
  // Basic validation
  if (!result.subtasks || !Array.isArray(result.subtasks)) {
    throw new Error("A IA retornou um formato de JSON inválido.");
  }
  
  return result;
}
