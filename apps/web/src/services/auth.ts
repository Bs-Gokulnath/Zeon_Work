const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Something went wrong');
  return json as T;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  data: { user: AuthUser; accessToken: string };
}

export async function sendOtp(email: string, name?: string): Promise<{ message: string }> {
  return post('/auth/send-otp', { email, name });
}

export async function verifyOtp(email: string, code: string, name?: string): Promise<AuthResponse> {
  return post('/auth/verify-otp', { email, code, name });
}
