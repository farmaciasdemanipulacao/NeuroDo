'use client';

import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore } from '@/firebase';
import { useUserStats } from '@/hooks/use-user-stats';
import { usePreferences } from '@/hooks/use-preferences';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import type { Task, NightlyReview } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────

type CheckStatus = 'idle' | 'loading' | 'ok' | 'error';

interface Check {
  label: string;
  status: CheckStatus;
  detail?: string;
}

const StatusIcon = ({ status }: { status: CheckStatus }) => {
  if (status === 'loading') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === 'ok')      return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === 'error')   return <XCircle className="h-4 w-4 text-destructive" />;
  return <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />;
};

// ─────────────────────────────────────────────────────────────────────────────

export function FirestoreValidator() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { data: stats, isLoading: areStatsLoading } = useUserStats();
  const { preferences, isLoading: arePrefsLoading } = usePreferences();

  // Tarefas — limit(1) sem ordenação é suficiente para verificar acessibilidade da coleção
  const tasksQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'), limit(100));
  }, [user, firestore]);
  const { data: tasks, isLoading: areTasksLoading, error: tasksError } = useCollection<Task>(tasksQuery);

  // Revisões
  const reviewsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'reviews'),
      orderBy('date', 'desc'),
      limit(1),
    );
  }, [user, firestore]);
  const { data: reviews, isLoading: areReviewsLoading, error: reviewsError } = useCollection<NightlyReview>(reviewsQuery);

  // ── Teste de escrita/leitura ────────────────────────────────────────────────
  const [writeStatus, setWriteStatus] = useState<CheckStatus>('idle');
  const [writeDetail, setWriteDetail] = useState('');

  const runWriteTest = useCallback(async () => {
    if (!user || !firestore) return;
    setWriteStatus('loading');
    setWriteDetail('');
    try {
      // Usa /users/{uid}/_validation/test — coberto pelas Firestore Rules
      // que permitem `match /users/{userId}/{document=**}` para o próprio usuário.
      const ref = doc(firestore, 'users', user.uid, '_validation', 'test');
      const payload = { ok: true, ts: new Date().toISOString() };
      await setDoc(ref, payload);
      const snap = await getDoc(ref);
      if (!snap.exists() || !snap.data()?.ok) throw new Error('Leitura retornou dados inválidos');
      await deleteDoc(ref);
      setWriteStatus('ok');
      setWriteDetail('Gravou → leu → apagou com sucesso');
    } catch (err) {
      setWriteStatus('error');
      setWriteDetail(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }, [user, firestore]);

  // ── Estado de carregamento global ──────────────────────────────────────────
  const isAnyLoading = isUserLoading || areStatsLoading || arePrefsLoading || areTasksLoading || areReviewsLoading;

  // ── Checks ─────────────────────────────────────────────────────────────────
  const checks: Check[] = [
    {
      label: 'Autenticação Firebase',
      status: isUserLoading ? 'loading' : user ? 'ok' : 'error',
      detail: user ? `UID: ${user.uid.slice(0, 8)}…` : 'Usuário não autenticado',
    },
    {
      label: 'user_stats (XP, nível, streak)',
      status: areStatsLoading ? 'loading' : stats ? 'ok' : 'error',
      detail: stats
        ? `Nível ${stats.level} · ${stats.totalXP} XP · Streak ${stats.currentStreak} dias`
        : 'Documento não encontrado',
    },
    {
      label: 'Preferências',
      status: arePrefsLoading ? 'loading' : preferences ? 'ok' : 'error',
      detail: preferences
        ? `Tema: ${preferences.theme} · Timer: ${preferences.focusTimerDefault}`
        : 'Documento não encontrado',
    },
    {
      label: 'Coleção de Tarefas',
      status: areTasksLoading ? 'loading' : tasksError ? 'error' : 'ok',
      detail: tasksError
        ? `Erro: ${tasksError.message}`
        : `${tasks?.length ?? 0} tarefa(s) encontrada(s)`,
    },
    {
      label: 'Coleção de Revisões Noturnas',
      status: areReviewsLoading ? 'loading' : reviewsError ? 'error' : 'ok',
      detail: reviewsError
        ? `Erro: ${reviewsError.message}`
        : reviews && reviews.length > 0
          ? `Última revisão: ${reviews[0].date}`
          : 'Nenhuma revisão ainda (normal se nunca usou)',
    },
  ];

  const allOk = !isAnyLoading && checks.every(c => c.status === 'ok');
  const hasError = checks.some(c => c.status === 'error');

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Status geral */}
      <Card className={allOk ? 'border-primary/50' : hasError ? 'border-destructive/50' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            Diagnóstico Firestore
            {isAnyLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />}
            {allOk && <Badge variant="outline" className="ml-auto border-primary text-primary">✅ Tudo OK</Badge>}
            {hasError && <Badge variant="destructive" className="ml-auto">⚠️ Erros encontrados</Badge>}
          </CardTitle>
          <CardDescription>
            Verifica em tempo real se cada coleção do Firestore está acessível e populada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-3 py-1">
              <StatusIcon status={check.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{check.label}</p>
                {check.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{check.detail}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Teste de escrita */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {writeStatus === 'idle' && <WifiOff className="h-4 w-4 text-muted-foreground" />}
            {writeStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
            {writeStatus === 'ok' && <Wifi className="h-4 w-4 text-primary" />}
            {writeStatus === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
            Teste de Gravação
          </CardTitle>
          <CardDescription>
            Cria um documento de teste, lê de volta e apaga — confirma ciclo completo de leitura/escrita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {writeDetail && (
            <p
              className={`text-sm ${
                writeStatus === 'ok' ? 'text-primary' : 'text-destructive'
              }`}
            >
              {writeDetail}
            </p>
          )}
          <Button
            onClick={runWriteTest}
            disabled={!user || writeStatus === 'loading'}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-3 w-3 ${writeStatus === 'loading' ? 'animate-spin' : ''}`} />
            {writeStatus === 'idle' ? 'Testar Gravação' : 'Testar Novamente'}
          </Button>
        </CardContent>
      </Card>

      {/* Resumo orientativo */}
      <Card className="bg-muted/30">
        <CardContent className="pt-5 space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Como interpretar:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong className="text-foreground">Verde em tudo</strong> → migração 100% — dados persistem entre sessões e devices.</li>
            <li><strong className="text-foreground">Vermelho em user_stats/prefs</strong> → reload na página ou rode o seed novamente.</li>
            <li><strong className="text-foreground">Erro no Teste de Gravação</strong> → regra de segurança do Firestore bloqueando — verifique as Rules no Firebase Console.</li>
            <li><strong className="text-foreground">Revisões = 0</strong> → normal se ainda não fez nenhuma Revisão Noturna.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
