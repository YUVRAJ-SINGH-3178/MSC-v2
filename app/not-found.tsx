import React from 'react';
import type { Metadata } from 'next';
import NotFoundClient from '@/components/NotFoundClient';

export const metadata: Metadata = {
  title: '404: Skill Issue Detected | Microsoft Student Community SRM AP',
  description: 'Congratulations! You found a page that does not exist. Please turn back before the compiler notices.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return <NotFoundClient />;
}
