'use client';

import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, loading } = useAuth(true);

  if (loading) return null;

  return (
    <div style={{ padding: 32, fontFamily: 'Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 32, fontWeight: 600, color: '#323338', margin: 0 }}>
        Good day, {user?.name?.split(' ')[0]} 👋
      </h1>
      <p style={{ marginTop: 10, fontSize: 17, color: '#676879' }}>
        Welcome to your workspace. Here&apos;s what&apos;s happening today.
      </p>
    </div>
  );
}
