// EternalOS Type Definitions

/**
 * Desktop item types
 */
export type DesktopItemType = 'folder' | 'image' | 'text' | 'link';

/**
 * Represents a single item on the desktop (file, folder, etc.)
 */
export interface DesktopItem {
  id: string;
  type: DesktopItemType;
  name: string;
  parentId: string | null; // null = root desktop
  position: { x: number; y: number };
  isPublic: boolean;
  createdAt: number; // unix timestamp (ms)
  updatedAt: number; // unix timestamp (ms)
  // Optional fields based on type
  r2Key?: string; // R2 object key for uploaded files
  mimeType?: string;
  fileSize?: number;
  textContent?: string; // for text files
  url?: string; // for link files
}

/**
 * Window state for the window manager
 */
export interface WindowState {
  id: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  // Content information
  contentType: 'folder' | 'image' | 'text' | 'get-info' | 'about' | 'assistant' | 'wallpaper' | 'welcome';
  contentId?: string; // Reference to DesktopItem id if applicable
}

/**
 * User profile
 */
export interface UserProfile {
  uid: string;
  username: string;
  displayName?: string;
  wallpaper?: string;
  createdAt: number; // unix timestamp (ms)
}

/**
 * Auth user info (from JWT)
 */
export interface AuthUser {
  uid: string;
  username: string;
  email: string;
}

/**
 * Menu item for the menu bar
 */
export interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
  submenu?: MenuItem[];
}

/**
 * Menu definition for the menu bar
 */
export interface Menu {
  label: string;
  items: MenuItem[];
}
