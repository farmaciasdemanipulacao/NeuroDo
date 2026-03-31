'use client';

import { useApp } from '@/hooks/use-app';
import { workModeLabels } from '@/context/app-provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Coffee, BrainCircuit, Zap } from 'lucide-react';
import { Badge } from '../ui/badge';


export function FocusTimer() {
  const { 
    energyLevel, 
    timerMode,
    workMode,
    secondsLeft,
    duration,
    isActive,
    toggleTimer,
    resetTimer,
    skipToNextMode,
  } = useApp();
  
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = duration > 0 ? ((duration - secondsLeft) / duration) * 100 : 0;
  
  const currentWorkModeLabel = workModeLabels[workMode];

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Timer de Foco</CardTitle>
        <CardDescription className="text-center">
          Atualmente em <span className="font-semibold text-primary">{timerMode === 'work' ? `Modo Foco: ${currentWorkModeLabel}` : 'Modo Pausa'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-8">
        <div className="relative h-64 w-64">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle className="stroke-current text-muted" strokeWidth="4" cx="50" cy="50" r="45" fill="transparent" />
            <circle className="stroke-current text-primary transition-all duration-1000 ease-linear" strokeWidth="4" cx="50" cy="50" r="45" fill="transparent" strokeDasharray="282.74" strokeDashoffset={282.74 - (progress / 100) * 282.74} transform="rotate(-90 50 50)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold tracking-tighter">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => resetTimer()}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button size="lg" className="w-32" onClick={toggleTimer}>
            {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
            {isActive ? 'Pausar' : 'Iniciar'}
          </Button>
          <Button variant="outline" size="icon" onClick={skipToNextMode}>
              {timerMode === 'work' ? <Coffee className="h-5 w-5" /> : <BrainCircuit className="h-5 w-5" />}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>Duração ajustada pela sua energia:</span>
            <Badge variant="outline">{energyLevel ?? "N/A"}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Faça o check-in de energia no cabeçalho para alterar.</p>
      </CardFooter>
    </Card>
  );
}
