import Link from 'next/link';
import { ArrowLeft, Share2, SquarePlus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function InstallPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-lg space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao NeuroDO
          </Link>
        </Button>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Instalar NeuroDO no iPhone</h1>
          </div>
          <p className="text-muted-foreground">
            Você pode instalar o NeuroDO na Tela de Início e abrir em tela cheia, como um aplicativo.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Como instalar</CardTitle>
            <CardDescription>Faça isso uma única vez pelo Safari.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">1</div>
              <p className="pt-1 text-sm">Abra <strong>neurodo.com.br</strong> no Safari.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">2</div>
              <p className="flex items-center gap-2 pt-1 text-sm">
                Toque em Compartilhar <Share2 className="h-4 w-4" />.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">3</div>
              <p className="flex items-center gap-2 pt-1 text-sm">
                Escolha Adicionar à Tela de Início <SquarePlus className="h-4 w-4" />.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">4</div>
              <p className="pt-1 text-sm">Confirme. O ícone do NeuroDO ficará junto com seus outros apps.</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          A versão instalada usa o mesmo NeuroDO da web. Atualizações publicadas no sistema entram automaticamente sem reinstalar o aplicativo.
        </p>
      </div>
    </main>
  );
}
