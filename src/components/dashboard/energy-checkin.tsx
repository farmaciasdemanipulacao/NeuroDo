'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/hooks/use-app';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { Zap } from 'lucide-react';

const energyConfig = {
    0: { label: "Manutenção", color: "bg-energy-maint", description: "Apenas mantendo as luzes acesas." },
    1: { label: "Muito Baixa", color: "bg-energy-low", description: "Quase sem bateria. Hora de uma pausa?" },
    2: { label: "Baixa", color: "bg-energy-low", description: "Com pouca energia. Apenas tarefas pequenas e fáceis." },
    3: { label: "Um Pouco Baixa", color: "bg-energy-low", description: "A energia está escassa. Vamos com calma." },
    4: { label: "Média-Baixa", color: "bg-energy-medium", description: "Começando a aquecer. Qual a menor coisa que podemos fazer?" },
    5: { label: "Média", color: "bg-energy-medium", description: "Tudo sob controle. Bom para trabalho focado." },
    6: { label: "Média-Alta", color: "bg-energy-medium", description: "Sentindo-se muito bem! Pronto para um desafio." },
    7: { label: "Alta", color: "bg-energy-high", description: "Vamos fazer acontecer! A energia está fluindo." },
    8: { label: "Muito Alta", color: "bg-energy-high", description: "Na zona! Vamos encarar algo grande." },
    9: { label: "Pico", color: "bg-energy-high", description: "Imparável! Hora de um trabalho profundo e criativo." },
    10: { label: "Explosiva", color: "bg-energy-high", description: "Super-recarregado! Vamos mudar o mundo." },
};

export function EnergyCheckin({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { setEnergyLevel } = useApp();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentValue, setCurrentValue] = useState([5]);
  const [comment, setComment] = useState('');
  const energyInfo = useMemo(() => energyConfig[currentValue[0] as keyof typeof energyConfig], [currentValue]);

  const handleSubmit = () => {
    setEnergyLevel(currentValue[0]);

    if (user && firestore) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const docId = `${dateStr}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
      const checkinRef = doc(firestore, 'users', user.uid, 'energy_checkins', docId);
      setDocumentNonBlocking(checkinRef, {
        energyLevel: currentValue[0],
        comment: comment.trim(),
        createdAt: now.toISOString(),
        date: dateStr,
      }, {});
    }

    toast({
      description: comment.trim()
        ? 'Energia registrada com nota! 💪'
        : 'Energia registrada! 💪',
    });

    setComment('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Check-in de Energia Diário</DialogTitle>
          <DialogDescription>
            Como você está se sentindo agora? Sua resposta ajuda a personalizar seu dia.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{energyInfo.label}</h3>
            <span className={`text-2xl font-bold ${energyInfo.color.replace('bg-', 'text-')}`}>{currentValue[0]}</span>
          </div>
          <p className="text-sm text-muted-foreground min-h-[40px]">{energyInfo.description}</p>
          <Slider
            defaultValue={currentValue}
            onValueChange={setCurrentValue}
            max={10}
            step={1}
            className="my-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Baixa</span>
            <span>Média</span>
            <span>Alta</span>
          </div>
          <div>
            <Textarea
              placeholder="O que está influenciando sua energia agora? (opcional)"
              maxLength={280}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/280</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>
            <Zap className="mr-2 h-4 w-4" />
            Definir Minha Energia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
