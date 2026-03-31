'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { eveningReviewPrompts } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Check, Moon } from 'lucide-react';

export function EveningReviewForm() {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Revisão Salva!',
      description: "Ótimo trabalho refletindo sobre o seu dia. Você está pronto para amanhã!",
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Moon className="text-primary" /> Revisão Noturna
        </CardTitle>
        <CardDescription>
          Encerre seu dia com intenção e prepare-se para um amanhã de sucesso.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="accomplished" className="text-base">{eveningReviewPrompts.accomplished}</Label>
            <Textarea id="accomplished" placeholder="Ex: 'Terminei o relatório do 3º trimestre...'" className="min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stuck" className="text-base">{eveningReviewPrompts.stuck}</Label>
            <Textarea id="stuck" placeholder="Ex: 'Tive dificuldade com a integração da API...'" className="min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tomorrow" className="text-base">{eveningReviewPrompts.tomorrow}</Label>
            <Textarea id="tomorrow" placeholder="1. ...&#10;2. ...&#10;3. ..." className="min-h-[100px]" />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            <Check className="mr-2 h-4 w-4" />
            Completar Revisão
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
