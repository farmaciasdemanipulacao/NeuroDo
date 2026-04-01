'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/dashboard/sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/dashboard/header';
import { AiMentorChat } from '@/components/dashboard/ai-mentor-chat';
import { AiMentorErrorBoundary } from '@/components/dashboard/ai-mentor-error-boundary';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { EnergyCheckin } from '@/components/dashboard/energy-checkin';
import { FloatingFocusTimer } from '@/components/dashboard/floating-focus-timer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [energyModalOpen, setEnergyModalOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Autenticando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header onEnergyCheckinClick={() => setEnergyModalOpen(true)} />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>

      <FloatingFocusTimer />
      <AiMentorErrorBoundary>
        <AiMentorChat />
      </AiMentorErrorBoundary>
      <EnergyCheckin open={energyModalOpen} onOpenChange={setEnergyModalOpen} />
    </>
  );
}
