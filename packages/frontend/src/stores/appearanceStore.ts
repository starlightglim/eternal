/**
 * Appearance Store for EternalOS
 *
 * Manages custom appearance settings that override the base theme:
 * - Accent color (selection, highlights, title bars)
 * - Desktop color (background behind icons)
 * - Window background color (content area inside windows)
 * - Font smoothing toggle
 *
 * These customizations layer ON TOP of the selected theme,
 * allowing users to personalize colors while keeping the theme's structure.
 */

import { create } from 'zustand';
import { updateProfile, isApiConfigured } from '../services/api';

export interface CustomAppearance {
  accentColor?: string; // Hex color, e.g., "#000080"
  desktopColor?: string; // Hex color for desktop background
  windowBgColor?: string; // Hex color for window content area
  fontSmoothing?: boolean; // Override theme's font smoothing
}

const APPEARANCE_STORAGE_KEY = 'eternalos-appearance';

/**
 * Calculate relative luminance of a hex color (WCAG formula)
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Determine if background is dark
 */
function isDarkColor(hex: string): boolean {
  return getLuminance(hex) < 0.4;
}

/**
 * Lighten or darken a hex color by a percentage
 */
function adjustColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const adjust = (c: number) => {
    const adjusted = Math.round(c + (percent > 0 ? (255 - c) : c) * (percent / 100));
    return Math.max(0, Math.min(255, adjusted));
  };

  const r = adjust(rgb.r);
  const g = adjust(rgb.g);
  const b = adjust(rgb.b);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate derived colors from accent color using HSL manipulation
 */
function deriveAccentColors(accentColor: string): {
  selection: string;
  selectionText: string;
  highlight: string;
  titleBarActive: string;
} {
  const rgb = hexToRgb(accentColor);
  if (!rgb) {
    return {
      selection: accentColor,
      selectionText: '#FFFFFF',
      highlight: adjustColor(accentColor, 30),
      titleBarActive: accentColor,
    };
  }

  // Selection is the accent color itself
  const selection = accentColor;

  // Selection text should contrast with accent
  const selectionText = isDarkColor(accentColor) ? '#FFFFFF' : '#000000';

  // Highlight is a lighter version for hover states
  const highlight = adjustColor(accentColor, 40);

  // Title bar active color
  const titleBarActive = accentColor;

  return {
    selection,
    selectionText,
    highlight,
    titleBarActive,
  };
}

/**
 * Apply custom appearance settings to the document
 * Exported for use in visitor mode (to apply owner's appearance)
 */
export function applyAppearance(appearance: CustomAppearance) {
  const root = document.documentElement;

  // Apply accent color and derived colors
  if (appearance.accentColor) {
    const derived = deriveAccentColors(appearance.accentColor);
    root.style.setProperty('--selection', derived.selection);
    root.style.setProperty('--selection-text', derived.selectionText);
    // Don't override highlight for now - it affects too many things
    // root.style.setProperty('--highlight', derived.highlight);
    root.style.setProperty('--accent', appearance.accentColor);
  }

  // Apply desktop color
  if (appearance.desktopColor) {
    root.style.setProperty('--custom-desktop-color', appearance.desktopColor);
    // Also set text colors for desktop based on desktop color
    const desktopTextColor = isDarkColor(appearance.desktopColor) ? '#FFFFFF' : '#000000';
    root.style.setProperty('--desktop-text-color', desktopTextColor);
  } else {
    root.style.removeProperty('--custom-desktop-color');
    root.style.removeProperty('--desktop-text-color');
  }

  // Apply window background color
  if (appearance.windowBgColor) {
    root.style.setProperty('--window-bg', appearance.windowBgColor);
    // Calculate text color for window content
    const windowTextColor = isDarkColor(appearance.windowBgColor) ? '#FFFFFF' : '#000000';
    const windowTextSecondary = isDarkColor(appearance.windowBgColor) ? '#CCCCCC' : '#666666';
    root.style.setProperty('--window-text-color', windowTextColor);
    root.style.setProperty('--window-text-secondary', windowTextSecondary);
  }

  // Apply font smoothing
  if (appearance.fontSmoothing !== undefined) {
    if (appearance.fontSmoothing) {
      document.body.style.setProperty('-webkit-font-smoothing', 'antialiased');
      document.body.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
    } else {
      document.body.style.setProperty('-webkit-font-smoothing', 'none');
      document.body.style.setProperty('-moz-osx-font-smoothing', 'unset');
    }
  }
}

/**
 * Clear all custom appearance settings from the document
 * Used when leaving visitor mode to restore the user's own appearance
 */
export function clearAppearance() {
  const root = document.documentElement;

  // Clear accent color properties
  root.style.removeProperty('--selection');
  root.style.removeProperty('--selection-text');
  root.style.removeProperty('--accent');

  // Clear desktop color properties
  root.style.removeProperty('--custom-desktop-color');
  root.style.removeProperty('--desktop-text-color');

  // Clear window background properties
  root.style.removeProperty('--window-bg');
  root.style.removeProperty('--window-text-color');
  root.style.removeProperty('--window-text-secondary');

  // Clear font smoothing
  document.body.style.removeProperty('-webkit-font-smoothing');
  document.body.style.removeProperty('-moz-osx-font-smoothing');
}

/**
 * Load saved appearance from localStorage
 */
function loadSavedAppearance(): CustomAppearance {
  try {
    const saved = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore localStorage errors
  }
  return {};
}

/**
 * Save appearance to localStorage
 */
function saveLocalAppearance(appearance: CustomAppearance) {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Ignore localStorage errors
  }
}

interface AppearanceStore {
  appearance: CustomAppearance;
  originalAppearance: CustomAppearance; // For tracking changes
  isLoading: boolean;
  hasUnsavedChanges: boolean;

  // Actions
  setAccentColor: (color: string) => void;
  setDesktopColor: (color: string) => void;
  setWindowBgColor: (color: string) => void;
  setFontSmoothing: (enabled: boolean) => void;
  resetAppearance: () => void;
  saveAppearance: () => Promise<void>;
  loadAppearance: (appearance: CustomAppearance) => void;
}

export const useAppearanceStore = create<AppearanceStore>((set, get) => {
  // Load initial appearance
  const initialAppearance = loadSavedAppearance();

  // Apply initial appearance after a microtask
  queueMicrotask(() => {
    applyAppearance(initialAppearance);
  });

  return {
    appearance: initialAppearance,
    originalAppearance: initialAppearance,
    isLoading: false,
    hasUnsavedChanges: false,

    setAccentColor: (color: string) => {
      const newAppearance = { ...get().appearance, accentColor: color };
      applyAppearance(newAppearance);
      set({
        appearance: newAppearance,
        hasUnsavedChanges: true,
      });
    },

    setDesktopColor: (color: string) => {
      const newAppearance = { ...get().appearance, desktopColor: color };
      applyAppearance(newAppearance);
      set({
        appearance: newAppearance,
        hasUnsavedChanges: true,
      });
    },

    setWindowBgColor: (color: string) => {
      const newAppearance = { ...get().appearance, windowBgColor: color };
      applyAppearance(newAppearance);
      set({
        appearance: newAppearance,
        hasUnsavedChanges: true,
      });
    },

    setFontSmoothing: (enabled: boolean) => {
      const newAppearance = { ...get().appearance, fontSmoothing: enabled };
      applyAppearance(newAppearance);
      set({
        appearance: newAppearance,
        hasUnsavedChanges: true,
      });
    },

    resetAppearance: () => {
      const defaultAppearance: CustomAppearance = {};

      // Remove custom CSS properties
      const root = document.documentElement;
      root.style.removeProperty('--selection');
      root.style.removeProperty('--selection-text');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--custom-desktop-color');
      root.style.removeProperty('--desktop-text-color');
      root.style.removeProperty('--window-bg');
      root.style.removeProperty('--window-text-color');
      root.style.removeProperty('--window-text-secondary');

      // Reset font smoothing to theme default
      document.body.style.removeProperty('-webkit-font-smoothing');
      document.body.style.removeProperty('-moz-osx-font-smoothing');

      set({
        appearance: defaultAppearance,
        hasUnsavedChanges: true,
      });
    },

    saveAppearance: async () => {
      const { appearance } = get();

      set({ isLoading: true });

      try {
        // Save to localStorage
        saveLocalAppearance(appearance);

        // Save to backend if API is configured
        if (isApiConfigured) {
          await updateProfile({
            accentColor: appearance.accentColor,
            desktopColor: appearance.desktopColor,
            windowBgColor: appearance.windowBgColor,
            fontSmoothing: appearance.fontSmoothing,
          });
        }

        set({
          originalAppearance: appearance,
          hasUnsavedChanges: false,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to save appearance:', error);
        set({ isLoading: false });
        throw error;
      }
    },

    loadAppearance: (appearance: CustomAppearance) => {
      applyAppearance(appearance);
      saveLocalAppearance(appearance);
      set({
        appearance,
        originalAppearance: appearance,
        hasUnsavedChanges: false,
      });
    },
  };
});
