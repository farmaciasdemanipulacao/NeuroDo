'use client';

import { useApp } from "@/hooks/use-app";
import { workModeLabels } from "@/context/app-provider";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Play, Pause, RotateCcw, BrainCircuit, Link as LinkIcon } from 'lucide-react';
import Link from "next/link";

// New component for the controls inside the popover
function MiniTimerControls() {
    const { 
        timerMode,
        workMode,
        secondsLeft,
        duration,
        isActive,
        toggleTimer,
        resetTimer,
      } = useApp();

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const progress = duration > 0 ? ((duration - secondsLeft) / duration) * 100 : 0;
    const currentWorkModeLabel = workModeLabels[workMode];

    return (
        <div className="p-4 flex flex-col items-center gap-4 w-64">
            <p className="text-sm text-muted-foreground">
                {timerMode === 'work' ? `Foco: ${currentWorkModeLabel}` : 'Pausa'}
            </p>
            <div className="relative h-40 w-40">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle className="stroke-current text-muted" strokeWidth="5" cx="50" cy="50" r="45" fill="transparent" />
                    <circle className="stroke-current text-primary transition-all duration-1000 ease-linear" strokeWidth="5" cx="50" cy="50" r="45" fill="transparent" strokeDasharray="282.74" strokeDashoffset={282.74 - (progress / 100) * 282.74} transform="rotate(-90 50 50)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold tracking-tighter">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => resetTimer()}>
                    <RotateCcw className="h-5 w-5" />
                </Button>
                <Button size="lg" className="w-24" onClick={toggleTimer}>
                    {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                    {isActive ? 'Pausar' : 'Iniciar'}
                </Button>
                 <Button variant="ghost" size="icon" asChild>
                     <Link href="/dashboard/focus"><LinkIcon className="h-5 w-5" /></Link>
                </Button>
            </div>
        </div>
    );
}


export function FloatingFocusTimer() {
    const { secondsLeft, duration, hasTimerBeenStarted } = useApp();

    if (!hasTimerBeenStarted) {
        return null;
    }

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const progress = duration > 0 ? ((duration - secondsLeft) / duration) * 100 : 0;

    return (
        <div className="fixed bottom-24 right-6 z-40">
            <Popover>
                <PopoverTrigger asChild>
                     <button className="relative h-16 w-16 group block rounded-full shadow-lg border-2 border-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <svg className="h-full w-full" viewBox="0 0 100 100">
                            <circle
                                className="stroke-current text-muted/30"
                                strokeWidth="8"
                                cx="50"
                                cy="50"
                                r="45"
                                fill="hsl(var(--card))"
                            />
                            <circle
                                className="stroke-current text-primary transition-all duration-1000 ease-linear"
                                strokeWidth="8"
                                cx="50"
                                cy="50"
                                r="45"
                                fill="transparent"
                                strokeDasharray="282.74"
                                strokeDashoffset={282.74 - (progress / 100) * 282.74}
                                transform="rotate(-90 50 50)"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-center">
                            <div className="text-lg font-bold tracking-tighter">
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </div>
                        </div>
                    </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="p-0">
                    <MiniTimerControls />
                </PopoverContent>
            </Popover>
        </div>
    )
}
