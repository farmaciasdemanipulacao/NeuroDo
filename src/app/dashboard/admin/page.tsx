'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';

export default function DashboardAdminPage() {
  const { user, isUserLoading, isAdmin } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <ShieldCheck className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center">
        <Lock className="h-10 w-10 text-destructive" />
        <h1 className="text-3xl font-bold">Acesso Negado</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Esta área é reservada para administradores. Se você acha que deveria ter acesso, entre em contato com o responsável pelo sistema.
        </p>
        <Link href="/dashboard">
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Painel
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
          <ShieldCheck className="h-4 w-4" /> Painel Administrativo
        </div>
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="max-w-2xl text-muted-foreground">
          Visualize e gerencie recursos exclusivos para administradores do NeuroDo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Monitoramento</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe logs, uso, e desempenho do sistema em um único lugar.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Configurações</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajuste permissões e parâmetros administrativos para os usuários.
          </p>
        </div>
      </div>
    </div>
  );
}
