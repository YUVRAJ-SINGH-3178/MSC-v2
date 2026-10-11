import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Microsoft Student Community | SRM University-AP',
    short_name: 'MSC SRM AP',
    description:
      'The student developer community at SRM University-AP. We build cloud applications on Azure, host hackathons, and contribute to open source together.',
    start_url: '/',
    display: 'standalone',
    background_color: '#05111c',
    theme_color: '#0067b8',
    icons: [
      {
        src: '/hero_bg.png',
        sizes: '192x192 512x512',
        type: 'image/png',
      },
    ],
  };
}
