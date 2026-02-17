import { useEffect, useRef, useCallback } from 'react';
import styles from './ContextMenu.module.css';

export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  divider?: boolean;
  action?: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

/**
 * ContextMenu - Classic Mac OS style right-click context menu
 *
 * Features:
 * - Positioned at click location
 * - Hover highlight with inverted colors
 * - Keyboard shortcut display
 * - Dividers between groups
 * - Dismisses on click outside, Escape, or item selection
 */
export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to keep menu within viewport
  const adjustedPosition = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return position;

    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Keep menu within horizontal bounds
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }
    if (x < 0) x = 8;

    // Keep menu within vertical bounds
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }
    if (y < 0) y = 8;

    return { x, y };
  }, [position]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // Close on Escape key
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    // Use capture phase to catch click before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Position adjustment after render
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const adjusted = adjustedPosition();
    menu.style.left = `${adjusted.x}px`;
    menu.style.top = `${adjusted.y}px`;
  }, [adjustedPosition]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled || item.divider) return;

    if (item.action) {
      item.action();
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ left: position.x, top: position.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={`divider-${index}`} className={styles.divider} />;
        }

        return (
          <div
            key={item.id}
            className={`${styles.item} ${item.disabled ? styles.itemDisabled : ''}`}
            onClick={() => handleItemClick(item)}
          >
            {item.checked !== undefined && (
              <span className={styles.checkmark}>{item.checked ? '✓' : ''}</span>
            )}
            {item.label}
            {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
          </div>
        );
      })}
    </div>
  );
}
