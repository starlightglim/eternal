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
  collapsed?: boolean;
  isActive: boolean;
  contentType?: string;
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
  collapsed,
  isActive,
  contentType,
  children,
}: WindowProps) {
  const { closeWindow, focusWindow, moveWindow, resizeWindow, toggleCollapse, toggleMaximize } = useWindowStore();

  const windowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const lastClickTime = useRef(0);

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

  // Collapse button handler (window shade)
  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleCollapse(id);
    },
    [toggleCollapse, id]
  );

  // Zoom button handler (maximize/restore)
  const handleZoom = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleMaximize(id);
    },
    [toggleMaximize, id]
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

      // Check for double-click to toggle collapse (window shade)
      const now = Date.now();
      if (now - lastClickTime.current < 300) {
        // Double-click detected - toggle collapse
        toggleCollapse(id);
        lastClickTime.current = 0;
        return;
      }
      lastClickTime.current = now;

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
    [position, focusWindow, id, toggleCollapse]
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
      const menuBarHeight = 20;

      // Keep at least 50px of window visible on each edge
      newX = Math.max(-size.width + 50, Math.min(newX, viewportWidth - 50));
      newY = Math.max(0, Math.min(newY, viewportHeight - 30)); // Keep title bar accessible

      // Snap to edges when within threshold
      const snapThreshold = 10;

      // Snap to left edge
      if (newX >= 0 && newX <= snapThreshold) {
        newX = 0;
      }
      // Snap to right edge
      if (newX + size.width >= viewportWidth - snapThreshold && newX + size.width <= viewportWidth) {
        newX = viewportWidth - size.width;
      }
      // Snap to top (below menu bar)
      if (newY >= menuBarHeight && newY <= menuBarHeight + snapThreshold) {
        newY = menuBarHeight;
      }
      // Snap to bottom
      if (newY + size.height >= viewportHeight - snapThreshold && newY + size.height <= viewportHeight) {
        newY = viewportHeight - size.height;
      }

      moveWindow(id, { x: newX, y: newY });
    },
    [moveWindow, id, size.width, size.height]
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
    'window', // Plain class for user custom CSS targeting
    !isActive && styles.inactive,
    minimized && styles.minimized,
    collapsed && styles.collapsed,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={windowRef}
      className={windowClasses}
      data-content-type={contentType}
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
          className={`${styles.titleBar} titleBar`}
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
          <span className={`${styles.titleText} titleText`}>{title}</span>

          {/* Zoom Box (Maximize/Restore) */}
          <div
            className={styles.zoomBox}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleZoom}
          />

          {/* Collapse Box (Window Shade) */}
          <div
            className={styles.collapseBox}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCollapse}
          />
        </div>

        {/* Content Area (hidden when collapsed) */}
        {!collapsed && <div className={`${styles.content} windowContent`}>{children}</div>}

        {/* Resize Handle (hidden when collapsed) */}
        {!collapsed && (
          <div
            className={styles.resizeHandle}
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
          />
        )}
      </div>
    </div>
  );
}
