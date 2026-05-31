'use server';

/**
 * @fileOverview Analyzes questionnaire responses to generate a detailed behavioral profile.
 * This flow acts as an expert in behavioral analysis, synthesizing concepts from DISC, MBTI, etc.
 * It is a "pure" function that receives text and returns a structured JSON object.
 */

import { z } from 'zod';
import { BehavioralProfileOutputSchema, type BehavioralProfileOutput } from '@/lib/types';
import { openai, initError, model } from '@/ai/openai-client';

// --- System Prompt for Behavioral Analysis ---
const SYSTEM_PROMPT = `Você é um Psicoanalista Organizacional e especialista em comportamento humano, com profundo conhecimento em DISC, MBTI, Eneagrama e Linguagens do Amor. Sua função é analisar as respostas de um questionário de um membro da equipe de Gustavo, um CEO com TDAH, e gerar um perfil acionável para ele.

OBJETIVO: Fornecer a Gustavo um "manual de instruções" claro e conciso sobre como se comunicar, delegar, motivar e dar feedback para esta pessoa, de uma maneira que maximize o potencial de ambos e minimize atritos.

REGRAS DE ANÁLISE:
1.  **SINTETIZE, NÃO APENAS REPITA**: Não diga "A pessoa respondeu X". Em vez disso, interprete o significado por trás da resposta. Ex: Se a pessoa diz "gosto de ter todos os detalhes antes de começar", sua análise deve ser "Precisa de clareza e contexto; evite dar tarefas vagas".
2.  **FOCO ACIONÁVEL PARA O CEO**: Todas as suas saídas devem ser conselhos práticos para Gustavo. Use a segunda pessoa (Ex: "Delegue a ela...", "Dê feedback para ele...").
3.  **LINGUAGEM DIRETA E CONCISA**: Evite jargões psicológicos. Use uma linguagem de negócios clara.
4.  **OUTPUT ESTRITAMENTE JSON**: Sua resposta DEVE ser um objeto JSON válido, seguindo o schema fornecido. Não adicione nenhum texto antes ou depois do JSON. O JSON deve ter EXATAMENTE os seguintes campos: "profileSummary", "howToDelegate", "howToGiveFeedback", "motivators", "recognitionSuggestions".`;

// --- Input/Output Schemas ---
const GenerateBehavioralProfileInputSchema = z.object({
  responses: z.string().describe('The concatenated Q&A from the interview.'),
});
export type GenerateBehavioralProfileInput = z.infer<typeof GenerateBehavioralProfileInputSchema>;

// --- Main Function ---
export async function generateBehavioralProfile(input: GenerateBehavioralProfileInput): Promise<{ result?: BehavioralProfileOutput; error?: string; errorCode?: string }> {
  if (!openai || initError) {
    console.error('OpenAI Init Error:', initError);
    return { error: `Configuração do servidor: ${initError}`, errorCode: 'INIT_ERROR' };
  }

  const validatedInput = GenerateBehavioralProfileInputSchema.safeParse(input);
  if (!validatedInput.success) {
    throw new Error(`Invalid input: ${validatedInput.error.message}`);
  }

  const { responses } = validatedInput.data;
  
  if (!responses || responses.trim() === "") {
    throw new Error("Nenhuma resposta encontrada para analisar.");
  }

  const userPrompt = `
    Aqui estão as respostas do membro da equipe:
    ---
    ${responses}
    ---
    Analise estas respostas e gere o perfil comportamental no formato JSON solicitado.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      console.error('OpenAI retornou conteúdo vazio');
      return { error: 'A API da OpenAI não retornou conteúdo.', errorCode: 'EMPTY_RESPONSE' };
    }

    try {
      const parsed = JSON.parse(rawOutput);
      const validationResult = BehavioralProfileOutputSchema.safeParse(parsed);
      if (!validationResult.success) {
        console.error('OpenAI output validation failed', validationResult.error.flatten());
        console.log('Raw AI Output that failed:', rawOutput);
        return { error: 'A resposta da IA não seguiu o formato esperado.', errorCode: 'INVALID_FORMAT' };
      }
      return { result: validationResult.data };
    } catch (err: any) {
      console.error('Falha ao parsear resposta da IA:', err);
      return { error: 'A resposta da IA não era um JSON válido.', errorCode: 'INVALID_JSON' };
    }

  } catch (error: any) {
    console.error('Erro ao gerar perfil comportamental:', error);
    const status = error?.status ?? error?.response?.status;
    if (status === 401) return { error: 'OPENAI_API_KEY inválida ou expirada.', errorCode: 'INVALID_API_KEY' };
    if (status === 429) return { error: 'Limite de requisições atingido.', errorCode: 'RATE_LIMIT' };
    return { error: `Falha na análise do perfil: ${error?.message ?? 'erro desconhecido'}`, errorCode: 'OPENAI_ERROR' };
  }
}
