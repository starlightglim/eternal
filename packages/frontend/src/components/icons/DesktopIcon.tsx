import { useCallback, useRef } from 'react';
import type { DesktopItem } from '../../types';
import { FolderIcon, TextFileIcon, ImageFileIcon, LinkIcon } from './PixelIcons';
import styles from './DesktopIcon.module.css';

interface DesktopIconProps {
  item: DesktopItem;
  isSelected: boolean;
  gridCellSize: number;
  onSelect: (id: string, addToSelection: boolean) => void;
  onDoubleClick: (item: DesktopItem) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (id: string, e: React.PointerEvent) => void;
  onDragMove?: (e: React.PointerEvent) => void;
  onDragEnd?: (e: React.PointerEvent) => void;
  isDragging: boolean;
  dragOffset?: { x: number; y: number };
  isDropTarget?: boolean;
}

/**
 * Desktop Icon Component
 * Displays a 32x32 pixel art icon with label
 * Supports click to select, double-click to open, and drag to reposition
 */
export function DesktopIcon({
  item,
  isSelected,
  gridCellSize,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  dragOffset,
  isDropTarget,
}: DesktopIconProps) {
  const clickTimeoutRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);

  // Calculate pixel position from grid position
  const pixelX = item.position.x * gridCellSize;
  const pixelY = item.position.y * gridCellSize;

  // If dragging, use the drag offset for visual position
  const displayX = isDragging && dragOffset ? dragOffset.x : pixelX;
  const displayY = isDragging && dragOffset ? dragOffset.y : pixelY;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // Only left click

      e.preventDefault();
      e.stopPropagation();

      // Handle selection (shift-click for multi-select)
      const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
      onSelect(item.id, addToSelection);

      // Start drag (if handler provided)
      if (onDragStart) {
        onDragStart(item.id, e);
        // Capture pointer for drag outside element
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [item.id, onSelect, onDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (onDragMove) {
        onDragMove(e);
      }
    },
    [onDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (onDragEnd) {
        onDragEnd(e);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    },
    [onDragEnd]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      clickCountRef.current += 1;

      if (clickCountRef.current === 1) {
        // First click - wait for potential second click
        clickTimeoutRef.current = window.setTimeout(() => {
          clickCountRef.current = 0;
          // Single click - selection already handled in pointerdown
        }, 250);
      } else if (clickCountRef.current === 2) {
        // Double click
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        clickCountRef.current = 0;
        onDoubleClick(item);
      }
    },
    [item, onDoubleClick]
  );

  const iconClasses = [
    styles.desktopIcon,
    isSelected && styles.selected,
    isDragging && styles.dragging,
    isDropTarget && styles.dropTarget,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={iconClasses}
      style={{
        left: displayX,
        top: displayY,
        width: gridCellSize,
        height: gridCellSize,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onContextMenu={onContextMenu}
    >
      <div className={styles.iconImage}>
        {item.type === 'folder' && <FolderIcon size={32} />}
        {item.type === 'text' && <TextFileIcon size={32} />}
        {item.type === 'image' && <ImageFileIcon size={32} />}
        {item.type === 'link' && <LinkIcon size={32} />}
      </div>
      <div className={`${styles.iconLabel} ${isSelected ? styles.labelSelected : ''}`}>
        <span>{item.name}</span>
      </div>
    </div>
  );
}
