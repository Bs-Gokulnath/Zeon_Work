const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface BoardItem {
  id: string;
  name: string;
  status?: string;
  priority?: string;
  owner?: string;
  state?: string;
  city?: string;
  location?: string;
  propertyType?: string;
  googleRating?: number | null;
  noOfRatings?: number | null;
  landOwnerContact?: string;
  phone?: string;
  email?: string;
  powerAvailability?: string;
  investment?: string;
  availableParking?: string;
  notes?: string;
  reminderDate?: string;
  dueDate?: string;
  position: number;
  groupId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BoardGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  boardId: string;
  items: BoardItem[];
  createdAt: string;
}

function getToken() {
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

export const groupsApi = {
  getAll: (boardId: string) =>
    request<{ data: BoardGroup[] }>(`/boards/${boardId}/groups`),

  create: (boardId: string, name: string, color?: string) =>
    request<{ data: BoardGroup }>(`/boards/${boardId}/groups`, {
      method: 'POST', body: JSON.stringify({ name, color }),
    }),

  delete: (boardId: string, groupId: string) =>
    request<{ message: string }>(`/boards/${boardId}/groups/${groupId}`, { method: 'DELETE' }),

  createItem: (boardId: string, groupId: string, name: string) =>
    request<{ data: BoardItem }>(`/boards/${boardId}/groups/${groupId}/items`, {
      method: 'POST', body: JSON.stringify({ name }),
    }),

  updateItem: (boardId: string, groupId: string, itemId: string, data: Partial<BoardItem>) =>
    request<{ data: BoardItem }>(`/boards/${boardId}/groups/${groupId}/items/${itemId}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  deleteItem: (boardId: string, groupId: string, itemId: string) =>
    request<{ message: string }>(`/boards/${boardId}/groups/${groupId}/items/${itemId}`, { method: 'DELETE' }),
};
