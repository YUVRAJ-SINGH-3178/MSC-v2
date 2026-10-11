import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mscsrmap.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Microsoft Student Community | SRM University-AP',
    template: '%s | Microsoft Student Community SRM AP',
  },
  description:
    'The official student developer guild at SRM University-AP. We engineer cloud applications on Azure, host national hackathons (SYNORA), and empower visionary student builders.',
  applicationName: 'Microsoft Student Community SRM AP',
  keywords: [
    'Microsoft Student Community',
    'MSC SRM AP',
    'SRM University AP',
    'SRM AP Hackathon',
    'SYNORA 2026',
    'SYNORA Hackathon',
    'Azure Cloud Computing',
    'Student Developer Community',
    'Amaravati Tech Club',
    'Engineering Guild SRM AP',
    'Microsoft Student Chapter',
    'Open Source SRM',
    'SRM AP Coding Club',
  ],
  authors: [{ name: 'Microsoft Student Community SRM AP', url: BASE_URL }],
  creator: 'Microsoft Student Community SRM AP',
  publisher: 'Microsoft Student Community SRM AP',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Microsoft Student Community | SRM University-AP',
    description:
      'Where Student Builders Engineer Production Scale. Official Microsoft student community at SRM University-AP hosting national hackathons, Azure compute workshops, and AI bootcamps.',
    url: BASE_URL,
    siteName: 'Microsoft Student Community SRM AP',
    images: [
      {
        url: '/hero_bg.png',
        width: 1200,
        height: 630,
        alt: 'Microsoft Student Community SRM University-AP',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Microsoft Student Community | SRM University-AP',
    description:
      'The premier student engineering guild at SRM University AP. Building on Azure, hosting hackathons, and empowering student engineers.',
    images: ['/hero_bg.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0067b8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': `${BASE_URL}/#organization`,
        name: 'Microsoft Student Community - SRM University-AP',
        alternateName: 'MSC SRM AP',
        url: BASE_URL,
        logo: `${BASE_URL}/hero_bg.png`,
        description:
          'Official Microsoft Student Community chapter at SRM University-AP fostering technical excellence, cloud architecture, and hackathon development.',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Neerukonda',
          addressLocality: 'Mangalagiri, Amaravati',
          addressRegion: 'Andhra Pradesh',
          postalCode: '522240',
          addressCountry: 'IN',
        },
        sameAs: [
          'https://github.com/YUVRAJ-SINGH-3178/MSC-v2',
          'https://linkedin.com/company/msc-srmap',
          'https://instagram.com/msc_srmap',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'Microsoft Student Community SRM AP',
        publisher: {
          '@id': `${BASE_URL}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/events?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
