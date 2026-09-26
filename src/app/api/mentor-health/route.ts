import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin-init';
import { classifyOpenAIError, withOpenAITimeout } from '@/ai/openai-errors';

export const dynamic = 'force-dynamic';

async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return false;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const userDoc = await getAdminFirestore().collection('users').doc(decoded.uid).get();
    return userDoc.exists && userDoc.data()?.role === 'admin';
  } catch (error) {
    console.warn('[MentorHealth] Falha ao validar sessão administrativa.');
    return false;
  }
}

/**
 * Diagnóstico administrativo da IA do NeuroDO.
 * Faz uma geração mínima para distinguir chave configurada de saldo/quota indisponível.
 * Nunca retorna a chave ou qualquer fragmento dela.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json(
      { ok: false, status: 'unauthorized', error: 'Acesso não autorizado.' },
      { status: 403 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.NEURODO_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        status: 'not_configured',
        errorCode: 'MISSING_API_KEY',
        error: 'A API de IA não está configurada.',
        model,
      },
      { status: 503 }
    );
  }

  try {
    const openai = new OpenAI({ apiKey });

    await withOpenAITimeout(
      (signal) =>
        openai.chat.completions.create(
          {
            model,
            messages: [{ role: 'user', content: 'OK' }],
            temperature: 0,
            max_tokens: 1,
          },
          { signal }
        ),
      15_000
    );

    return NextResponse.json({
      ok: true,
      status: 'available',
      model,
      message: 'IA configurada e com geração disponível.',
    });
  } catch (error: unknown) {
    const classified = classifyOpenAIError(error);

    const status =
      classified.errorCode === 'NO_CREDITS'
        ? 'no_credits'
        : classified.errorCode === 'INVALID_API_KEY'
          ? 'invalid_key'
          : classified.errorCode === 'RATE_LIMIT'
            ? 'rate_limited'
            : classified.errorCode === 'TIMEOUT'
              ? 'timeout'
              : 'unavailable';

    const httpStatus = classified.errorCode === 'RATE_LIMIT' ? 429 : 503;

    console.error(
      `[MentorHealth] IA indisponível. Código: ${classified.errorCode}. Status HTTP OpenAI: ${classified.status ?? 'n/a'}.`
    );

    return NextResponse.json(
      {
        ok: false,
        status,
        errorCode: classified.errorCode,
        error: classified.error,
        model,
      },
      { status: httpStatus }
    );
  }
}
