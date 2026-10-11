import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pass & Ticket Lookup | Microsoft Student Community SRM AP',
  description:
    'Retrieve and view your official accredited registration ticket for Microsoft Student Community events at SRM University-AP.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TicketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
