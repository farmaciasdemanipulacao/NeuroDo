'use server';

/**
 * @fileOverview Analyzes questionnaire responses to generate a detailed behavioral profile.
 * This flow acts as an expert in behavioral analysis, synthesizing concepts from DISC, MBTI, etc.
 * It is a "pure" function that receives text and returns a structured JSON object.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { BehavioralProfileOutputSchema, type BehavioralProfileOutput } from '@/lib/types';

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
export async function generateBehavioralProfile(input: GenerateBehavioralProfileInput): Promise<BehavioralProfileOutput> {
  if (!openai || initError) {
    console.error("OpenAI Init Error:", initError);
    throw new Error(`Server Configuration Error: ${initError}`);
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
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      throw new Error("A API da OpenAI não retornou conteúdo.");
    }
    
    // Using safeParse for robust validation
    const validationResult = BehavioralProfileOutputSchema.safeParse(JSON.parse(rawOutput));
    
    if (!validationResult.success) {
        console.error("OpenAI output validation failed", validationResult.error.flatten());
        console.log("Raw AI Output that failed:", rawOutput);
        throw new Error("A resposta da IA não seguiu o formato esperado. A estrutura do JSON está incorreta.");
    }
    
    return validationResult.data;

  } catch (error: any) {
    console.error("Erro ao gerar perfil comportamental:", error);
    // Re-throw a more specific error based on the type of failure
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
       throw new Error(`Falha na análise do perfil: A resposta da IA não era um JSON válido ou não seguiu o schema: ${error.message}`);
    }
    throw new Error(`Falha na análise do perfil: ${error.message}`);
  }
}
