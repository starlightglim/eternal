import { create } from 'zustand';
import type { WindowState } from '../types';
import { useSoundStore } from './soundStore';

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

    set({
      windows: [...windows, newWindow],
      nextZIndex: nextZIndex + 1,
    });

    // Play window open sound
    useSoundStore.getState().playSound('windowOpen');
  },

  closeWindow: (id) => {
    // Play window close sound
    useSoundStore.getState().playSound('windowClose');

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

  toggleCollapse: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, collapsed: !w.collapsed } : w
      ),
    }));
  },

  toggleMaximize: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => {
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
      }),
    }));
  },

  updateWindowTitle: (id, title) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, title } : w
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
