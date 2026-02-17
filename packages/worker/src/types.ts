/**
 * Shared TypeScript types for EternalOS Worker
 */

export interface DesktopItem {
  id: string;
  type: 'folder' | 'image' | 'text' | 'link';
  name: string;
  parentId: string | null; // null = root desktop
  position: { x: number; y: number };
  isPublic: boolean;
  createdAt: number; // unix timestamp
  updatedAt: number;
  r2Key?: string; // R2 object key for uploaded files
  mimeType?: string;
  fileSize?: number;
  textContent?: string; // for text files (small files stored inline)
  url?: string; // for link items
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  wallpaper: string; // pattern name or R2 key
  createdAt: number;
}

export interface UserRecord {
  uid: string;
  email: string;
  passwordHash: string;
  username: string;
  createdAt: number;
}

export interface SessionRecord {
  uid: string;
  expiresAt: number;
}

export interface JWTPayload {
  uid: string;
  username: string;
  iat: number;
  exp: number;
}
