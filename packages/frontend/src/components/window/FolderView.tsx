import { useCallback } from 'react';
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
}

/**
 * FolderView - Shows contents of a folder in a window
 * Classic Mac OS folder view with icon grid
 */
export function FolderView({ folderId, visitorItems }: FolderViewProps) {
  const getItemsByParent = useDesktopStore((state) => state.getItemsByParent);
  const openWindow = useWindowStore((state) => state.openWindow);

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
    <div className={styles.folderView}>
      <div className={styles.itemGrid}>
        {items.map((item) => (
          <div
            key={item.id}
            className={styles.item}
            onDoubleClick={() => {
              if (item.type === 'link') {
                handleLinkClick(item.url);
              } else {
                handleDoubleClick(item.id, item.type, item.name);
              }
            }}
          >
            <div className={styles.itemIcon}>{getIcon(item.type)}</div>
            <span className={styles.itemName}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
