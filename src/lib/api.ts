const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bc_token');
}

export function setToken(token: string) {
  localStorage.setItem('bc_token', token);
}

export function clearToken() {
  localStorage.removeItem('bc_token');
  localStorage.removeItem('bc_refresh');
  localStorage.removeItem('bc_user');
}

export function setUser(user: unknown) {
  localStorage.setItem('bc_user', JSON.stringify(user));
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('bc_user') || 'null'); } catch { return null; }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  authenticated = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('Cannot reach server. Is the API running on port 4000?', 0);
  }

  let data: { data?: T; message?: string };
  try {
    data = await res.json();
  } catch {
    throw new ApiError(res.ok ? 'Invalid response from server' : `Request failed (${res.status})`, res.status);
  }

  if (!res.ok) {
    throw new ApiError(data.message || 'Request failed', res.status);
  }

  return data.data as T;
}

export const api = {
  get: <T>(endpoint: string, auth = false) => request<T>(endpoint, { method: 'GET' }, auth),
  post: <T>(endpoint: string, body: unknown, auth = false) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }, auth),
  put: <T>(endpoint: string, body: unknown, auth = false) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }, auth),
  patch: <T>(endpoint: string, body: unknown, auth = false) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }, auth),
  delete: <T>(endpoint: string, auth = false) => request<T>(endpoint, { method: 'DELETE' }, auth),
};
