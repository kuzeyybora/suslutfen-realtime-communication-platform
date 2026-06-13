import client from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface AuthTokens {
  token: string;
  refresh_token: string;
}

export const login = (payload: LoginPayload) =>
  client.post<AuthTokens>('/login', payload);

export const register = (payload: RegisterPayload) =>
  client.post('/register', payload);

export const logout = (refreshToken: string) =>
  client.post('/logout', { refresh_token: refreshToken });
