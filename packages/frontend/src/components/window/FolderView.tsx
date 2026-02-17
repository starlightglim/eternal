import { useCallback, useState, useRef } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { useWindowStore } from '../../stores/windowStore';
import { FolderIcon, ImageFileIcon, TextFileIcon, LinkIcon } from '../icons/PixelIcons';
import type { DesktopItem } from '../../types';
import styles from './FolderView.module.css';

// Counter for staggering window positions
let windowOffsetCounter = 0;

interface FolderViewProps {
  folderId: string | null;
  visitorItems?: DesktopItem[];
  isVisitorMode?: boolean;
}

/**
 * FolderView - Shows contents of a folder in a window
 * Classic Mac OS folder view with icon grid
 * Supports drag-and-drop for moving items between folders
 */
export function FolderView({ folderId, visitorItems, isVisitorMode = false }: FolderViewProps) {
  const getItemsByParent = useDesktopStore((state) => state.getItemsByParent);
  const updateItem = useDesktopStore((state) => state.updateItem);
  const openWindow = useWindowStore((state) => state.openWindow);

  // Selection and drag state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasDragged = useRef(false);

  // If visitorItems is provided, filter from those; otherwise use the store
  const items = visitorItems
    ? visitorItems.filter((item) => item.parentId === folderId)
    : getItemsByParent(folderId);

  // Handle double-click to open item
  const handleDoubleClick = useCallback(
    (itemId: string, itemType: string, itemName: string) => {
      const contentType = itemType === 'folder' ? 'folder' : itemType;
      // Stagger window positions using a counter instead of Math.random
      windowOffsetCounter = (windowOffsetCounter + 1) % 10;
      const offset = windowOffsetCounter * 20;
      openWindow({
        id: `window-${itemId}`,
        title: itemName,
        position: { x: 100 + offset, y: 50 + offset },
        size: { width: 400, height: 300 },
        minimized: false,
        maximized: false,
        contentType: contentType as 'folder' | 'image' | 'text' | 'get-info' | 'about',
        contentId: itemId,
      });
    },
    [openWindow]
  );

  // Handle link double-click
  const handleLinkClick = (url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle pointer down on item (start potential drag)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, itemId: string) => {
      if (isVisitorMode) return;

      e.stopPropagation();
      setSelectedId(itemId);
      setDraggingId(itemId);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      hasDragged.current = false;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isVisitorMode]
  );

  // Handle pointer move during drag
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !dragStartPos.current) return;

      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);

      // Only consider it a drag if moved more than 5 pixels
      if (dx > 5 || dy > 5) {
        hasDragged.current = true;
      }

      // Find if we're over a folder (drop target detection)
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let newDropTarget: string | null = null;

      for (const el of elements) {
        const folderEl = (el as HTMLElement).closest('[data-folder-id]');
        if (folderEl) {
          const targetFolderId = folderEl.getAttribute('data-folder-id');
          // Don't allow dropping on itself
          if (targetFolderId && targetFolderId !== draggingId) {
            newDropTarget = targetFolderId;
            break;
          }
        }
      }

      setFolderDropTargetId(newDropTarget);
    },
    [draggingId]
  );

  // Handle pointer up (end drag)
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draggingId && hasDragged.current && folderDropTargetId) {
        // Move item to the target folder
        updateItem(draggingId, {
          parentId: folderDropTargetId,
          position: { x: 0, y: 0 },
        });
      }

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDraggingId(null);
      setFolderDropTargetId(null);
      dragStartPos.current = null;
      hasDragged.current = false;
    },
    [draggingId, folderDropTargetId, updateItem]
  );

  // Clear selection when clicking empty area
  const handleBackgroundClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Get icon for item type
  const getIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return <FolderIcon size={32} />;
      case 'image':
        return <ImageFileIcon size={32} />;
      case 'text':
        return <TextFileIcon size={32} />;
      case 'link':
        return <LinkIcon size={32} />;
      default:
        return <TextFileIcon size={32} />;
    }
  };

  if (items.length === 0) {
    return (
      <div className={styles.emptyFolder}>
        <p>This folder is empty</p>
      </div>
    );
  }

  return (
    <div
      className={styles.folderView}
      onClick={handleBackgroundClick}
      onPointerMove={draggingId ? handlePointerMove : undefined}
      onPointerUp={draggingId ? handlePointerUp : undefined}
    >
      <div className={styles.itemGrid}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`${styles.item} ${selectedId === item.id ? styles.selected : ''} ${
              draggingId === item.id ? styles.dragging : ''
            } ${item.type === 'folder' && folderDropTargetId === item.id ? styles.dropTarget : ''}`}
            data-folder-id={item.type === 'folder' ? item.id : undefined}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(item.id);
            }}
            onDoubleClick={() => {
              if (item.type === 'link') {
                handleLinkClick(item.url);
              } else {
                handleDoubleClick(item.id, item.type, item.name);
              }
            }}
            onPointerDown={(e) => handlePointerDown(e, item.id)}
          >
            <div className={styles.itemIcon}>{getIcon(item.type)}</div>
            <span className={styles.itemName}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
