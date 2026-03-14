import { api } from '@/lib/api';
import type { LoginPayload, RegisterPayload, AuthTokens, ApiResponse } from '@monday1/types';

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<AuthTokens>>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    api.post<ApiResponse<{ id: string; email: string }>>('/auth/register', payload),
};
