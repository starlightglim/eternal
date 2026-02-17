/**
 * EternalOS API Client
 *
 * Communicates with Cloudflare Workers backend.
 * Falls back to mock mode when VITE_API_URL is not configured.
 */

import type { DesktopItem, UserProfile } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

// Check if API is configured
export const isApiConfigured = !!API_URL;

// Store JWT in memory
let authToken: string | null = null;

/**
 * Set the auth token for API requests
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/**
 * Get the current auth token
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ Auth API ============

export interface SignupResponse {
  token: string;
  user: {
    uid: string;
    username: string;
    email: string;
  };
}

export interface LoginResponse {
  token: string;
  user: {
    uid: string;
    username: string;
    email: string;
  };
}

export async function signup(
  email: string,
  password: string,
  username: string
): Promise<SignupResponse> {
  return apiRequest<SignupResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  });
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  setAuthToken(null);
}

// ============ Desktop API ============

export interface DesktopResponse {
  items: DesktopItem[];
  profile: UserProfile | null;
}

export async function fetchDesktop(): Promise<DesktopResponse> {
  return apiRequest<DesktopResponse>('/api/desktop');
}

export async function createItem(item: Partial<DesktopItem>): Promise<DesktopItem> {
  return apiRequest<DesktopItem>('/api/desktop/items', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateItems(
  patches: Array<{ id: string; updates: Partial<DesktopItem> }>
): Promise<DesktopItem[]> {
  return apiRequest<DesktopItem[]>('/api/desktop/items', {
    method: 'PATCH',
    body: JSON.stringify(patches),
  });
}

export async function deleteItem(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/api/desktop/items/${id}`, {
    method: 'DELETE',
  });
}

// ============ Upload API ============

export interface UploadResponse {
  item: DesktopItem;
}

export async function uploadFile(
  file: File,
  parentId: string | null,
  position: { x: number; y: number },
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('parentId', parentId || '');
  formData.append('position', JSON.stringify(position));

  // Note: For progress tracking, we'd need XMLHttpRequest
  // For now, using fetch without progress
  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  onProgress?.(100);
  return response.json();
}

// ============ Visitor API ============

interface VisitorApiResponse {
  username: string;
  displayName: string;
  wallpaper?: string;
  items: DesktopItem[];
}

export interface VisitorResponse {
  items: DesktopItem[];
  profile: UserProfile;
}

export async function fetchVisitorDesktop(username: string): Promise<VisitorResponse> {
  const response = await fetch(`${API_URL}/api/visit/${username}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User not found');
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data: VisitorApiResponse = await response.json();

  // Transform API response to match expected format
  return {
    items: data.items,
    profile: {
      uid: '', // Not exposed to visitors
      username: data.username,
      displayName: data.displayName,
      wallpaper: data.wallpaper,
      createdAt: 0, // Not exposed to visitors
    },
  };
}

// ============ File URL ============

export function getFileUrl(uid: string, itemId: string, filename: string): string {
  return `${API_URL}/api/files/${uid}/${itemId}/${filename}`;
}

// ============ Assistant API ============

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResponse {
  response: string;
}

export async function sendAssistantMessage(
  message: string,
  conversationHistory?: AssistantMessage[]
): Promise<AssistantResponse> {
  return apiRequest<AssistantResponse>('/api/assistant', {
    method: 'POST',
    body: JSON.stringify({ message, conversationHistory }),
  });
}
