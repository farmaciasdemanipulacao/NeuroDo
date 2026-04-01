'use client';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProvider } from '@/context/app-provider';
import { FirebaseClientProvider } from '@/firebase';

// Metadata can be defined in a Server Component layout
// We will move this to a template or page file if needed, but for now, it's removed to solve the error.
/*
export const metadata: Metadata = {
  title: 'NeuroDO',
  description: 'Um SO para o Empreendedor Neurodivergente',
};
*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        {/* Google Fonts are now imported in globals.css */}
        <link rel="icon" href="/logo-neurodo-favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/logo-neurodo-favicon.png" />
      </head>
      <body className="font-body antialiased bg-background text-foreground" suppressHydrationWarning>
        <FirebaseClientProvider>
          <AppProvider>
            {children}
            <Toaster />
          </AppProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
