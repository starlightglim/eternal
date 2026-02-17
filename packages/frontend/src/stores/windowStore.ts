import { create } from 'zustand';
import type { WindowState } from '../types';

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
  getTopWindow: () => WindowState | undefined;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  nextZIndex: 1,

  openWindow: (windowData) => {
    const { nextZIndex, windows } = get();
    const existingWindow = windows.find((w) => w.id === windowData.id);

    if (existingWindow) {
      // If window already exists, just focus it
      get().focusWindow(windowData.id);
      return;
    }

    const newWindow: WindowState = {
      ...windowData,
      zIndex: nextZIndex,
    };

    set({
      windows: [...windows, newWindow],
      nextZIndex: nextZIndex + 1,
    });
  },

  closeWindow: (id) => {
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
    }));
  },

  focusWindow: (id) => {
    const { windows, nextZIndex } = get();
    const windowToFocus = windows.find((w) => w.id === id);

    if (!windowToFocus) return;

    // Check if already the top window
    const maxZ = Math.max(...windows.map((w) => w.zIndex));
    if (windowToFocus.zIndex === maxZ) return;

    set({
      windows: windows.map((w) =>
        w.id === id ? { ...w, zIndex: nextZIndex } : w
      ),
      nextZIndex: nextZIndex + 1,
    });
  },

  moveWindow: (id, position) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, position } : w
      ),
    }));
  },

  resizeWindow: (id, size) => {
    // Enforce minimum size constraints
    const constrainedSize = {
      width: Math.max(size.width, 200),
      height: Math.max(size.height, 150),
    };

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, size: constrainedSize } : w
      ),
    }));
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w
      ),
    }));
  },

  restoreWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: false } : w
      ),
    }));
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
}));
