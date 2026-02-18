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

// ============ Password Reset API ============

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  resetToken?: string; // Only in development
  resetUrl?: string; // Only in development
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
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

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_URL}/api/upload`);

    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    }

    xhr.send(formData);
  });
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

/**
 * Get the URL for a file stored in R2.
 * Includes auth token as query param since img/video/audio tags can't send headers.
 * @param r2Key - The full R2 key path (e.g., "uid/itemId/filename")
 */
export function getFileUrl(r2Key: string): string {
  const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
  return `${API_URL}/api/files/${r2Key}${tokenParam}`;
}

/**
 * Get the URL for a custom wallpaper stored in R2.
 * @param wallpaperValue - The wallpaper value (e.g., "custom:uid/wallpaper/id/filename")
 */
export function getWallpaperUrl(wallpaperValue: string): string {
  // Custom wallpapers are prefixed with "custom:"
  if (wallpaperValue.startsWith('custom:')) {
    const r2Key = wallpaperValue.slice('custom:'.length);
    return `${API_URL}/api/wallpaper/${r2Key}`;
  }
  return '';
}

// ============ Wallpaper Upload API ============

export interface WallpaperUploadResponse {
  success: boolean;
  wallpaper: string;
  r2Key: string;
  profile: UserProfile;
}

export async function uploadWallpaper(
  file: File,
  onProgress?: (progress: number) => void
): Promise<WallpaperUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Wallpaper upload failed: HTTP ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during wallpaper upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Wallpaper upload cancelled'));
    });

    xhr.open('POST', `${API_URL}/api/wallpaper`);

    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    }

    xhr.send(formData);
  });
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

// ============ Quota API ============

export interface QuotaInfo {
  used: number;      // Bytes used
  limit: number;     // Quota limit in bytes
  remaining: number; // Bytes remaining
  itemCount: number; // Number of items with files
}

export async function fetchQuota(): Promise<QuotaInfo> {
  return apiRequest<QuotaInfo>('/api/quota');
}
