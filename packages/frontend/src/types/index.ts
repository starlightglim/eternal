// EternalOS Type Definitions

/**
 * Desktop item types
 */
export type DesktopItemType = 'folder' | 'image' | 'text' | 'link' | 'audio' | 'video' | 'pdf';

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
  // Trash state
  isTrashed?: boolean; // true if item is in trash
  trashedAt?: number; // unix timestamp when moved to trash
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
  collapsed?: boolean; // Window shade - show only title bar
  // Pre-maximized state for restore
  preMaximizedPosition?: { x: number; y: number };
  preMaximizedSize?: { width: number; height: number };
  // Content information
  contentType: 'folder' | 'image' | 'text' | 'markdown' | 'code' | 'get-info' | 'about' | 'assistant' | 'wallpaper' | 'welcome' | 'search' | 'preferences' | 'trash' | 'audio' | 'video' | 'pdf' | 'calculator' | 'clock';
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

/**
 * File extension patterns for different viewers
 */
const CODE_EXTENSIONS = /\.(js|jsx|ts|tsx|py|css|html|json|sh|bash|yml|yaml|go|rs|java|c|cpp|h|hpp)$/i;
const MARKDOWN_EXTENSIONS = /\.(md|markdown)$/i;

/**
 * Determines the content type for a text file based on its extension
 * @param filename - The name of the file
 * @returns 'markdown' | 'code' | 'text'
 */
export function getTextFileContentType(filename: string): 'markdown' | 'code' | 'text' {
  if (MARKDOWN_EXTENSIONS.test(filename)) return 'markdown';
  if (CODE_EXTENSIONS.test(filename)) return 'code';
  return 'text';
}
