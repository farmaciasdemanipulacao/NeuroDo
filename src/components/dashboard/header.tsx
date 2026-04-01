'use client';

import { UserNav } from '@/components/dashboard/user-nav';
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
    <header className="sticky top-0 z-10 flex h-14 w-full items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      
      <div className="ml-auto flex items-center gap-2">
        <Button variant="destructive" size="sm" onClick={onMentorSOSClick}>
          <AlertTriangle className="mr-2 h-4 w-4" />
          SOS
        </Button>
        <Button variant="outline" size="sm" onClick={onEnergyCheckinClick}>
          <Zap className="mr-2 h-4 w-4" />
          Energia{energyLevel !== null ? `: ${energyLevel}` : ''}
        </Button>
        <IdeaCatcher />
        <UserNav />
      </div>
    </header>
  );
}
