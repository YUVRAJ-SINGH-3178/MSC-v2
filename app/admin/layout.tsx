import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminShell from '@/components/AdminShell';

export const metadata = {
  title: 'Admin Portal | Microsoft Student Community SRM AP',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login?redirect=/admin');
  }

  const { data: profile } = await supabase
    .from('member_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/login?error=unauthorized');
  }

  return (
    <AdminShell userEmail={user.email} userRole={profile.role}>
      {children}
    </AdminShell>
  );
}
