'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export function useAuth(protect = true) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');

    if (!token || !raw) {
      if (protect) router.replace('/signin');
      setLoading(false);
      return;
    }

    try {
      setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (protect) router.replace('/signin');
    } finally {
      setLoading(false);
    }
  }, [protect, router]);

  function signout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/signin');
  }

  return { user, loading, signout };
}
