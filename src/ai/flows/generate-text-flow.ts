'use server';

/**
 * @fileOverview A generic OpenAI flow for text generation based on a prompt.
 * This file uses the OpenAI API directly for simplicity and to consolidate API key usage.
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

// --- Input/Output Schemas ---
const GenerateTextInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate text from.'),
});
export type GenerateTextInput = z.infer<typeof GenerateTextInputSchema>;

const GenerateTextOutputSchema = z.object({
  text: z.string().describe('The generated text.'),
});
export type GenerateTextOutput = z.infer<typeof GenerateTextOutputSchema>;


/**
 * A simple server action that generates text based on a given prompt using OpenAI.
 */
export async function generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
  if (!openai || initError) {
    console.error("OpenAI Init Error:", initError);
    throw new Error(`Server Configuration Error: ${initError}`);
  }

  const validatedInput = GenerateTextInputSchema.safeParse(input);
  if (!validatedInput.success) {
    throw new Error(`Invalid input: ${validatedInput.error.message}`);
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Respond clearly and concisely.' },
        { role: 'user', content: validatedInput.data.prompt }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("A API da OpenAI não retornou conteúdo.");
    }
    
    return { text };

  } catch (error: any) {
    console.error("Error communicating with OpenAI API:", error);
    throw new Error(`Ocorreu um erro ao se comunicar com a IA: ${error.message}`);
  }
}
