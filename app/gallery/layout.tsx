import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gallery & Highlights | Microsoft Student Community | SRM University-AP',
  description:
    'Moments and memories from MSC SRM AP events, SYNORA hackathons, cloud computing workshops, and community engineering summits at SRM University-AP.',
  alternates: {
    canonical: '/gallery',
  },
  openGraph: {
    title: 'Gallery & Highlights | Microsoft Student Community | SRM University-AP',
    description:
      'Moments and memories from MSC SRM AP events, SYNORA hackathons, cloud computing workshops, and community engineering summits at SRM University-AP.',
    url: '/gallery',
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
