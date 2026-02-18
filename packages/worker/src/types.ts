/**
 * Shared TypeScript types for EternalOS Worker
 */

export interface DesktopItem {
  id: string;
  type: 'folder' | 'image' | 'text' | 'link' | 'audio' | 'video' | 'pdf';
  name: string;
  parentId: string | null; // null = root desktop
  position: { x: number; y: number };
  isPublic: boolean;
  createdAt: number; // unix timestamp
  updatedAt: number;
  // Trash state
  isTrashed?: boolean; // true if item is in trash
  trashedAt?: number; // unix timestamp when moved to trash
  // Optional fields based on type
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
  // Session invalidation: tokens issued before this time are invalid
  // Incremented when password changes or user explicitly logs out all sessions
  passwordChangedAt?: number;
}

export interface SessionRecord {
  uid: string;
  expiresAt: number;
  // Track when the session was created for password change validation
  issuedAt: number;
  // Refresh token for token rotation
  refreshToken?: string;
  refreshExpiresAt?: number;
}

export interface JWTPayload {
  uid: string;
  username: string;
  iat: number;
  exp: number;
}

export interface PasswordResetRecord {
  uid: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}
