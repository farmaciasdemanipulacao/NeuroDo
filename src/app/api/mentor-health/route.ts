import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { classifyOpenAIError, withOpenAITimeout } from '@/ai/openai-errors';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'gustavobragacamargo@gmail.com';

async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;

  const idToken = authorization.slice('Bearer '.length).trim();
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!idToken || !firebaseApiKey) return false;

  try {
    const authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      }
    );

    if (!authResponse.ok) return false;

    const authData = await authResponse.json();
    const account = authData?.users?.[0];
    if (!account?.localId) return false;

    if (account.email === ADMIN_EMAIL && account.emailVerified === true) {
      return true;
    }

    if (!projectId) return false;

    const userDocResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${account.localId}`,
      {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: 'no-store',
      }
    );

    if (!userDocResponse.ok) return false;

    const userDoc = await userDocResponse.json();
    return userDoc?.fields?.role?.stringValue === 'admin';
  } catch {
    console.warn('[MentorHealth] Não foi possível validar a sessão administrativa.');
    return false;
  }
}

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
      { ok: false, status: 'not_configured', errorCode: 'MISSING_API_KEY', error: 'A API de IA não está configurada.', model },
      { status: 503 }
    );
  }

  try {
    const openai = new OpenAI({ apiKey });
    await withOpenAITimeout(
      (signal) => openai.chat.completions.create(
        { model, messages: [{ role: 'user', content: 'OK' }], temperature: 0, max_tokens: 1 },
        { signal }
      ),
      15_000
    );

    return NextResponse.json({ ok: true, status: 'available', model, message: 'IA configurada e com geração disponível.' });
  } catch (error: unknown) {
    const classified = classifyOpenAIError(error);
    const status =
      classified.errorCode === 'NO_CREDITS' ? 'no_credits' :
      classified.errorCode === 'INVALID_API_KEY' ? 'invalid_key' :
      classified.errorCode === 'RATE_LIMIT' ? 'rate_limited' :
      classified.errorCode === 'TIMEOUT' ? 'timeout' : 'unavailable';

    console.error(`[MentorHealth] IA indisponível. Código: ${classified.errorCode}. Status HTTP OpenAI: ${classified.status ?? 'n/a'}.`);

    return NextResponse.json(
      { ok: false, status, errorCode: classified.errorCode, error: classified.error, model },
      { status: classified.errorCode === 'RATE_LIMIT' ? 429 : 503 }
    );
  }
}
