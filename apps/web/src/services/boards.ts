const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Board {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

function getToken(): string {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...options.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json as T;
}

export const boardsApi = {
  getAll: () => request<{ data: Board[] }>('/boards'),
  create: (name: string, description?: string) =>
    request<{ data: Board }>('/boards', { method: 'POST', body: JSON.stringify({ name, description }) }),
  remove: (id: string) => request<{ message: string }>(`/boards/${id}`, { method: 'DELETE' }),
};
