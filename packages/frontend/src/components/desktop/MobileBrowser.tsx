/**
 * MobileBrowser - Simplified list-based UI for mobile devices (<768px)
 *
 * Replaces the desktop grid with a folder-browser list view.
 * Same data, different presentation.
 */

import { useState, useCallback } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { useWindowStore } from '../../stores/windowStore';
import { useAuthStore } from '../../stores/authStore';
import { WindowManager } from '../window';
import { FolderIcon, TextFileIcon, ImageFileIcon, LinkIcon, AudioFileIcon, VideoFileIcon, PDFFileIcon } from '../icons/PixelIcons';
import { getTextFileContentType, type DesktopItem } from '../../types';
import styles from './MobileBrowser.module.css';

interface MobileBrowserProps {
  isVisitorMode?: boolean;
  visitorItems?: DesktopItem[];
  username?: string;
}

export function MobileBrowser({ isVisitorMode = false, visitorItems, username }: MobileBrowserProps) {
  const { items: storeItems, getItemsByParent } = useDesktopStore();
  const { openWindow } = useWindowStore();
  const { profile, logout } = useAuthStore();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Desktop' },
  ]);

  // Use visitor items if in visitor mode, otherwise store items
  const items = isVisitorMode && visitorItems ? visitorItems : storeItems;

  // Get items in current folder
  const currentItems = isVisitorMode
    ? items.filter((item) => item.parentId === currentFolderId)
    : getItemsByParent(currentFolderId);

  // Sort: folders first, then by name
  const sortedItems = [...currentItems].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  // Navigate into a folder
  const navigateToFolder = useCallback((folder: DesktopItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }, []);

  // Navigate back using breadcrumbs
  const navigateToBreadcrumb = useCallback((index: number) => {
    const crumb = breadcrumbs[index];
    setCurrentFolderId(crumb.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }, [breadcrumbs]);

  // Handle item tap
  const handleItemTap = useCallback(
    (item: DesktopItem) => {
      // Calculate full-screen size for mobile viewers
      const fullWidth = window.innerWidth;
      const fullHeight = window.innerHeight - 100; // Leave room for chrome

      if (item.type === 'folder') {
        navigateToFolder(item);
      } else if (item.type === 'text') {
        // Open in appropriate viewer based on file extension
        const contentType = getTextFileContentType(item.name);
        openWindow({
          id: `mobile-text-${item.id}`,
          title: item.name,
          position: { x: 0, y: 0 },
          size: { width: fullWidth, height: fullHeight },
          minimized: false,
          maximized: true,
          contentType,
          contentId: item.id,
        });
      } else if (item.type === 'image') {
        openWindow({
          id: `mobile-image-${item.id}`,
          title: item.name,
          position: { x: 0, y: 0 },
          size: { width: fullWidth, height: fullHeight },
          minimized: false,
          maximized: true,
          contentType: 'image',
          contentId: item.id,
        });
      } else if (item.type === 'video') {
        openWindow({
          id: `mobile-video-${item.id}`,
          title: item.name,
          position: { x: 0, y: 0 },
          size: { width: fullWidth, height: fullHeight },
          minimized: false,
          maximized: true,
          contentType: 'video',
          contentId: item.id,
        });
      } else if (item.type === 'audio') {
        openWindow({
          id: `mobile-audio-${item.id}`,
          title: item.name,
          position: { x: 0, y: 0 },
          size: { width: fullWidth, height: 200 }, // Shorter for audio player
          minimized: false,
          maximized: false,
          contentType: 'audio',
          contentId: item.id,
        });
      } else if (item.type === 'pdf') {
        openWindow({
          id: `mobile-pdf-${item.id}`,
          title: item.name,
          position: { x: 0, y: 0 },
          size: { width: fullWidth, height: fullHeight },
          minimized: false,
          maximized: true,
          contentType: 'pdf',
          contentId: item.id,
        });
      } else if (item.type === 'link' && item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    },
    [navigateToFolder, openWindow]
  );

  // Get icon for item type
  const getItemIcon = (item: DesktopItem) => {
    switch (item.type) {
      case 'folder':
        return <FolderIcon size={24} />;
      case 'image':
        return <ImageFileIcon size={24} />;
      case 'video':
        return <VideoFileIcon size={24} />;
      case 'audio':
        return <AudioFileIcon size={24} />;
      case 'pdf':
        return <PDFFileIcon size={24} />;
      case 'link':
        return <LinkIcon size={24} />;
      case 'text':
      default:
        return <TextFileIcon size={24} />;
    }
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          {isVisitorMode ? (
            <span>@{username}'s Desktop</span>
          ) : (
            <span>EternalOS</span>
          )}
        </div>
        {!isVisitorMode && (
          <button className={styles.logoutButton} onClick={() => logout()}>
            Log Out
          </button>
        )}
      </header>

      {/* Breadcrumb navigation */}
      <nav className={styles.breadcrumbs}>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.id ?? 'root'}>
            {index > 0 && <span className={styles.breadcrumbSep}>/</span>}
            <button
              className={styles.breadcrumbItem}
              onClick={() => navigateToBreadcrumb(index)}
              disabled={index === breadcrumbs.length - 1}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {/* Item list */}
      <div className={styles.itemList}>
        {sortedItems.length === 0 ? (
          <div className={styles.emptyState}>
            <p>This folder is empty</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <button
              key={item.id}
              className={styles.item}
              onClick={() => handleItemTap(item)}
            >
              <div className={styles.itemIcon}>{getItemIcon(item)}</div>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{item.name}</span>
                {item.type !== 'folder' && (
                  <span className={styles.itemMeta}>
                    {item.type.toUpperCase()}
                    {item.fileSize && ` • ${formatSize(item.fileSize)}`}
                  </span>
                )}
              </div>
              {item.type === 'folder' && (
                <span className={styles.chevron}>›</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer info */}
      {!isVisitorMode && profile && (
        <footer className={styles.footer}>
          <span>@{profile.username}</span>
          <span>{sortedItems.length} items</span>
        </footer>
      )}

      {/* Window Manager for file viewers */}
      <WindowManager
        isVisitorMode={isVisitorMode}
        visitorItems={isVisitorMode ? visitorItems : undefined}
      />
    </div>
  );
}
