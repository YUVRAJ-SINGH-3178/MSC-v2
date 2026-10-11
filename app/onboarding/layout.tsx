import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Member Onboarding | Microsoft Student Community SRM AP',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
