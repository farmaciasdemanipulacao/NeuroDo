'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { ArrowLeft, Settings as SettingsIcon, User, Zap, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { usePreferences } from '@/hooks/use-preferences';
import { useApp } from '@/hooks/use-app';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { updateProfile } from 'firebase/auth';

export default function DashboardSettingsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { data: preferences, isLoading: isPrefsLoading, updatePreferences } = usePreferences();
  const { energyLevel, setEnergyLevel } = useApp();
  const firestore = useFirestore();

  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [energyValue, setEnergyValue] = useState<number[]>([5]);

  // Populate form when user/preferences load
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  useEffect(() => {
    if (preferences?.energyLevel != null) {
      setEnergyValue([preferences.energyLevel]);
    } else if (energyLevel != null) {
      setEnergyValue([energyLevel]);
    }
  }, [preferences, energyLevel]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      // Update Firebase Auth display name
      await updateProfile(user, { displayName });
      // Update user document in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, { displayName, updatedAt: new Date().toISOString() });
      toast({ title: 'Perfil atualizado!', description: 'Seu nome foi salvo com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveEnergy = () => {
    const level = energyValue[0];
    setEnergyLevel(level);
    updatePreferences({ energyLevel: level });
    toast({ title: 'Energia salva!', description: `Nível de energia definido como ${level}.` });
  };

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
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Ajuste preferências e personalize sua experiência no painel NeuroDo.
        </p>
      </div>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Perfil
          </CardTitle>
          <CardDescription>Informações exibidas no painel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome de exibição</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={user.email ?? ''} disabled className="text-muted-foreground" />
          </div>
          <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Preferências de Energia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" /> Nível de Energia Padrão
          </CardTitle>
          <CardDescription>
            Este valor será usado como ponto de partida no check-in diário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPrefsLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Baixa</span>
                <span className="text-lg font-bold text-accent">{energyValue[0]}</span>
                <span className="text-sm text-muted-foreground">Alta</span>
              </div>
              <Slider
                value={energyValue}
                onValueChange={setEnergyValue}
                min={0}
                max={10}
                step={1}
              />
              <Button onClick={handleSaveEnergy} variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Salvar Energia
              </Button>
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

