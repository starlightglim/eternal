import { create } from 'zustand';

interface ClipboardState {
  // Items currently in clipboard
  itemIds: string[];
  // Whether we're cutting (true) or copying (false)
  isCut: boolean;
  // Source parent folder (null = desktop root)
  sourceParentId: string | null;
}

interface ClipboardStore {
  clipboard: ClipboardState | null;

  // Actions
  cut: (itemIds: string[], sourceParentId: string | null) => void;
  copy: (itemIds: string[], sourceParentId: string | null) => void;
  clear: () => void;
  hasItems: () => boolean;
  isCutting: () => boolean;
}

export const useClipboardStore = create<ClipboardStore>((set, get) => ({
  clipboard: null,

  cut: (itemIds, sourceParentId) => {
    set({
      clipboard: {
        itemIds,
        isCut: true,
        sourceParentId,
      },
    });
  },

  copy: (itemIds, sourceParentId) => {
    set({
      clipboard: {
        itemIds,
        isCut: false,
        sourceParentId,
      },
    });
  },

  clear: () => {
    set({ clipboard: null });
  },

  hasItems: () => {
    const { clipboard } = get();
    return clipboard !== null && clipboard.itemIds.length > 0;
  },

  isCutting: () => {
    const { clipboard } = get();
    return clipboard?.isCut ?? false;
  },
}));
