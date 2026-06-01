import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';

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
  // FNV-1a 32-bit — server-side digest for correlating client digests
  function hashString(s: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }

  try {
    return (
      <html lang="pt-BR" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
        <head>
          {/* Google Fonts are now imported in globals.css */}
          <link rel="icon" href="/logo-neurodo-favicon.png" type="image/png" />
          <link rel="shortcut icon" href="/logo-neurodo-favicon.png" />
        </head>
        <body className="font-body antialiased bg-background text-foreground" suppressHydrationWarning>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </body>
      </html>
    );
  } catch (err) {
    const e = err as Error;
    const payload = `${e?.message ?? ''}\n${e?.stack ?? ''}`;
    const digest = hashString(payload);
    // eslint-disable-next-line no-console
    console.error(`[Server Error] Digest: ${digest}`, e);
    throw err;
  }
}
