'use client';

import { IdeaCatcher } from './idea-catcher';
import { Button } from '../ui/button';
import { Zap, AlertTriangle } from 'lucide-react';
import { useApp } from '@/hooks/use-app';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface HeaderProps {
  onEnergyCheckinClick: () => void;
  onMentorSOSClick: () => void;
}

export function Header({ onEnergyCheckinClick, onMentorSOSClick }: HeaderProps) {
  const { energyLevel } = useApp();

  return (
    <header className="relative z-10 flex h-[calc(3.5rem+env(safe-area-inset-top))] w-full shrink-0 items-center gap-2 overflow-hidden border-b bg-background px-4 pt-[env(safe-area-inset-top)] md:sticky md:top-0">
      <SidebarTrigger />
      
      <div className="ml-auto flex items-center gap-2">
        <Button variant="destructive" size="sm" className="shadow-none" onClick={onMentorSOSClick}>
          <AlertTriangle className="mr-2 h-4 w-4" />
          SOS
        </Button>
        <Button variant="outline" size="sm" className="shadow-none hover:bg-transparent hover:text-foreground md:hover:bg-accent md:hover:text-accent-foreground" onClick={onEnergyCheckinClick}>
          <Zap className="mr-2 h-4 w-4" />
          Energia{energyLevel !== null ? `: ${energyLevel}` : ''}
        </Button>
        <IdeaCatcher />
      </div>
    </header>
  );
}
