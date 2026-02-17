import { useRef, useCallback, useEffect } from 'react';
import { useWindowStore } from '../../stores/windowStore';
import styles from './Window.module.css';

interface WindowProps {
  id: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  minimized: boolean;
  isActive: boolean;
  children?: React.ReactNode;
}

/**
 * Classic Mac OS-style Window component
 * Features:
 * - Draggable title bar (pointer events, not HTML5 drag)
 * - Resizable via bottom-right corner
 * - Click-to-focus with z-index stacking
 * - Proper Mac chrome: close box, striped title bar, beveled borders
 */
export function Window({
  id,
  title,
  position,
  size,
  zIndex,
  minimized,
  isActive,
  children,
}: WindowProps) {
  const { closeWindow, focusWindow, moveWindow, resizeWindow } = useWindowStore();

  const windowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Focus window on any click
  const handleWindowClick = useCallback(() => {
    focusWindow(id);
  }, [focusWindow, id]);

  // Close button handler
  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      closeWindow(id);
    },
    [closeWindow, id]
  );

  // ============================================
  // DRAG HANDLING (Title Bar)
  // ============================================

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      // Only left mouse button
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      isDragging.current = true;
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };

      // Focus the window
      focusWindow(id);

      // Capture pointer for smooth dragging outside window
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [position, focusWindow, id]
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;

      e.preventDefault();

      // Calculate new position
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;

      // Constrain to viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Keep at least 50px of window visible on each edge
      newX = Math.max(-size.width + 50, Math.min(newX, viewportWidth - 50));
      newY = Math.max(0, Math.min(newY, viewportHeight - 30)); // Keep title bar accessible

      moveWindow(id, { x: newX, y: newY });
    },
    [moveWindow, id, size.width]
  );

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;

    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // ============================================
  // RESIZE HANDLING (Bottom-Right Corner)
  // ============================================

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      isResizing.current = true;
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      };

      focusWindow(id);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [size, focusWindow, id]
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing.current) return;

      e.preventDefault();

      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;

      const newWidth = resizeStart.current.width + deltaX;
      const newHeight = resizeStart.current.height + deltaY;

      // Min constraints are enforced in the store
      resizeWindow(id, { width: newWidth, height: newHeight });
    },
    [resizeWindow, id]
  );

  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (!isResizing.current) return;

    isResizing.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDragging.current = false;
      isResizing.current = false;
    };
  }, []);

  const windowClasses = [
    styles.window,
    !isActive && styles.inactive,
    minimized && styles.minimized,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={windowRef}
      className={windowClasses}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
      }}
      onPointerDown={handleWindowClick}
    >
      <div className={styles.windowInner}>
        {/* Title Bar */}
        <div
          className={styles.titleBar}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        >
          {/* Close Box */}
          <div
            className={styles.closeBox}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleClose}
          />

          {/* Stripes (only visible when active) */}
          {isActive && <div className={styles.titleBarStripes} />}

          {/* Title Text */}
          <span className={styles.titleText}>{title}</span>
        </div>

        {/* Content Area */}
        <div className={styles.content}>{children}</div>

        {/* Resize Handle */}
        <div
          className={styles.resizeHandle}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
        />
      </div>
    </div>
  );
}
