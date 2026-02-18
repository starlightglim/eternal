import { create } from 'zustand';
import type { WindowState } from '../types';
import { useSoundStore } from './soundStore';

const WINDOW_STATE_KEY = 'eternalos-window-state';

// Types that require a valid desktop item to exist
const CONTENT_DEPENDENT_TYPES = ['folder', 'image', 'text', 'markdown', 'code', 'audio', 'video', 'pdf', 'get-info', 'widget'];

// Debounce helper
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(windows: WindowState[], nextZIndex: number) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    try {
      const state = { windows, nextZIndex };
      localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save window state:', e);
    }
  }, 300); // 300ms debounce
}

interface WindowStore {
  windows: WindowState[];
  nextZIndex: number;

  // Actions
  openWindow: (window: Omit<WindowState, 'zIndex'>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, position: { x: number; y: number }) => void;
  resizeWindow: (id: string, size: { width: number; height: number }) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleCollapse: (id: string) => void;
  toggleMaximize: (id: string) => void;
  updateWindowTitle: (id: string, title: string) => void;
  getTopWindow: () => WindowState | undefined;

  // Persistence
  loadWindowState: (validItemIds?: Set<string>) => void;
  clearWindowState: () => void;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  nextZIndex: 1,

  openWindow: (windowData) => {
    const { nextZIndex, windows } = get();
    const existingWindow = windows.find((w) => w.id === windowData.id);

    if (existingWindow) {
      // If window already exists, just focus it and uncollapse it
      get().focusWindow(windowData.id);
      if (existingWindow.collapsed) {
        get().toggleCollapse(windowData.id);
      }
      return;
    }

    const newWindow: WindowState = {
      ...windowData,
      zIndex: nextZIndex,
      collapsed: false,
    };

    const newWindows = [...windows, newWindow];
    const newNextZIndex = nextZIndex + 1;

    set({
      windows: newWindows,
      nextZIndex: newNextZIndex,
    });

    // Play window open sound
    useSoundStore.getState().playSound('windowOpen');

    // Save to localStorage (debounced)
    debouncedSave(newWindows, newNextZIndex);
  },

  closeWindow: (id) => {
    // Play window close sound
    useSoundStore.getState().playSound('windowClose');

    const newWindows = get().windows.filter((w) => w.id !== id);

    set({ windows: newWindows });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, get().nextZIndex);
  },

  focusWindow: (id) => {
    const { windows, nextZIndex } = get();
    const windowToFocus = windows.find((w) => w.id === id);

    if (!windowToFocus) return;

    // Check if already the top window
    const maxZ = Math.max(...windows.map((w) => w.zIndex));
    if (windowToFocus.zIndex === maxZ) return;

    const newWindows = windows.map((w) =>
      w.id === id ? { ...w, zIndex: nextZIndex } : w
    );
    const newNextZIndex = nextZIndex + 1;

    set({
      windows: newWindows,
      nextZIndex: newNextZIndex,
    });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, newNextZIndex);
  },

  moveWindow: (id, position) => {
    const newWindows = get().windows.map((w) =>
      w.id === id ? { ...w, position } : w
    );

    set({ windows: newWindows });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, get().nextZIndex);
  },

  resizeWindow: (id, size) => {
    // Enforce minimum size constraints
    const constrainedSize = {
      width: Math.max(size.width, 200),
      height: Math.max(size.height, 150),
    };

    const newWindows = get().windows.map((w) =>
      w.id === id ? { ...w, size: constrainedSize } : w
    );

    set({ windows: newWindows });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, get().nextZIndex);
  },

  minimizeWindow: (id) => {
    const newWindows = get().windows.map((w) =>
      w.id === id ? { ...w, minimized: true } : w
    );

    set({ windows: newWindows });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, get().nextZIndex);
  },

  restoreWindow: (id) => {
    const newWindows = get().windows.map((w) =>
      w.id === id ? { ...w, minimized: false } : w
    );

    set({ windows: newWindows });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, get().nextZIndex);
  },

  toggleCollapse: (id) => {
    const newWindows = get().windows.map((w) =>
      w.id === id ? { ...w, collapsed: !w.collapsed } : w
    );

    set({ windows: newWindows });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, get().nextZIndex);
  },

  toggleMaximize: (id) => {
    const newWindows = get().windows.map((w) => {
      if (w.id !== id) return w;

      if (w.maximized) {
        // Restore to pre-maximized state
        return {
          ...w,
          maximized: false,
          position: w.preMaximizedPosition || w.position,
          size: w.preMaximizedSize || w.size,
          preMaximizedPosition: undefined,
          preMaximizedSize: undefined,
        };
      } else {
        // Maximize - fill screen below menu bar (20px)
        const menuBarHeight = 20;
        return {
          ...w,
          maximized: true,
          preMaximizedPosition: w.position,
          preMaximizedSize: w.size,
          position: { x: 0, y: menuBarHeight },
          size: {
            width: window.innerWidth,
            height: window.innerHeight - menuBarHeight,
          },
        };
      }
    });

    set({ windows: newWindows });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, get().nextZIndex);
  },

  updateWindowTitle: (id, title) => {
    const newWindows = get().windows.map((w) =>
      w.id === id ? { ...w, title } : w
    );

    set({ windows: newWindows });

    // Save to localStorage (debounced)
    debouncedSave(newWindows, get().nextZIndex);
  },

  getTopWindow: () => {
    const { windows } = get();
    if (windows.length === 0) return undefined;

    const visibleWindows = windows.filter((w) => !w.minimized);
    if (visibleWindows.length === 0) return undefined;

    return visibleWindows.reduce((top, w) =>
      w.zIndex > top.zIndex ? w : top
    );
  },

  loadWindowState: (validItemIds?: Set<string>) => {
    try {
      const saved = localStorage.getItem(WINDOW_STATE_KEY);
      if (!saved) return;

      const { windows, nextZIndex } = JSON.parse(saved) as {
        windows: WindowState[];
        nextZIndex: number;
      };

      // Filter out windows that depend on items that no longer exist
      const validWindows = windows.filter((w) => {
        // Content-dependent windows need their item to still exist
        if (CONTENT_DEPENDENT_TYPES.includes(w.contentType)) {
          if (!w.contentId) return false;
          if (validItemIds && !validItemIds.has(w.contentId)) return false;
        }
        return true;
      });

      // Adjust positions if viewport has changed
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuBarHeight = 20;

      const adjustedWindows = validWindows.map((w) => {
        let { position, size } = w;

        // Ensure window is not off-screen
        if (position.x < 0) position = { ...position, x: 0 };
        if (position.y < menuBarHeight) position = { ...position, y: menuBarHeight };
        if (position.x + size.width > viewportWidth) {
          position = { ...position, x: Math.max(0, viewportWidth - size.width) };
        }
        if (position.y + size.height > viewportHeight) {
          position = { ...position, y: Math.max(menuBarHeight, viewportHeight - size.height) };
        }

        // If maximized, recalculate to current viewport size
        if (w.maximized) {
          return {
            ...w,
            position: { x: 0, y: menuBarHeight },
            size: {
              width: viewportWidth,
              height: viewportHeight - menuBarHeight,
            },
          };
        }

        return { ...w, position };
      });

      set({
        windows: adjustedWindows,
        nextZIndex: Math.max(nextZIndex, adjustedWindows.length + 1),
      });
    } catch (e) {
      console.warn('Failed to load window state:', e);
      // Clear corrupted state
      localStorage.removeItem(WINDOW_STATE_KEY);
    }
  },

  clearWindowState: () => {
    localStorage.removeItem(WINDOW_STATE_KEY);
    set({ windows: [], nextZIndex: 1 });
  },
}));
