const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json as T;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export const usersApi = {
  getAll: () => request<User[]>('GET', '/users'),
  getMe: () => request<User>('GET', '/users/me'),
  update: (id: string, data: { name?: string; role?: 'USER' | 'ADMIN' }) =>
    request<User>('PATCH', `/users/${id}`, data),
  remove: (id: string) => request<{ message: string }>('DELETE', `/users/${id}`),
  invite: (email: string, name?: string) =>
    request<{ data: User; message: string }>('POST', '/users/invite', { email, name }),
};
