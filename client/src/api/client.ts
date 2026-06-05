import { HotListResponse, HotList, AppConfig, AppConfigPartial } from '@shared/types';

const BASE_URL = import.meta.env.VITE_API_BASE || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error: true; code: string; message: string; details?: string },
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
}

async function fetchHotLists(): Promise<HotListResponse> {
  return request<HotListResponse>('/api/hot-lists');
}

async function fetchHotList(platform: string): Promise<HotList> {
  return request<HotList>(`/api/hot-lists/${platform}`);
}

async function triggerRefresh(): Promise<HotListResponse> {
  return request<HotListResponse>('/api/refresh', { method: 'POST' });
}

async function triggerPlatformRefresh(platform: string): Promise<HotList> {
  return request<HotList>(`/api/refresh/${platform}`, { method: 'POST' });
}

async function fetchConfig(): Promise<AppConfig> {
  return request<AppConfig>('/api/config');
}

async function updateConfig(data: AppConfigPartial): Promise<AppConfig> {
  return request<AppConfig>('/api/config', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export { fetchHotLists, fetchHotList, triggerRefresh, triggerPlatformRefresh, fetchConfig, updateConfig, ApiError };
export type { HotListResponse, HotList, AppConfig, AppConfigPartial };
