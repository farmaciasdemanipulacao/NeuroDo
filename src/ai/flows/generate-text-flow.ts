'use server';

/**
 * @fileOverview A generic OpenAI flow for text generation based on a prompt.
 * This file uses the OpenAI API directly for simplicity and to consolidate API key usage.
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
} else {
  openai = new OpenAI({ apiKey });
}

// --- Input/Output Schemas ---
const GenerateTextInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate text from.'),
});
export type GenerateTextInput = z.infer<typeof GenerateTextInputSchema>;

const GenerateTextOutputSchema = z.object({
  text: z.string().describe('The generated text.'),
});
export type GenerateTextOutput = z.infer<typeof GenerateTextOutputSchema>;
export type GenerateTextResult =
  | { text: string; error?: never; errorCode?: never }
  | { text?: never; error: string; errorCode: string };


/**
 * A simple server action that generates text based on a given prompt using OpenAI.
 */
export async function generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
  if (!openai || initError) {
    console.error("OpenAI Init Error:", initError);
    return { error: 'A IA não está configurada corretamente no servidor.', errorCode: 'INIT_ERROR' };
  }

  const validatedInput = GenerateTextInputSchema.safeParse(input);
  if (!validatedInput.success) {
    return { error: 'O texto enviado para a IA é inválido.', errorCode: 'VALIDATION_ERROR' };
  }
  
  try {
    const response = await withOpenAITimeout((signal) => openai!.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Respond clearly and concisely.' },
        { role: 'user', content: validatedInput.data.prompt }
      ],
      temperature: 0.7,
      max_tokens: 150,
    }, { signal }));

    const text = response.choices[0]?.message?.content;
    if (!text) {
      return { error: 'A IA não retornou conteúdo.', errorCode: 'EMPTY_RESPONSE' };
    }
    
    return { text };

  } catch (error: any) {
    const classified = classifyOpenAIError(error);
    console.error('[GenerateText] Erro OpenAI classificado:', { errorCode: classified.errorCode, status: classified.status });
    return { error: classified.error, errorCode: classified.errorCode };
  }
}
