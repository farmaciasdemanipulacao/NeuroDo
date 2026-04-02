'use client';

import { useUser } from '@/firebase/provider';
import { usePreferences } from '@/hooks/use-preferences';
import { useUserStats } from '@/hooks/use-user-stats';
import { Settings as SettingsIcon, Bell, Palette, Timer, User, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Preference } from '@/lib/types';

export default function DashboardSettingsPage() {
  const { user, isUserLoading } = useUser();
  const { preferences, isLoading: arePrefsLoading, updatePreferences } = usePreferences();
  const { data: stats, isLoading: areStatsLoading } = useUserStats();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = isUserLoading || arePrefsLoading;

  async function handleToggle(key: keyof Omit<Preference, 'userId' | 'updatedAt' | 'energyLevel' | 'theme' | 'focusTimerDefault'>) {
    if (!preferences) return;
    setIsSaving(true);
    await updatePreferences({ [key]: !preferences[key] });
    setIsSaving(false);
    toast({ title: 'Preferência salva!' });
  }

  async function handleSelect(key: 'theme' | 'focusTimerDefault', value: string) {
    setIsSaving(true);
    await updatePreferences({ [key]: value as any });
    setIsSaving(false);
    toast({ title: 'Preferência salva!' });
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">Configurações</h1>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-muted-foreground">Personalize sua experiência no NeuroDO.</p>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">E-mail</span>
            <span className="font-medium">{user?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nível</span>
            <span className="font-medium">{areStatsLoading ? '...' : (stats?.level ?? 1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">XP Total</span>
            <span className="font-medium">{areStatsLoading ? '...' : (stats?.totalXP ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tarefas Concluídas</span>
            <span className="font-medium">{areStatsLoading ? '...' : (stats?.tasksCompleted ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Maior Sequência</span>
            <span className="font-medium">{areStatsLoading ? '...' : (stats?.longestStreak ?? 0)} dias</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Notificações
            </CardTitle>
            <CardDescription>Controle os lembretes e alertas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="notifs" className="text-sm">Ativar notificações</Label>
              <Switch
                id="notifs"
                checked={preferences?.notificationsEnabled ?? false}
                onCheckedChange={() => handleToggle('notificationsEnabled')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Timer padrão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4" /> Timer de Foco Padrão
            </CardTitle>
            <CardDescription>Modo padrão ao abrir o timer.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={preferences?.focusTimerDefault ?? 'pomodoro'}
              onValueChange={(v) => handleSelect('focusTimerDefault', v)}
              className="space-y-2"
            >
              {[
                { value: 'sprint', label: 'Sprint — 15 min' },
                { value: 'pomodoro', label: 'Pomodoro — 25 min' },
                { value: 'deep', label: 'Foco Profundo — 50 min' },
              ].map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`timer-${opt.value}`} />
                  <Label htmlFor={`timer-${opt.value}`} className="text-sm">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Tema */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" /> Tema Visual
            </CardTitle>
            <CardDescription>Escolha a aparência do painel.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={preferences?.theme ?? 'default'}
              onValueChange={(v) => handleSelect('theme', v)}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              {[
                { value: 'default', label: 'Padrão', desc: 'Verde + escuro' },
                { value: 'hyperfocus', label: 'Hiperfoco', desc: 'Azul intenso' },
                { value: 'creative', label: 'Criativo', desc: 'Âmbar + roxo' },
                { value: 'night', label: 'Noturno', desc: 'Mínimo escuro' },
              ].map(opt => (
                <Label
                  key={opt.value}
                  htmlFor={`theme-${opt.value}`}
                  className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                    (preferences?.theme ?? 'default') === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={`theme-${opt.value}`} className="sr-only" />
                  <span className="font-medium text-sm">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  {(preferences?.theme ?? 'default') === opt.value && (
                    <CheckCircle className="h-3 w-3 text-primary self-end" />
                  )}
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

