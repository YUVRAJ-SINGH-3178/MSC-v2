import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Authentication | Microsoft Student Community SRM AP',
  description: 'Sign in to the Microsoft Student Community SRM AP member and administrator management console.',
  alternates: {
    canonical: '/login',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
