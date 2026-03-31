'use server';

/**
 * @fileOverview Classifies user-captured ideas and routes them to active projects or a '2027' bucket.
 * This implementation uses the OpenAI Chat Completions API directly with JSON mode.
 */

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

// --- System Prompt for Classification ---

const SYSTEM_PROMPT = `Você é o "Mentor IA NeuroDO", um sistema especialista em classificação de ideias para Gustavo, um CEO neurodivergente com TDAH. Sua única função é analisar uma ideia e decidir se ela é relevante para os projetos atuais ou se deve ser arquivada.

REGRAS DE CLASSIFICAÇÃO (FILTRO DE OBJETO BRILHANTE):
Você deve analisar a ideia e decidir se ela se alinha com os projetos atuais e metas de curto prazo.
Perguntas a se fazer:
1. "Isso resolve um problema de um dos projetos chave?"
2. "Isso gera receita até dezembro de 2026?"

Se a resposta for "não" para ambas, a ideia deve ser rotulada para o "balde de 2027" (routeTo2027: true).
Se a resposta for "sim" para pelo menos uma, a ideia é relevante. Você deve identificar o projeto mais relevante.

Seu output DEVE ser um objeto JSON válido, seguindo o schema fornecido, e nada mais.`;


// --- Input/Output Schemas ---

const ClassifyAndRouteIdeaInputSchema = z.object({
  idea: z.string().describe('The idea captured by the user.'),
  projects: z.array(z.string()).describe('List of active project names.'),
});

export type ClassifyAndRouteIdeaInput = z.infer<typeof ClassifyAndRouteIdeaInputSchema>;

const ClassifyAndRouteIdeaOutputSchema = z.object({
  routeTo2027: z.boolean().describe('Whether the idea should be routed to the 2027 bucket.'),
  relevantProject: z
    .string()
    .optional()
    .describe('The project that the idea is most relevant to, if any.'),
  reason: z.string().describe('Explanation of why the idea was routed in a specific way'),
});

export type ClassifyAndRouteIdeaOutput = z.infer<typeof ClassifyAndRouteIdeaOutputSchema>;


// --- Main Function ---

export async function classifyAndRouteIdea(
  input: ClassifyAndRouteIdeaInput
): Promise<ClassifyAndRouteIdeaOutput> {

  if (!openai || initError) {
    console.error("OpenAI Init Error:", initError);
    throw new Error(`Server Configuration Error: ${initError}`);
  }

  const validatedInput = ClassifyAndRouteIdeaInputSchema.safeParse(input);
  if (!validatedInput.success) {
    throw new Error(`Invalid input: ${validatedInput.error.message}`);
  }

  const { idea, projects } = validatedInput.data;

  const userPrompt = `
    A nova ideia do Gustavo é: "${idea}"
    Os projetos ativos são: ${projects.join(', ')}.

    Baseado nas regras do "FILTRO DE OBJETO BRILHANTE", analise esta ideia e forneça a justificativa para sua decisão.
    Responda APENAS com o objeto JSON com os campos "routeTo2027", "relevantProject", e "reason".
  `;

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      throw new Error("A API da OpenAI não retornou conteúdo.");
    }
    
    try {
        // Parse and validate the JSON output from the model
        const parsedOutput = JSON.parse(rawOutput);
        const validatedOutput = ClassifyAndRouteIdeaOutputSchema.safeParse(parsedOutput);

        if (!validatedOutput.success) {
            console.error("OpenAI output validation failed", validatedOutput.error);
            // Instead of throwing, return a safe fallback object.
            return {
                routeTo2027: true,
                reason: 'A IA não conseguiu classificar esta ideia automaticamente. Foi guardada para revisão manual.',
            };
        }
        return validatedOutput.data;

    } catch(parsingError) {
        console.error("Failed to parse or validate AI response:", parsingError);
        console.log("Raw AI Output that failed:", rawOutput);
         // Return a safe fallback if parsing fails.
        return {
            routeTo2027: true,
            reason: 'A IA retornou uma resposta em formato inesperado. A ideia foi guardada para revisão manual.',
        };
    }

  } catch (error: any) {
    console.error("Error communicating with OpenAI API:", error);
    // Let the component handle this error and show a toast
    throw new Error(`Ocorreu um erro ao se comunicar com o Mentor IA: ${error.message}`);
  }
}
