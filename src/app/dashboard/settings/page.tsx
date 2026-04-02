'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { ArrowLeft, Settings as SettingsIcon, Save, Loader2, Zap, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { usePreferences } from '@/hooks/use-preferences';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/hooks/use-app';
import { Badge } from '@/components/ui/badge';

export default function DashboardSettingsPage() {
  const { user, isUserLoading, appUser } = useUser();
  const router = useRouter();
  const { data: preferences, isLoading: arePrefsLoading, updatePreferences } = usePreferences();
  const { energyLevel, setEnergyLevel } = useApp();
  const { toast } = useToast();

  const [defaultEnergy, setDefaultEnergy] = useState<number>(5);
  const [isSaving, setIsSaving] = useState(false);

  // Sync form state when preferences load
  useEffect(() => {
    if (preferences?.energyLevel != null) {
      setDefaultEnergy(preferences.energyLevel);
    }
  }, [preferences]);

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

  const handleSaveEnergyDefault = () => {
    setIsSaving(true);
    updatePreferences({ energyLevel: defaultEnergy });
    setEnergyLevel(defaultEnergy);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: 'Preferências salvas!',
        description: 'Seu nível de energia padrão foi atualizado.',
      });
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm text-secondary w-fit">
          <SettingsIcon className="h-4 w-4" /> Configurações do Dashboard
        </div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="max-w-2xl text-muted-foreground">
          Ajuste preferências e personalize sua experiência no painel NeuroDo.
        </p>
      </div>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil da Conta
          </CardTitle>
          <CardDescription>Informações da sua conta NeuroDo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <Label className="text-muted-foreground text-xs">Nome</Label>
            <p className="font-medium">{appUser?.displayName ?? user.displayName ?? '—'}</p>
          </div>
          <div className="grid gap-1">
            <Label className="text-muted-foreground text-xs">E-mail</Label>
            <p className="font-medium">{appUser?.email ?? user.email ?? '—'}</p>
          </div>
          <div className="grid gap-1">
            <Label className="text-muted-foreground text-xs">Perfil</Label>
            <div>
              <Badge variant="outline">{appUser?.role ?? 'user'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Energia padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Energia Padrão
          </CardTitle>
          <CardDescription>
            Defina seu nível de energia padrão ao iniciar o dia. Isso também ajusta o modo de trabalho do timer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {arePrefsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Carregando preferências...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label>Nível de energia padrão</Label>
                <span className="text-2xl font-bold text-primary">{defaultEnergy}</span>
              </div>
              <Slider
                value={[defaultEnergy]}
                onValueChange={v => setDefaultEnergy(v[0])}
                min={0}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Baixa (Sprint 15min)</span>
                <span>Média (Pomodoro 25min)</span>
                <span>Alta (Foco 50min)</span>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Energia atual nesta sessão:{' '}
                  <span className="font-medium text-foreground">
                    {energyLevel != null ? energyLevel : 'não definida'}
                  </span>
                </p>
                <Button onClick={handleSaveEnergyDefault} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Preferência
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Link href="/dashboard">
        <Button variant="secondary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Painel
        </Button>
      </Link>
    </div>
  );
}
