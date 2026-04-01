'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const defaultConfig = {
  defaultPrompt: '',
  defaultModel: 'gpt-4o-mini',
  welcomeMessage: 'Olá, eu sou MentorDo. Estou aqui para ajudar você a ajustar suas metas e a regular suas emoções em cada momento.',
  helpContacts: 'Se necessário, forneça contatos de suporte ou ajuda emergencial.',
};

export default function MentorDoAdminPage() {
  const firestore = useFirestore();
  const { user, appUser, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [config, setConfig] = useState(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);

  const configRef = firestore ? doc(firestore, 'mentorDoConfig', 'default') : null;
  const { data: savedConfig, isLoading } = useDoc(configRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (savedConfig) {
      setConfig({
        defaultPrompt: savedConfig.defaultPrompt || defaultConfig.defaultPrompt,
        defaultModel: savedConfig.defaultModel || defaultConfig.defaultModel,
        welcomeMessage: savedConfig.welcomeMessage || defaultConfig.welcomeMessage,
        helpContacts: savedConfig.helpContacts || defaultConfig.helpContacts,
      });
    }
  }, [savedConfig]);

  const handleChange = (field: keyof typeof defaultConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro de autenticação' });
      return;
    }

    if (!appUser?.role || appUser.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Acesso negado', description: 'Apenas administradores podem salvar esta configuração.' });
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(configRef!, {
        ...config,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast({ title: 'Configuração MentorDo salva.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar configuração', description: error.message || 'Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appUser?.role || appUser.role !== 'admin') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground max-w-md">Você precisa ser administrador para gerenciar a configuração do MentorDo.</p>
        <Link href="/dashboard">
          <Button variant="secondary">Voltar ao Painel</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Configuração MentorDo</h1>
        <p className="text-muted-foreground max-w-2xl">
          Aqui você ajusta o prompt base e os parâmetros principais do MentorDo para todos os usuários.
        </p>
      </div>

      <Card className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <CardHeader>
          <CardTitle>Prompt base e modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="mentordo-defaultPrompt" className="mb-2 block text-sm font-medium text-foreground">Prompt base do MentorDo</label>
            <Textarea
              id="mentordo-defaultPrompt"
              name="defaultPrompt"
              value={config.defaultPrompt}
              onChange={event => handleChange('defaultPrompt', event.target.value)}
              placeholder="Defina as regras e o tom do MentorDo..."
            />
          </div>
          <div>
            <label htmlFor="mentordo-defaultModel" className="mb-2 block text-sm font-medium text-foreground">Modelo padrão</label>
            <Input
              id="mentordo-defaultModel"
              name="defaultModel"
              value={config.defaultModel}
              onChange={event => handleChange('defaultModel', event.target.value)}
              placeholder="gpt-4o-mini"
            />
          </div>
          <div>
            <label htmlFor="mentordo-welcomeMessage" className="mb-2 block text-sm font-medium text-foreground">Mensagem de boas-vindas</label>
            <Textarea
              id="mentordo-welcomeMessage"
              name="welcomeMessage"
              value={config.welcomeMessage}
              onChange={event => handleChange('welcomeMessage', event.target.value)}
              placeholder="Mensagem inicial do MentorDo."
            />
          </div>
          <div>
            <label htmlFor="mentordo-helpContacts" className="mb-2 block text-sm font-medium text-foreground">Contatos de ajuda</label>
            <Textarea
              id="mentordo-helpContacts"
              name="helpContacts"
              value={config.helpContacts}
              onChange={event => handleChange('helpContacts', event.target.value)}
              placeholder="Ex: contatos de suporte ou serviços de ajuda imediata."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
