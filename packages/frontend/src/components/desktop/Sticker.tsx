/**
 * Sticker - Freely placed decoration image on the desktop
 *
 * Stickers are a special item type that render as images with pixel-based positioning
 * (not grid-snapped like regular icons). They support rotation, opacity, and resizing.
 *
 * Owner mode: drag to move, corner handles to resize, right-click context menu
 * Visitor mode: read-only display
 */

import { useCallback, useRef, useState, memo } from 'react';
import type { DesktopItem } from '../../types';
import { getFileUrl } from '../../services/api';
import { slugify } from '../../utils/slugify';
import styles from './Sticker.module.css';

interface StickerProps {
  item: DesktopItem;
  isOwner: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onContextMenu?: (item: DesktopItem, e: React.MouseEvent) => void;
  onMove?: (id: string, position: { x: number; y: number }) => void;
  onResize?: (id: string, config: { width: number; height: number }) => void;
}

function StickerInner({
  item,
  isOwner,
  isSelected,
  onSelect,
  onContextMenu,
  onMove,
  onResize,
}: StickerProps) {
  const config = item.stickerConfig || { width: 120, height: 120, rotation: 0, opacity: 1 };

  // Drag state
  const isDragging = useRef(false);
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  // Resize state
  const isResizing = useRef(false);
  const resizeStartMouse = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  const imageUrl = item.r2Key ? getFileUrl(item.r2Key) : '';

  // --- Drag handlers (owner only) ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isOwner) return;
    if (e.button !== 0) return;

    e.stopPropagation();
    e.preventDefault();

    onSelect?.(item.id);

    isDragging.current = true;
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { x: item.position.x, y: item.position.y };
    setDragOffset(null);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isOwner, item.id, item.position, onSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragging.current) {
      const dx = e.clientX - dragStartMouse.current.x;
      const dy = e.clientY - dragStartMouse.current.y;
      setDragOffset({ x: dx, y: dy });
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging.current && dragOffset) {
      const newX = Math.max(0, dragStartPos.current.x + dragOffset.x);
      const newY = Math.max(0, dragStartPos.current.y + dragOffset.y);
      onMove?.(item.id, { x: newX, y: newY });
    }
    isDragging.current = false;
    setDragOffset(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  }, [item.id, dragOffset, onMove]);

  // --- Resize handlers ---
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    if (!isOwner) return;
    e.stopPropagation();
    e.preventDefault();

    isResizing.current = true;
    resizeStartMouse.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { width: config.width, height: config.height };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isOwner, config.width, config.height]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing.current) return;

    const dx = e.clientX - resizeStartMouse.current.x;
    const dy = e.clientY - resizeStartMouse.current.y;
    // Maintain aspect ratio using the larger delta
    const delta = Math.max(dx, dy);
    const newWidth = Math.max(40, resizeStartSize.current.width + delta);
    const newHeight = Math.max(40, resizeStartSize.current.height + delta);

    onResize?.(item.id, { width: newWidth, height: newHeight });
  }, [item.id, onResize]);

  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    isResizing.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  }, []);

  // --- Context menu ---
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!isOwner) return;
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(item, e);
  }, [isOwner, item, onContextMenu]);

  // Compute position
  const x = dragOffset ? dragStartPos.current.x + dragOffset.x : item.position.x;
  const y = dragOffset ? dragStartPos.current.y + dragOffset.y : item.position.y;

  const className = [
    styles.sticker,
    'sticker', // Plain class for user custom CSS targeting
    isOwner && styles.stickerOwner,
    isDragging.current && dragOffset && styles.stickerDragging,
    isSelected && styles.stickerSelected,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      eos-name={slugify(item.name)}
      eos-type="sticker"
      style={{
        left: x,
        top: y,
        width: config.width,
        height: config.height,
        transform: config.rotation ? `rotate(${config.rotation}deg)` : undefined,
        opacity: config.opacity,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={item.name}
          className={styles.stickerImage}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          draggable={false}
        />
      )}

      {/* Resize handles (owner only) */}
      {isOwner && (
        <div className={styles.handles}>
          <div
            className={`${styles.handle} ${styles.handleSE}`}
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
          />
        </div>
      )}
    </div>
  );
}

export const Sticker = memo(StickerInner);
