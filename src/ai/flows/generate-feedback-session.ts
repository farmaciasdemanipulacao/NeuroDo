'use server';

/**
 * @fileOverview Generates a personalized feedback session script.
 * This flow acts as an expert HR Director and communication coach, creating a script
 * tailored to the employee's behavioral profile using the SBI (Situation-Behavior-Impact) method.
 * It also saves the generated script to a history collection.
 */

import { z } from 'zod';
import { 
    GenerateFeedbackSessionInputSchema, 
    type GenerateFeedbackSessionInput, 
    GenerateFeedbackSessionOutputSchema, 
    type GenerateFeedbackSessionOutput 
} from '@/lib/types';
import { getAdminFirestore } from '@/firebase/admin-init';


import { openai, initError, model } from '@/ai/openai-client';

// --- System Prompt for Feedback Session Generation ---
const SYSTEM_PROMPT = `Você é uma Diretora de RH e coach de comunicação, especialista em liderança empática e comunicação não-violenta (CNV). Sua missão é criar um roteiro para uma sessão de feedback para Gustavo, um CEO com TDAH, conversar com um de seus colaboradores.

REGRAS DE OURO:
1.  **PERSONALIZE COM BASE NO PERFIL (OBRIGATÓRIO)**: Você DEVE usar o perfil comportamental fornecido para adaptar o tom.
    - Se o perfil é 'direto e orientado a dados', seja objetivo. Ex: "Vamos olhar os fatos..."
    - Se o perfil 'valoriza harmonia', comece reforçando a segurança. Ex: "Primeiro, quero dizer que esta conversa é sobre crescimento, e valorizo muito sua contribuição."
    - Se o perfil é 'criativo e precisa de autonomia', enquadre o feedback como um desafio. Ex: "Tenho um desafio pra você que vai exigir sua criatividade..."
2.  **USE A TÉCNICA SBI (Situação-Comportamento-Impacto)**: Estruture os pontos de elogio e desenvolvimento da seguinte forma:
    - **Situação**: "Na semana passada, durante a apresentação para o cliente X..."
    - **Comportamento**: "...notei que você usou os dados do relatório para construir uma narrativa clara..."
    - **Impacto**: "...e o impacto foi que o cliente se sentiu muito mais seguro para fechar o contrato."
3.  **FOCO NO FUTURO, NÃO NA CULPA**: O ponto de melhoria não é uma crítica. É um convite ao desenvolvimento, conectando-o a metas futuras. Use frases como "Como podemos, juntos, garantir que..." ou "Uma área que podemos desenvolver para você atingir a meta X é...".
4.  **ROTEIRO, NÃO RESUMO**: Sua saída devem ser frases sugeridas, um roteiro semi-pronto que o gestor possa adaptar, não uma lista de dicas.
5.  **OUTPUT ESTRITAMENTE JSON**: Sua resposta DEVE ser um objeto JSON válido, com os campos "opening", "praisePoints", "developmentPoints", "nextSteps", "closing", e nada mais.`;


// --- Main Function ---
export async function generateFeedbackSession(input: GenerateFeedbackSessionInput & { memberId: string, userId: string }): Promise<{ result?: GenerateFeedbackSessionOutput; error?: string; errorCode?: string }> {
  if (!openai || initError) {
    console.error('OpenAI Init Error:', initError);
    return { error: `Configuração do servidor: ${initError}`, errorCode: 'INIT_ERROR' };
  }

  const validatedInput = GenerateFeedbackSessionInputSchema.extend({
      memberId: z.string(),
      userId: z.string(),
  }).safeParse(input);

  if (!validatedInput.success) {
    throw new Error(`Invalid input: ${validatedInput.error.message}`);
  }

  const { collaboratorName, behavioralProfile, positivePoint, improvementPoint, relatedGoal, memberId, userId } = validatedInput.data;

  const userPrompt = `
    Gere um roteiro de feedback para Gustavo conversar com **${collaboratorName}**.

    **Contexto:**
    - **Perfil Comportamental de ${collaboratorName}:** "${behavioralProfile}"
    - **Ponto Positivo a ser Elogiado:** "${positivePoint}"
    - **Ponto de Melhoria:** "${improvementPoint}"
    - **Meta de Negócio Relacionada:** "${relatedGoal}"

    Lembre-se de seguir TODAS as regras do sistema, especialmente a personalização baseada no perfil e a estrutura SBI.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      console.error('OpenAI retornou conteúdo vazio');
      return { error: 'A API da OpenAI não retornou conteúdo.', errorCode: 'EMPTY_RESPONSE' };
    }

      const parsed = JSON.parse(rawOutput);
      const validationResult = GenerateFeedbackSessionOutputSchema.safeParse(parsed);
      if (!validationResult.success) {
        console.error('OpenAI output validation failed', validationResult.error.flatten());
        console.log('Raw AI Output that failed:', rawOutput);
        return { error: 'A resposta da IA não seguiu o formato JSON esperado.', errorCode: 'INVALID_FORMAT' };
      }

      const generatedScript = validationResult.data;

    // Save to history
    try {
        const firestore = getAdminFirestore();
        const historyRef = firestore.collection('feedback_sessions');
        await historyRef.add({
            userId,
            memberId,
            generatedAt: new Date().toISOString(),
            script: generatedScript,
        });
    } catch (dbError) {
        console.error("Failed to save feedback session to history:", dbError);
        // We don't re-throw here, as the primary function (generating the script) succeeded.
        // We just log the error.
    }
    
    return { result: generatedScript };

  } catch (error: any) {
    console.error('Erro ao gerar roteiro de feedback:', error);
    const status = error?.status ?? error?.response?.status;
    if (status === 401) return { error: 'OPENAI_API_KEY inválida ou expirada.', errorCode: 'INVALID_API_KEY' };
    if (status === 429) return { error: 'Limite de requisições atingido.', errorCode: 'RATE_LIMIT' };
    return { error: `Falha na geração do roteiro: ${error?.message ?? 'erro desconhecido'}`, errorCode: 'OPENAI_ERROR' };
  }
}
