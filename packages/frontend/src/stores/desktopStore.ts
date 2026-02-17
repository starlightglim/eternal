// Desktop state store for EternalOS
// Uses Cloudflare Workers API (or mock mode when API not configured)

import { create } from 'zustand';
import type { DesktopItem } from '../types';
import {
  isApiConfigured,
  createItem as apiCreateItem,
  updateItems as apiUpdateItems,
  deleteItem as apiDeleteItem,
  uploadFile as apiUploadFile,
  fetchDesktop as apiFetchDesktop,
} from '../services/api';
import { useAlertStore } from './alertStore';

// Helper to show errors via alertStore
const showError = (message: string, title?: string) => {
  useAlertStore.getState().showError(message, title);
};

interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface DesktopStore {
  items: DesktopItem[];
  selectedIds: Set<string>;
  uid: string | null; // Current user's uid
  loading: boolean;
  uploads: UploadProgress[]; // Active upload progress

  // Actions
  setItems: (items: DesktopItem[]) => void;
  setUid: (uid: string | null) => void;
  addItem: (item: DesktopItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<DesktopItem>) => void;
  moveItem: (id: string, position: { x: number; y: number }) => void;

  // Selection
  selectItem: (id: string, addToSelection?: boolean) => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;

  // Helpers
  getItemsByParent: (parentId: string | null) => DesktopItem[];
  getItem: (id: string) => DesktopItem | undefined;

  // Loading
  setLoading: (loading: boolean) => void;

  // Upload
  uploadFile: (
    file: File,
    parentId: string | null,
    position: { x: number; y: number }
  ) => Promise<DesktopItem | null>;
  clearUpload: (id: string) => void;

  // Fetch from API
  loadDesktop: () => Promise<void>;
}

// Mock data for demo mode (when API not configured)
const mockItems: DesktopItem[] = [
  {
    id: 'folder-documents',
    type: 'folder',
    name: 'Documents',
    parentId: null,
    position: { x: 0, y: 0 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'folder-images',
    type: 'folder',
    name: 'Images',
    parentId: null,
    position: { x: 0, y: 1 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'text-readme',
    type: 'text',
    name: 'ReadMe.txt',
    parentId: null,
    position: { x: 0, y: 2 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    textContent: 'Welcome to EternalOS!\n\nYour corner of the internet.',
  },
  {
    id: 'image-sample',
    type: 'image',
    name: 'Sample.png',
    parentId: null,
    position: { x: 1, y: 0 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mimeType: 'image/png',
  },
  {
    id: 'link-website',
    type: 'link',
    name: 'My Website',
    parentId: null,
    position: { x: 1, y: 1 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    url: 'https://example.com',
  },
  // Items inside Documents folder
  {
    id: 'text-notes',
    type: 'text',
    name: 'Notes.txt',
    parentId: 'folder-documents',
    position: { x: 0, y: 0 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    textContent: 'My personal notes...',
  },
];

// Debounce timers for position updates
const positionUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  // Use mock items when API is not configured
  items: isApiConfigured ? [] : mockItems,
  selectedIds: new Set<string>(),
  uid: null,
  loading: false,
  uploads: [],

  setItems: (items) => set({ items }),

  setUid: (uid) => set({ uid }),

  setLoading: (loading) => set({ loading }),

  addItem: (item) => {
    // Update local state
    set((state) => ({
      items: [...state.items, item],
    }));

    // Sync to API if configured
    if (isApiConfigured) {
      apiCreateItem(item).catch((error) => {
        console.error('Failed to create item:', error);
        showError(
          `Could not create "${item.name}". ${error instanceof Error ? error.message : 'Please try again.'}`,
          'Create Failed'
        );
      });
    }
  },

  removeItem: (id) => {
    // Update local state
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      selectedIds: new Set([...state.selectedIds].filter((sid) => sid !== id)),
    }));

    // Sync to API if configured
    if (isApiConfigured) {
      apiDeleteItem(id).catch((error) => {
        console.error('Failed to delete item:', error);
        showError(
          `Could not delete item. ${error instanceof Error ? error.message : 'Please try again.'}`,
          'Delete Failed'
        );
      });
    }
  },

  updateItem: (id, updates) => {
    // Update local state
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item
      ),
    }));

    // Sync to API if configured
    if (isApiConfigured) {
      apiUpdateItems([{ id, updates }]).catch((error) => {
        console.error('Failed to update item:', error);
      });
    }
  },

  moveItem: (id, position) => {
    // Update local state immediately for responsive UI
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, position, updatedAt: Date.now() } : item
      ),
    }));

    // Debounced sync to API (avoid excessive writes during drag)
    if (isApiConfigured) {
      // Clear any existing timer for this item
      const existingTimer = positionUpdateTimers.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set a new timer
      const timer = setTimeout(() => {
        apiUpdateItems([{ id, updates: { position } }]).catch((error) => {
          console.error('Failed to update position:', error);
        });
        positionUpdateTimers.delete(id);
      }, 500);

      positionUpdateTimers.set(id, timer);
    }
  },

  selectItem: (id, addToSelection = false) => {
    set((state) => {
      const newSelectedIds = addToSelection
        ? new Set([...state.selectedIds, id])
        : new Set([id]);
      return { selectedIds: newSelectedIds };
    });
  },

  deselectAll: () => set({ selectedIds: new Set() }),

  isSelected: (id) => get().selectedIds.has(id),

  getItemsByParent: (parentId) =>
    get().items.filter((item) => item.parentId === parentId),

  getItem: (id) => get().items.find((item) => item.id === id),

  uploadFile: async (file, parentId, position) => {
    if (!isApiConfigured) {
      console.warn('Upload not available in demo mode');
      return null;
    }

    // Create upload progress entry
    const uploadId = crypto.randomUUID();
    set((state) => ({
      uploads: [
        ...state.uploads,
        {
          id: uploadId,
          filename: file.name,
          progress: 0,
          status: 'uploading' as const,
        },
      ],
    }));

    try {
      // Upload file to API
      const result = await apiUploadFile(
        file,
        parentId,
        position,
        (progress) => {
          set((state) => ({
            uploads: state.uploads.map((u) =>
              u.id === uploadId ? { ...u, progress } : u
            ),
          }));
        }
      );

      // Mark upload complete
      set((state) => ({
        uploads: state.uploads.map((u) =>
          u.id === uploadId ? { ...u, progress: 100, status: 'complete' as const } : u
        ),
        // Add the uploaded item to local state
        items: [...state.items, result.item],
      }));

      // Auto-clear completed uploads after 3 seconds
      setTimeout(() => {
        get().clearUpload(uploadId);
      }, 3000);

      return result.item;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      // Mark upload as failed
      set((state) => ({
        uploads: state.uploads.map((u) =>
          u.id === uploadId
            ? {
                ...u,
                status: 'error' as const,
                error: errorMessage,
              }
            : u
        ),
      }));
      showError(
        `Could not upload "${file.name}". ${errorMessage}`,
        'Upload Failed'
      );
      return null;
    }
  },

  clearUpload: (id) => {
    set((state) => ({
      uploads: state.uploads.filter((u) => u.id !== id),
    }));
  },

  loadDesktop: async () => {
    if (!isApiConfigured) {
      // In demo mode, items are already set from mockItems
      return;
    }

    set({ loading: true });
    try {
      const response = await apiFetchDesktop();
      set({
        items: response.items,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load desktop:', error);
      set({ loading: false });
      showError(
        `Could not load your desktop. ${error instanceof Error ? error.message : 'Please try again.'}`,
        'Loading Failed'
      );
    }
  },
}));
