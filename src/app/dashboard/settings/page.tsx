'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardSettingsPage() {
  const { user, isUserLoading } = useUser();
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
          <SettingsIcon className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm text-secondary">
          <SettingsIcon className="h-4 w-4" /> Configurações do Dashboard
        </div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="max-w-2xl text-muted-foreground">
          Ajuste preferências e personalize sua experiência no painel NeuroDo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Preferências de conta</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aqui você poderá configurar notificações, idioma e outros hábitos de uso.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Personalização</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ative recursos, controle visibilidade e defina as suas opções de exibição.
          </p>
        </div>
      </div>

      <Link href="/dashboard">
        <Button variant="secondary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Painel
        </Button>
      </Link>
    </div>
  );
}
