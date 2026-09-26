import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NeuroDO',
    short_name: 'NeuroDO',
    description: 'Sistema operacional para execução, foco e organização do empreendedor neurodivergente.',
    start_url: '/dashboard?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#14151f',
    theme_color: '#14151f',
    lang: 'pt-BR',
    categories: ['productivity', 'business', 'lifestyle'],
    icons: [
      {
        src: '/logo-neurodo-favicon.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
