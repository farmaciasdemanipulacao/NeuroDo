'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, CheckCircle2, Download, Share2, SquarePlus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallPage() {
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setInstalled(isStandalone());
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setNotificationPermission('Notification' in window ? Notification.permission : 'unsupported');

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function activateNotifications() {
    if (!('Notification' in window)) {
      toast({ title: 'Lembretes no app ativos', description: 'Este navegador não oferece notificações do sistema.' });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      await navigator.serviceWorker?.register('/neurodo-sw.js').catch(() => undefined);
      toast({ title: 'Notificações ativadas!', description: 'O NeuroDO já pode te lembrar do que importa.' });
    } else {
      toast({ title: 'Notificações não ativadas', description: 'Você pode permitir depois em Configurações.' });
    }
  }

  async function handleInstall() {
    if (installed) {
      await activateNotifications();
      return;
    }

    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        await activateNotifications();
      }
      return;
    }

    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }

    toast({
      title: 'Instalação pelo navegador',
      description: 'Abra o menu do navegador e escolha instalar/adicionar o NeuroDO à tela inicial.',
    });
  }

  const notificationsOn = notificationPermission === 'granted';

  return (
    <main className="min-h-dvh bg-background px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] text-foreground">
      <div className="mx-auto max-w-lg space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao NeuroDO</Link>
        </Button>

        <div className="space-y-2 text-center">
          <Smartphone className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold">{installed ? 'NeuroDO instalado' : 'Instale o NeuroDO'}</h1>
          <p className="text-muted-foreground">
            {installed ? 'Agora ative as notificações para receber seus lembretes.' : 'Acesso rápido, tela cheia e lembretes no momento certo.'}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <Button className="h-14 w-full text-base font-semibold" onClick={handleInstall}>
              {installed ? <Bell className="mr-2 h-5 w-5" /> : <Download className="mr-2 h-5 w-5" />}
              {installed
                ? notificationsOn ? 'Notificações ativadas' : 'Ativar notificações'
                : 'Instalar e ativar notificações'}
            </Button>

            {installed && notificationsOn && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Tudo pronto para usar.
              </div>
            )}
          </CardContent>
        </Card>

        {showIOSSteps && !installed && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Só falta confirmar no iPhone</CardTitle>
              <CardDescription>O iOS exige esta confirmação uma única vez.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="flex items-center gap-3"><Share2 className="h-5 w-5 shrink-0 text-primary" />1. Toque em Compartilhar no Safari.</p>
              <p className="flex items-center gap-3"><SquarePlus className="h-5 w-5 shrink-0 text-primary" />2. Toque em Adicionar à Tela de Início.</p>
              <p>3. Mantenha <strong>Abrir como app web</strong> ativado e confirme em <strong>Adicionar</strong>.</p>
              <p className="text-muted-foreground">Depois, abra o NeuroDO pelo novo ícone. O botão acima mudará automaticamente para “Ativar notificações”.</p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Atualizações do NeuroDO entram automaticamente. Não é necessário reinstalar a cada versão.
        </p>
      </div>
    </main>
  );
}
