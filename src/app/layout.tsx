import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';

export const metadata: Metadata = {
  applicationName: 'NeuroDO',
  title: {
    default: 'NeuroDO',
    template: '%s · NeuroDO',
  },
  description: 'Sistema operacional para execução, foco e organização do empreendedor neurodivergente.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NeuroDO',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/logo-neurodo-favicon.png', type: 'image/png' },
      { url: '/logo-neurodo-quadrada.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo-neurodo-quadrada.png', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#14151f',
};

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
      <html lang="pt-BR" className="dark" data-theme="default" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
        <head>
          {/* Google Fonts are now imported in globals.css */}
          <link rel="icon" href="/logo-neurodo-favicon.png" type="image/png" />
          <link rel="shortcut icon" href="/logo-neurodo-favicon.png" />
        </head>
        <body className="font-body antialiased bg-background text-foreground" suppressHydrationWarning>
          {/*
            Elemento real, não pseudo-elemento: iOS usa a pintura no topo da
            viewport para definir o acabamento da barra de status do PWA.
            A cor acompanha o tema via CSS variables sem reativar translucidez.
          */}
          <div
            id="ios-status-bar-tint"
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: '0 0 auto 0',
              height: 1,
              backgroundColor: 'hsl(var(--background))',
              pointerEvents: 'none',
              zIndex: 2147483647,
            }}
          />
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
