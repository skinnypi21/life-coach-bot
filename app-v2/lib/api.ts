import { getToken, clearToken, setToken } from './auth';
import type { Goal } from './pillars';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface Blocker {
  row: number;
  timestamp: string;
  pillar: string;
  goal: string;
  description: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError('Network error — are you offline?', 0);
  }

  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearToken();
    throw new ApiError(body.error || 'Session expired', 401);
  }
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error || `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

export async function login(password: string): Promise<void> {
  const { token } = await request<{ token: string }>('/api/v2/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  setToken(token);
}

export async function getGoals(weekEnding: string): Promise<Goal[]> {
  const { goals } = await request<{ goals: Goal[] }>(
    `/api/v2/goals?weekEnding=${encodeURIComponent(weekEnding)}`
  );
  return goals;
}

export async function setProgress(pillar: string, value: number, weekEnding: string): Promise<void> {
  await request('/api/v2/progress', {
    method: 'POST',
    body: JSON.stringify({ pillar, value, weekEnding }),
    // Survives page unload — debounced stepper writes flush on pagehide
    keepalive: true,
  });
}

export async function getBlockers(): Promise<Blocker[]> {
  const { blockers } = await request<{ blockers: Blocker[] }>('/api/v2/blockers');
  return blockers;
}

export async function resolveBlocker(row: number, timestamp: string): Promise<void> {
  await request('/api/v2/blockers/resolve', {
    method: 'POST',
    body: JSON.stringify({ row, timestamp }),
  });
}
