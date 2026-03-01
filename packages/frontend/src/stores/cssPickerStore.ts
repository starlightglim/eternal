/**
 * CSS Picker Store - State for the CSS Element Picker overlay
 *
 * Manages activation state and provides a callback for the CSSEditor
 * to receive the chosen selector when the user picks an element.
 */

import { create } from 'zustand';

interface CSSPickerState {
  /** Whether the picker overlay is active */
  isActive: boolean;
  /** Callback set by CSSEditor to receive the chosen selector */
  onSelectorChosen: ((selector: string) => void) | null;
  /** Activate the picker with a callback */
  activate: (onChosen: (selector: string) => void) => void;
  /** Deactivate the picker */
  deactivate: () => void;
}

export const useCSSPickerStore = create<CSSPickerState>((set) => ({
  isActive: false,
  onSelectorChosen: null,

  activate: (onChosen) =>
    set({
      isActive: true,
      onSelectorChosen: onChosen,
    }),

  deactivate: () =>
    set({
      isActive: false,
      onSelectorChosen: null,
    }),
}));
