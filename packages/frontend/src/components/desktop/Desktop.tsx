import { useCallback, useRef, useState, useEffect } from 'react';
import { WindowManager } from '../window';
import { DesktopIcon, Trash } from '../icons';
import { MenuBar } from '../menubar';
import { UploadProgress } from './UploadProgress';
import { LoadingOverlay } from '../ui';
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

  const { openWindow } = useWindowStore();
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

  // Trash state
  const [trashSelected, setTrashSelected] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [trashedItemCount, setTrashedItemCount] = useState(0);

  // File drag-drop state
  const [isFileDragOver, setIsFileDragOver] = useState(false);

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
      }
    },
    [deselectAll]
  );

  // Icon selection
  const handleIconSelect = useCallback(
    (id: string, addToSelection: boolean) => {
      selectItem(id, addToSelection);
      setTrashSelected(false);
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

      // Initial visual position in pixels
      setDragOffset({
        x: item.position.x * GRID_CELL_SIZE,
        y: item.position.y * GRID_CELL_SIZE,
      });
    },
    [items]
  );

  // Drag move
  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !dragStartPos.current || !dragItemStartGridPos.current) return;

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      // Check if we've actually dragged (threshold of 5px)
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDragged.current = true;
      }

      // Calculate new visual position
      const startPixelX = dragItemStartGridPos.current.x * GRID_CELL_SIZE;
      const startPixelY = dragItemStartGridPos.current.y * GRID_CELL_SIZE;

      setDragOffset({
        x: startPixelX + deltaX,
        y: startPixelY + deltaY,
      });

      // Check if over trash
      const trashRect = document.querySelector('[data-trash]')?.getBoundingClientRect();
      if (trashRect) {
        const isOverTrash =
          e.clientX >= trashRect.left &&
          e.clientX <= trashRect.right &&
          e.clientY >= trashRect.top &&
          e.clientY <= trashRect.bottom;
        setIsDropTarget(isOverTrash);
      }
    },
    [draggingId]
  );

  // Drag end
  const handleDragEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !dragItemStartGridPos.current) {
        setDraggingId(null);
        setDragOffset(null);
        setIsDropTarget(false);
        return;
      }

      // Check if dropped on trash
      const trashRect = document.querySelector('[data-trash]')?.getBoundingClientRect();
      if (trashRect) {
        const isOverTrash =
          e.clientX >= trashRect.left &&
          e.clientX <= trashRect.right &&
          e.clientY >= trashRect.top &&
          e.clientY <= trashRect.bottom;

        if (isOverTrash && hasDragged.current) {
          // Move item to trash
          setTrashedItemCount((c) => c + 1);
          removeItem(draggingId);
          setDraggingId(null);
          setDragOffset(null);
          setIsDropTarget(false);
          return;
        }
      }

      // Calculate new grid position if we actually dragged
      if (hasDragged.current && dragOffset) {
        // Convert pixel position to grid position
        let newGridX = Math.round(dragOffset.x / GRID_CELL_SIZE);
        let newGridY = Math.round(dragOffset.y / GRID_CELL_SIZE);

        // Ensure non-negative grid positions
        newGridX = Math.max(0, newGridX);
        newGridY = Math.max(0, newGridY);

        // Find available position (avoid overlaps)
        const finalPos = findNearestAvailablePosition(newGridX, newGridY, draggingId);

        moveItem(draggingId, finalPos);
      }

      setDraggingId(null);
      setDragOffset(null);
      setIsDropTarget(false);
    },
    [draggingId, dragOffset, moveItem, removeItem, findNearestAvailablePosition]
  );

  // Trash handlers
  const handleTrashSelect = useCallback(() => {
    deselectAll();
    setTrashSelected(true);
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

  return (
    <>
      {/* Loading overlay while fetching desktop data */}
      {loading && <LoadingOverlay message="Loading your desktop..." />}

      {/* Menu Bar - fixed at top (hide in visitor mode, visitor has its own banner) */}
      {!isVisitorMode && <MenuBar />}

      <div
        className={`${styles.desktop} ${isFileDragOver ? styles.dragOver : ''} wallpaper-${profile?.wallpaper || 'default'}`}
        onClick={handleDesktopClick}
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
          onDragStart={dragStartHandler}
          onDragMove={dragMoveHandler}
          onDragEnd={dragEndHandler}
          isDragging={draggingId === item.id}
          dragOffset={draggingId === item.id ? dragOffset ?? undefined : undefined}
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

        {/* Window Manager renders all open windows */}
        <WindowManager />

        {/* Upload Progress indicator */}
        {!isVisitorMode && <UploadProgress />}
      </div>
    </>
  );
}
