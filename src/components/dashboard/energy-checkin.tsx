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
import { useApp } from '@/hooks/use-app';
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
  const [currentValue, setCurrentValue] = useState([5]);
  const energyInfo = useMemo(() => energyConfig[currentValue[0] as keyof typeof energyConfig], [currentValue]);

  const handleSubmit = () => {
    setEnergyLevel(currentValue[0]);
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
