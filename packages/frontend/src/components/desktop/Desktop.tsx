import { useCallback, useRef, useState, useEffect } from 'react';
import { WindowManager } from '../window';
import { DesktopIcon, Trash, AssistantDesktopIcon } from '../icons';
import { MenuBar } from '../menubar';
import { UploadProgress } from './UploadProgress';
import { LoadingOverlay, ContextMenu, type ContextMenuItem } from '../ui';
import { useWindowStore } from '../../stores/windowStore';
import { useDesktopStore } from '../../stores/desktopStore';
import { useAuthStore } from '../../stores/authStore';
import { useDesktopSync } from '../../hooks/useDesktopSync';
import { isApiConfigured } from '../../services/api';
import type { DesktopItem } from '../../types';
import styles from './Desktop.module.css';

// Available wallpaper patterns
export const WALLPAPER_OPTIONS = [
  { id: 'default', name: 'Default (Platinum)' },
  { id: 'diagonal', name: 'Diagonal Lines' },
  { id: 'checkerboard', name: 'Checkerboard' },
  { id: 'denim', name: 'Denim' },
  { id: 'crosshatch', name: 'Crosshatch' },
  { id: 'dots', name: 'Polka Dots' },
  { id: 'lines', name: 'Horizontal Lines' },
  { id: 'brick', name: 'Brick' },
  { id: 'weave', name: 'Weave' },
  { id: 'navy', name: 'Navy Blue' },
  { id: 'teal', name: 'Teal' },
  { id: 'purple', name: 'Purple' },
  { id: 'forest', name: 'Forest Green' },
] as const;

export type WallpaperId = typeof WALLPAPER_OPTIONS[number]['id'];

const GRID_CELL_SIZE = 80; // 80x80 pixel grid cells

interface DesktopProps {
  isVisitorMode?: boolean;
}

/**
 * Desktop component - the main surface of EternalOS
 * Full viewport #C0C0C0 background that holds all windows and icons
 */
export function Desktop({ isVisitorMode = false }: DesktopProps) {
  // Sync desktop state with Firestore (if Firebase is enabled)
  useDesktopSync();

  const { openWindow, windows, focusWindow } = useWindowStore();
  const { profile } = useAuthStore();
  const {
    items,
    selectedIds,
    selectItem,
    deselectAll,
    moveItem,
    getItemsByParent,
    removeItem,
    uploadFile,
    loadDesktop,
    loading,
    cleanUp,
    selectAll,
  } = useDesktopStore();

  // Load desktop from API on mount (if API is configured)
  useEffect(() => {
    if (isApiConfigured && !isVisitorMode) {
      loadDesktop();
    }
  }, [loadDesktop, isVisitorMode]);

  // Show Welcome window on first visit
  useEffect(() => {
    if (isVisitorMode) return;

    const hasSeenWelcome = localStorage.getItem('eternalos-welcome-seen');
    if (!hasSeenWelcome) {
      // Open the Welcome ReadMe window
      openWindow({
        id: 'welcome-readme',
        title: 'Read Me',
        position: { x: 80, y: 60 },
        size: { width: 380, height: 400 },
        minimized: false,
        maximized: false,
        contentType: 'welcome',
      });
      localStorage.setItem('eternalos-welcome-seen', 'true');
    }
  }, [isVisitorMode, openWindow]);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragItemStartGridPos = useRef<{ x: number; y: number } | null>(null);
  const hasDragged = useRef(false);
  const rafId = useRef<number | null>(null); // For requestAnimationFrame throttling
  // Multi-select drag: store starting positions of all selected items
  const draggedItemsStartPos = useRef<Map<string, { x: number; y: number }> | null>(null);

  // Trash state
  const [trashSelected, setTrashSelected] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [trashedItemCount, setTrashedItemCount] = useState(0);

  // Assistant icon state
  const [assistantSelected, setAssistantSelected] = useState(false);

  // File drag-drop state
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    targetItem: DesktopItem | null;
  } | null>(null);

  // Folder drop target state (for drag-to-folder)
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null);

  // Selection rectangle state (for marquee select)
  const [selectionRect, setSelectionRect] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const isSelectingRef = useRef(false);

  // Get root-level items (parentId === null)
  const rootItems = getItemsByParent(null);

  // Check if position is occupied by another item
  const isPositionOccupied = useCallback(
    (x: number, y: number, excludeId?: string) => {
      return rootItems.some(
        (item) =>
          item.id !== excludeId &&
          item.position.x === x &&
          item.position.y === y
      );
    },
    [rootItems]
  );

  // Find nearest available grid position
  const findNearestAvailablePosition = useCallback(
    (targetX: number, targetY: number, excludeId?: string): { x: number; y: number } => {
      // First check if target position is available
      if (!isPositionOccupied(targetX, targetY, excludeId)) {
        return { x: targetX, y: targetY };
      }

      // Search in expanding rings for available position
      for (let ring = 1; ring < 20; ring++) {
        for (let dx = -ring; dx <= ring; dx++) {
          for (let dy = -ring; dy <= ring; dy++) {
            if (Math.abs(dx) === ring || Math.abs(dy) === ring) {
              const newX = targetX + dx;
              const newY = targetY + dy;
              if (newX >= 0 && newY >= 0 && !isPositionOccupied(newX, newY, excludeId)) {
                return { x: newX, y: newY };
              }
            }
          }
        }
      }

      // Fallback to target position
      return { x: targetX, y: targetY };
    },
    [isPositionOccupied]
  );

  // Click on empty desktop area - deselect all
  const handleDesktopClick = useCallback(
    (e: React.MouseEvent) => {
      // Only if clicking directly on desktop, not on an icon
      if (e.target === e.currentTarget) {
        deselectAll();
        setTrashSelected(false);
        setAssistantSelected(false);
      }
    },
    [deselectAll]
  );

  // Icon selection
  const handleIconSelect = useCallback(
    (id: string, addToSelection: boolean) => {
      selectItem(id, addToSelection);
      setTrashSelected(false);
      setAssistantSelected(false);
    },
    [selectItem]
  );

  // Icon double-click - open window
  const handleIconDoubleClick = useCallback(
    (item: DesktopItem) => {
      if (item.type === 'folder') {
        openWindow({
          id: `folder-${item.id}`,
          title: item.name,
          position: { x: 100 + Math.random() * 100, y: 100 + Math.random() * 100 },
          size: { width: 400, height: 300 },
          minimized: false,
          maximized: false,
          contentType: 'folder',
          contentId: item.id,
        });
      } else if (item.type === 'text') {
        openWindow({
          id: `text-${item.id}`,
          title: item.name,
          position: { x: 150 + Math.random() * 100, y: 120 + Math.random() * 100 },
          size: { width: 400, height: 300 },
          minimized: false,
          maximized: false,
          contentType: 'text',
          contentId: item.id,
        });
      } else if (item.type === 'image') {
        openWindow({
          id: `image-${item.id}`,
          title: item.name,
          position: { x: 120 + Math.random() * 100, y: 80 + Math.random() * 100 },
          size: { width: 450, height: 350 },
          minimized: false,
          maximized: false,
          contentType: 'image',
          contentId: item.id,
        });
      } else if (item.type === 'link' && item.url) {
        // Open link in new tab
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    },
    [openWindow]
  );

  // Drag start
  const handleDragStart = useCallback(
    (id: string, e: React.PointerEvent) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      setDraggingId(id);
      hasDragged.current = false;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      dragItemStartGridPos.current = { x: item.position.x, y: item.position.y };

      // Store starting positions of all selected items for multi-select drag
      const selectedArray = Array.from(selectedIds);
      if (selectedArray.length > 1 && selectedArray.includes(id)) {
        // Multi-select drag: store all selected items' positions
        const posMap = new Map<string, { x: number; y: number }>();
        selectedArray.forEach((itemId) => {
          const selectedItem = items.find((i) => i.id === itemId);
          if (selectedItem) {
            posMap.set(itemId, { x: selectedItem.position.x, y: selectedItem.position.y });
          }
        });
        draggedItemsStartPos.current = posMap;
      } else {
        draggedItemsStartPos.current = null;
      }

      // Initial visual position in pixels
      setDragOffset({
        x: item.position.x * GRID_CELL_SIZE,
        y: item.position.y * GRID_CELL_SIZE,
      });
    },
    [items, selectedIds]
  );

  // Drag move - throttled with requestAnimationFrame for smooth performance
  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !dragStartPos.current || !dragItemStartGridPos.current) return;

      // Capture values immediately (events are pooled in React)
      const clientX = e.clientX;
      const clientY = e.clientY;

      // Cancel any pending animation frame
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      // Schedule state update for next frame
      rafId.current = requestAnimationFrame(() => {
        const deltaX = clientX - dragStartPos.current!.x;
        const deltaY = clientY - dragStartPos.current!.y;

        // Check if we've actually dragged (threshold of 5px)
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          hasDragged.current = true;
        }

        // Calculate new visual position
        const startPixelX = dragItemStartGridPos.current!.x * GRID_CELL_SIZE;
        const startPixelY = dragItemStartGridPos.current!.y * GRID_CELL_SIZE;

        setDragOffset({
          x: startPixelX + deltaX,
          y: startPixelY + deltaY,
        });

        // Check if over trash
        const trashRect = document.querySelector('[data-trash]')?.getBoundingClientRect();
        if (trashRect) {
          const isOverTrash =
            clientX >= trashRect.left &&
            clientX <= trashRect.right &&
            clientY >= trashRect.top &&
            clientY <= trashRect.bottom;
          setIsDropTarget(isOverTrash);
        }

        // Check if over a folder icon (for drag-to-folder)
        let foundFolderTarget: string | null = null;
        for (const item of rootItems) {
          // Skip if dragging over itself or non-folders
          if (item.id === draggingId || item.type !== 'folder') continue;

          // Calculate folder's pixel bounds
          const folderX = item.position.x * GRID_CELL_SIZE;
          const folderY = item.position.y * GRID_CELL_SIZE;
          const desktopEl = document.querySelector('[data-desktop]');
          if (desktopEl) {
            const desktopRect = desktopEl.getBoundingClientRect();
            const folderLeft = desktopRect.left + folderX;
            const folderTop = desktopRect.top + folderY;
            const folderRight = folderLeft + GRID_CELL_SIZE;
            const folderBottom = folderTop + GRID_CELL_SIZE;

            if (
              clientX >= folderLeft &&
              clientX <= folderRight &&
              clientY >= folderTop &&
              clientY <= folderBottom
            ) {
              foundFolderTarget = item.id;
              break;
            }
          }
        }
        setFolderDropTargetId(foundFolderTarget);

        rafId.current = null;
      });
    },
    [draggingId, rootItems]
  );

  // Drag end
  const handleDragEnd = useCallback(
    (e: React.PointerEvent) => {
      // Cancel any pending animation frame
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }

      if (!draggingId || !dragItemStartGridPos.current) {
        setDraggingId(null);
        setDragOffset(null);
        setIsDropTarget(false);
        setFolderDropTargetId(null);
        return;
      }

      // Determine which items are being dragged (multi-select or single)
      const isDraggingMultiple = draggedItemsStartPos.current && draggedItemsStartPos.current.size > 1;
      const draggedItemIds = isDraggingMultiple
        ? Array.from(draggedItemsStartPos.current!.keys())
        : [draggingId];

      // Check if dropped on trash
      const trashRect = document.querySelector('[data-trash]')?.getBoundingClientRect();
      if (trashRect) {
        const isOverTrash =
          e.clientX >= trashRect.left &&
          e.clientX <= trashRect.right &&
          e.clientY >= trashRect.top &&
          e.clientY <= trashRect.bottom;

        if (isOverTrash && hasDragged.current) {
          // Move all dragged items to trash
          setTrashedItemCount((c) => c + draggedItemIds.length);
          draggedItemIds.forEach((id) => removeItem(id));
          setDraggingId(null);
          setDragOffset(null);
          setIsDropTarget(false);
          setFolderDropTargetId(null);
          draggedItemsStartPos.current = null;
          return;
        }
      }

      // Check if dropped on a folder (move into folder)
      if (folderDropTargetId && hasDragged.current) {
        const { updateItem } = useDesktopStore.getState();
        // Move all dragged items into the folder
        draggedItemIds.forEach((id, index) => {
          updateItem(id, { parentId: folderDropTargetId, position: { x: index % 8, y: Math.floor(index / 8) } });
        });
        setDraggingId(null);
        setDragOffset(null);
        setIsDropTarget(false);
        setFolderDropTargetId(null);
        draggedItemsStartPos.current = null;
        return;
      }

      // Calculate new grid positions if we actually dragged
      if (hasDragged.current && dragOffset && dragItemStartGridPos.current) {
        // Calculate delta in grid units
        const deltaGridX = Math.round(dragOffset.x / GRID_CELL_SIZE) - dragItemStartGridPos.current.x;
        const deltaGridY = Math.round(dragOffset.y / GRID_CELL_SIZE) - dragItemStartGridPos.current.y;

        if (isDraggingMultiple) {
          // Move all selected items by the same delta
          draggedItemIds.forEach((id) => {
            const startPos = draggedItemsStartPos.current!.get(id);
            if (startPos) {
              let newX = Math.max(0, startPos.x + deltaGridX);
              let newY = Math.max(0, startPos.y + deltaGridY);
              // Note: We don't check for overlaps between selected items themselves
              moveItem(id, { x: newX, y: newY });
            }
          });
        } else {
          // Single item drag - use existing logic
          let newGridX = Math.round(dragOffset.x / GRID_CELL_SIZE);
          let newGridY = Math.round(dragOffset.y / GRID_CELL_SIZE);
          newGridX = Math.max(0, newGridX);
          newGridY = Math.max(0, newGridY);
          const finalPos = findNearestAvailablePosition(newGridX, newGridY, draggingId);
          moveItem(draggingId, finalPos);
        }
      }

      setDraggingId(null);
      setDragOffset(null);
      setIsDropTarget(false);
      setFolderDropTargetId(null);
      draggedItemsStartPos.current = null;
    },
    [draggingId, dragOffset, moveItem, removeItem, findNearestAvailablePosition, folderDropTargetId]
  );

  // Trash handlers
  const handleTrashSelect = useCallback(() => {
    deselectAll();
    setTrashSelected(true);
    setAssistantSelected(false);
  }, [deselectAll]);

  const handleTrashDoubleClick = useCallback(() => {
    // Open trash window (shows trashed items)
    openWindow({
      id: 'trash-window',
      title: 'Trash',
      position: { x: 200, y: 150 },
      size: { width: 300, height: 250 },
      minimized: false,
      maximized: false,
      contentType: 'folder',
      contentId: 'trash',
    });
  }, [openWindow]);

  const handleTrashDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(true);
  }, []);

  const handleTrashDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    // Handle HTML5 drag drop if needed
  }, []);

  // Assistant handlers
  const handleAssistantSelect = useCallback(() => {
    deselectAll();
    setTrashSelected(false);
    setAssistantSelected(true);
  }, [deselectAll]);

  const handleAssistantDoubleClick = useCallback(() => {
    // Open Desk Assistant window
    openWindow({
      id: 'desk-assistant',
      title: 'Desk Assistant',
      position: { x: 100, y: 80 },
      size: { width: 500, height: 400 },
      minimized: false,
      maximized: false,
      contentType: 'assistant',
    });
  }, [openWindow]);

  // Selection rectangle handlers (marquee select)
  const handleSelectionStart = useCallback(
    (e: React.PointerEvent) => {
      // Only start selection if clicking directly on desktop (not on icons)
      if (e.target !== e.currentTarget) return;
      if (e.button !== 0) return; // Only left click
      if (isVisitorMode) return;

      const desktopRect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - desktopRect.left;
      const y = e.clientY - desktopRect.top;

      isSelectingRef.current = true;
      setSelectionRect({ startX: x, startY: y, currentX: x, currentY: y });

      // Deselect all unless shift is held
      if (!e.shiftKey) {
        deselectAll();
      }

      // Capture pointer for smooth selection outside bounds
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isVisitorMode, deselectAll]
  );

  const handleSelectionMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isSelectingRef.current || !selectionRect) return;

      const desktopRect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - desktopRect.left;
      const y = e.clientY - desktopRect.top;

      setSelectionRect((prev) =>
        prev ? { ...prev, currentX: x, currentY: y } : null
      );
    },
    [selectionRect]
  );

  const handleSelectionEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!isSelectingRef.current || !selectionRect) {
        isSelectingRef.current = false;
        setSelectionRect(null);
        return;
      }

      // Calculate selection bounds
      const left = Math.min(selectionRect.startX, selectionRect.currentX);
      const right = Math.max(selectionRect.startX, selectionRect.currentX);
      const top = Math.min(selectionRect.startY, selectionRect.currentY);
      const bottom = Math.max(selectionRect.startY, selectionRect.currentY);

      // Only select if we've dragged a meaningful distance
      if (right - left > 5 || bottom - top > 5) {
        // Find items within selection bounds
        const itemsToSelect: string[] = [];
        rootItems.forEach((item) => {
          const itemLeft = item.position.x * GRID_CELL_SIZE;
          const itemTop = item.position.y * GRID_CELL_SIZE;
          const itemRight = itemLeft + GRID_CELL_SIZE;
          const itemBottom = itemTop + GRID_CELL_SIZE;

          // Check if item overlaps with selection rectangle
          if (
            itemLeft < right &&
            itemRight > left &&
            itemTop < bottom &&
            itemBottom > top
          ) {
            itemsToSelect.push(item.id);
          }
        });

        // Select all items in the rectangle
        if (itemsToSelect.length > 0) {
          itemsToSelect.forEach((id, index) => {
            selectItem(id, index > 0 || e.shiftKey); // Add to existing selection
          });
        }
      }

      isSelectingRef.current = false;
      setSelectionRect(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [selectionRect, rootItems, selectItem]
  );

  // In visitor mode, disable drag and drop
  const dragStartHandler = isVisitorMode ? undefined : handleDragStart;
  const dragMoveHandler = isVisitorMode ? undefined : handleDragMove;
  const dragEndHandler = isVisitorMode ? undefined : handleDragEnd;

  // File drag-drop handlers (for uploading files from OS)
  const handleFileDragOver = useCallback(
    (e: React.DragEvent) => {
      if (isVisitorMode || !isApiConfigured) return;
      e.preventDefault();
      e.stopPropagation();

      // Check if we're dragging files
      if (e.dataTransfer.types.includes('Files')) {
        setIsFileDragOver(true);
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    [isVisitorMode]
  );

  const handleFileDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only set false if we're leaving the desktop entirely
      const rect = e.currentTarget.getBoundingClientRect();
      if (
        e.clientX <= rect.left ||
        e.clientX >= rect.right ||
        e.clientY <= rect.top ||
        e.clientY >= rect.bottom
      ) {
        setIsFileDragOver(false);
      }
    },
    []
  );

  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      if (isVisitorMode || !isApiConfigured) return;
      e.preventDefault();
      e.stopPropagation();
      setIsFileDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Calculate grid position from drop location
      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      const gridX = Math.floor(dropX / GRID_CELL_SIZE);
      const gridY = Math.floor(dropY / GRID_CELL_SIZE);

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const position = findNearestAvailablePosition(gridX, gridY + i);
        await uploadFile(file, null, position);
      }
    },
    [isVisitorMode, uploadFile, findNearestAvailablePosition]
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Keyboard navigation for desktop icons
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if focus is in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle Cmd+Tab to cycle through open windows
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault();
        const visibleWindows = windows.filter((w) => !w.minimized);
        if (visibleWindows.length > 1) {
          // Sort by z-index to find current top window
          const sortedWindows = [...visibleWindows].sort((a, b) => b.zIndex - a.zIndex);
          // Focus the next window (wraps around)
          const currentTopIndex = 0; // Top window is first after sorting
          const nextIndex = e.shiftKey
            ? (currentTopIndex - 1 + sortedWindows.length) % sortedWindows.length
            : (currentTopIndex + 1) % sortedWindows.length;
          focusWindow(sortedWindows[nextIndex].id);
        }
        return;
      }

      // Handle Tab to cycle through desktop icons (no modifier keys)
      if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (rootItems.length === 0) return;

        const selectedArray = Array.from(selectedIds);
        if (selectedArray.length === 0) {
          // No selection, select first item
          selectItem(rootItems[0].id, false);
        } else {
          // Find current selection in sorted items list and move to next
          const sortedItems = [...rootItems].sort((a, b) => {
            // Sort by position: top-to-bottom, then left-to-right
            if (a.position.y !== b.position.y) return a.position.y - b.position.y;
            return a.position.x - b.position.x;
          });
          const currentIndex = sortedItems.findIndex((i) => selectedArray.includes(i.id));
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + sortedItems.length) % sortedItems.length
            : (currentIndex + 1) % sortedItems.length;
          selectItem(sortedItems[nextIndex].id, false);
        }
        return;
      }

      // Get currently selected items
      const selectedArray = Array.from(selectedIds);
      if (selectedArray.length === 0 && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        return;
      }

      // Handle Enter to open selected item
      if (e.key === 'Enter' && selectedArray.length === 1) {
        const item = rootItems.find((i) => i.id === selectedArray[0]);
        if (item) {
          e.preventDefault();
          handleIconDoubleClick(item);
        }
        return;
      }

      // Handle Escape to deselect
      if (e.key === 'Escape') {
        deselectAll();
        setContextMenu(null);
        return;
      }

      // Handle Delete/Backspace to trash selected items
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedArray.length > 0) {
        e.preventDefault();
        selectedArray.forEach((id) => {
          removeItem(id);
        });
        deselectAll();
        return;
      }

      // Handle arrow key navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        // If nothing selected, select first item
        if (selectedArray.length === 0 && rootItems.length > 0) {
          selectItem(rootItems[0].id, false);
          return;
        }

        // Get the last selected item's position
        const lastSelected = rootItems.find((i) => i.id === selectedArray[selectedArray.length - 1]);
        if (!lastSelected) return;

        const { x, y } = lastSelected.position;
        let targetX = x;
        let targetY = y;

        switch (e.key) {
          case 'ArrowUp':
            targetY = y - 1;
            break;
          case 'ArrowDown':
            targetY = y + 1;
            break;
          case 'ArrowLeft':
            targetX = x - 1;
            break;
          case 'ArrowRight':
            targetX = x + 1;
            break;
        }

        // Find item at target position
        const targetItem = rootItems.find(
          (i) => i.position.x === targetX && i.position.y === targetY
        );

        if (targetItem) {
          selectItem(targetItem.id, e.shiftKey);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, rootItems, selectItem, deselectAll, handleIconDoubleClick, removeItem, windows, focusWindow]);

  // Right-click on desktop (empty area)
  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isVisitorMode) return;
      e.preventDefault();

      // Only if clicking directly on desktop, not on an icon
      if (e.target === e.currentTarget) {
        setContextMenu({
          position: { x: e.clientX, y: e.clientY },
          targetItem: null,
        });
      }
    },
    [isVisitorMode]
  );

  // Right-click on an icon
  const handleIconContextMenu = useCallback(
    (item: DesktopItem, e: React.MouseEvent) => {
      if (isVisitorMode) return;
      e.preventDefault();
      e.stopPropagation();

      // Select the item if not already selected
      if (!selectedIds.has(item.id)) {
        selectItem(item.id, false);
      }

      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
        targetItem: item,
      });
    },
    [isVisitorMode, selectedIds, selectItem]
  );

  // Build context menu items based on target
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    const { addItem, updateItem } = useDesktopStore.getState();

    if (contextMenu?.targetItem) {
      // Menu for a desktop item
      const item = contextMenu.targetItem;
      return [
        {
          id: 'open',
          label: 'Open',
          shortcut: '⌘O',
          action: () => handleIconDoubleClick(item),
        },
        {
          id: 'get-info',
          label: 'Get Info',
          shortcut: '⌘I',
          action: () => {
            openWindow({
              id: `info-${item.id}`,
              title: `${item.name} Info`,
              position: { x: 200, y: 150 },
              size: { width: 280, height: 320 },
              minimized: false,
              maximized: false,
              contentType: 'get-info',
              contentId: item.id,
            });
          },
        },
        { id: 'divider-1', label: '', divider: true },
        {
          id: 'rename',
          label: 'Rename...',
          disabled: true, // TODO: Implement inline rename
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          shortcut: '⌘D',
          disabled: true, // TODO: Implement duplicate
        },
        { id: 'divider-2', label: '', divider: true },
        {
          id: 'toggle-public',
          label: item.isPublic ? 'Make Private' : 'Make Public',
          checked: item.isPublic,
          action: () => {
            updateItem(item.id, { isPublic: !item.isPublic });
          },
        },
        { id: 'divider-3', label: '', divider: true },
        {
          id: 'move-to-trash',
          label: 'Move to Trash',
          shortcut: '⌘⌫',
          action: () => {
            removeItem(item.id);
          },
        },
      ];
    } else {
      // Menu for empty desktop area
      return [
        {
          id: 'new-folder',
          label: 'New Folder',
          shortcut: '⇧⌘N',
          action: () => {
            const position = {
              x: Math.floor((contextMenu?.position.x || 100) / GRID_CELL_SIZE),
              y: Math.floor((contextMenu?.position.y || 100) / GRID_CELL_SIZE),
            };
            const finalPos = findNearestAvailablePosition(position.x, position.y);
            const now = Date.now();
            addItem({
              id: `folder-${now}`,
              type: 'folder',
              name: 'Untitled Folder',
              parentId: null,
              position: finalPos,
              isPublic: false,
              createdAt: now,
              updatedAt: now,
            });
          },
        },
        {
          id: 'new-text',
          label: 'New Text File',
          action: () => {
            const position = {
              x: Math.floor((contextMenu?.position.x || 100) / GRID_CELL_SIZE),
              y: Math.floor((contextMenu?.position.y || 100) / GRID_CELL_SIZE),
            };
            const finalPos = findNearestAvailablePosition(position.x, position.y);
            const now = Date.now();
            addItem({
              id: `text-${now}`,
              type: 'text',
              name: 'Untitled.txt',
              parentId: null,
              position: finalPos,
              isPublic: false,
              textContent: '',
              createdAt: now,
              updatedAt: now,
            });
          },
        },
        { id: 'divider-1', label: '', divider: true },
        {
          id: 'change-wallpaper',
          label: 'Change Wallpaper...',
          action: () => {
            openWindow({
              id: 'wallpaper-picker',
              title: 'Desktop Patterns',
              position: { x: 150, y: 100 },
              size: { width: 320, height: 280 },
              minimized: false,
              maximized: false,
              contentType: 'wallpaper',
            });
          },
        },
        { id: 'divider-2', label: '', divider: true },
        {
          id: 'select-all',
          label: 'Select All',
          shortcut: '⌘A',
          action: () => {
            selectAll(null);
          },
        },
        {
          id: 'clean-up',
          label: 'Clean Up',
          action: () => {
            cleanUp(null);
          },
        },
      ];
    }
  }, [contextMenu, handleIconDoubleClick, openWindow, removeItem, findNearestAvailablePosition, cleanUp, selectAll]);

  return (
    <>
      {/* Loading overlay while fetching desktop data */}
      {loading && <LoadingOverlay message="Loading your desktop..." />}

      {/* Menu Bar - fixed at top (hide in visitor mode, visitor has its own banner) */}
      {!isVisitorMode && <MenuBar />}

      <div
        data-desktop
        className={`${styles.desktop} ${isFileDragOver ? styles.dragOver : ''} wallpaper-${profile?.wallpaper || 'default'}`}
        onClick={handleDesktopClick}
        onContextMenu={handleDesktopContextMenu}
        onPointerDown={handleSelectionStart}
        onPointerMove={handleSelectionMove}
        onPointerUp={handleSelectionEnd}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        {/* Desktop Icons */}
      {rootItems.map((item) => (
        <DesktopIcon
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          gridCellSize={GRID_CELL_SIZE}
          onSelect={handleIconSelect}
          onDoubleClick={handleIconDoubleClick}
          onContextMenu={(e) => handleIconContextMenu(item, e)}
          onDragStart={dragStartHandler}
          onDragMove={dragMoveHandler}
          onDragEnd={dragEndHandler}
          isDragging={draggingId === item.id}
          dragOffset={draggingId === item.id ? dragOffset ?? undefined : undefined}
          isDropTarget={item.type === 'folder' && folderDropTargetId === item.id}
        />
      ))}

      {/* Trash Icon - hidden in visitor mode */}
      {!isVisitorMode && (
        <div data-trash>
          <Trash
            isFull={trashedItemCount > 0}
            isSelected={trashSelected}
            isDropTarget={isDropTarget}
            onSelect={handleTrashSelect}
            onDoubleClick={handleTrashDoubleClick}
            onDragOver={handleTrashDragOver}
            onDrop={handleTrashDrop}
          />
        </div>
      )}

      {/* Desk Assistant Icon - hidden in visitor mode */}
      {!isVisitorMode && (
        <AssistantDesktopIcon
          isSelected={assistantSelected}
          onSelect={handleAssistantSelect}
          onDoubleClick={handleAssistantDoubleClick}
        />
      )}

        {/* Window Manager renders all open windows */}
        <WindowManager />

        {/* Upload Progress indicator */}
        {!isVisitorMode && <UploadProgress />}

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            items={getContextMenuItems()}
            position={contextMenu.position}
            onClose={closeContextMenu}
          />
        )}

        {/* Selection Rectangle (marquee select) */}
        {selectionRect && (
          <div
            className={styles.selectionRect}
            style={{
              left: Math.min(selectionRect.startX, selectionRect.currentX),
              top: Math.min(selectionRect.startY, selectionRect.currentY),
              width: Math.abs(selectionRect.currentX - selectionRect.startX),
              height: Math.abs(selectionRect.currentY - selectionRect.startY),
            }}
          />
        )}
      </div>
    </>
  );
}
