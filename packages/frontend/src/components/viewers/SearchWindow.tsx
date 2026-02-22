import { useState, useCallback, useMemo } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { useWindowStore } from '../../stores/windowStore';
import { getTextFileContentType, type DesktopItem } from '../../types';
import styles from './SearchWindow.module.css';

/**
 * SearchWindow - Find files by name
 * Classic Mac OS Find File dialog
 */
export function SearchWindow() {
  const [query, setQuery] = useState('');
  const { items } = useDesktopStore();
  const { openWindow } = useWindowStore();

  // Search results filtered by query — matches name, text content, and URL (excludes trashed items)
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
      if (item.isTrashed) return false;
      // Match by name
      if (item.name.toLowerCase().includes(lowerQuery)) return true;
      // Match by text content (for text files, sticky notes, etc.)
      if (item.textContent && item.textContent.toLowerCase().includes(lowerQuery)) return true;
      // Match by URL (for link items)
      if (item.url && item.url.toLowerCase().includes(lowerQuery)) return true;
      return false;
    });
  }, [query, items]);

  // Open an item in its appropriate viewer
  const handleOpenItem = useCallback(
    (item: DesktopItem) => {
      if (item.type === 'folder') {
        openWindow({
          id: `folder-${item.id}`,
          title: item.name,
          position: { x: 100, y: 100 },
          size: { width: 400, height: 300 },
          minimized: false,
          maximized: false,
          contentType: 'folder',
          contentId: item.id,
        });
      } else if (item.type === 'text') {
        const contentType = getTextFileContentType(item.name);
        openWindow({
          id: `text-${item.id}`,
          title: item.name,
          position: { x: 100, y: 100 },
          size: { width: 500, height: 400 },
          minimized: false,
          maximized: false,
          contentType,
          contentId: item.id,
        });
      } else if (item.type === 'image') {
        openWindow({
          id: `image-${item.id}`,
          title: item.name,
          position: { x: 100, y: 100 },
          size: { width: 400, height: 350 },
          minimized: false,
          maximized: false,
          contentType: 'image',
          contentId: item.id,
        });
      } else if (item.type === 'video') {
        openWindow({
          id: `video-${item.id}`,
          title: item.name,
          position: { x: 100, y: 100 },
          size: { width: 640, height: 480 },
          minimized: false,
          maximized: false,
          contentType: 'video',
          contentId: item.id,
        });
      } else if (item.type === 'audio') {
        openWindow({
          id: `audio-${item.id}`,
          title: item.name,
          position: { x: 100, y: 100 },
          size: { width: 320, height: 200 },
          minimized: false,
          maximized: false,
          contentType: 'audio',
          contentId: item.id,
        });
      } else if (item.type === 'pdf') {
        openWindow({
          id: `pdf-${item.id}`,
          title: item.name,
          position: { x: 100, y: 100 },
          size: { width: 600, height: 500 },
          minimized: false,
          maximized: false,
          contentType: 'pdf',
          contentId: item.id,
        });
      } else if (item.type === 'link') {
        openWindow({
          id: `link-${item.id}`,
          title: item.name,
          position: { x: 100, y: 100 },
          size: { width: 800, height: 600 },
          minimized: false,
          maximized: false,
          contentType: 'link',
          contentId: item.id,
        });
      } else if (item.type === 'widget') {
        openWindow({
          id: `widget-${item.id}`,
          title: item.name,
          position: { x: 100, y: 100 },
          size: { width: 300, height: 250 },
          minimized: false,
          maximized: false,
          contentType: 'widget',
          contentId: item.id,
        });
      }
    },
    [openWindow]
  );

  // Get parent folder name for display
  const getLocationName = (item: DesktopItem): string => {
    if (!item.parentId) return 'Desktop';
    const parent = items.find((i) => i.id === item.parentId);
    return parent ? parent.name : 'Desktop';
  };

  // Get icon for item type
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'folder':
        return '\uD83D\uDCC1'; // folder emoji
      case 'image':
        return '\uD83D\uDDBC'; // framed picture
      case 'text':
        return '\uD83D\uDCC4'; // page facing up
      case 'link':
        return '\uD83D\uDD17'; // link
      case 'video':
        return '\uD83C\uDFAC'; // clapper board
      case 'audio':
        return '\uD83C\uDFB5'; // musical note
      case 'pdf':
        return '\uD83D\uDCCB'; // clipboard
      case 'widget':
        return '\uD83D\uDDF2'; // ballot box with check
      default:
        return '\uD83D\uDCC4';
    }
  };

  return (
    <div className={styles.searchWindow}>
      <div className={styles.searchHeader}>
        <label className={styles.searchLabel}>Find:</label>
        <input
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, content, URLs..."
          autoFocus
        />
      </div>

      <div className={styles.resultsContainer}>
        {query.trim() === '' ? (
          <div className={styles.placeholder}>
            Search by name, content, or URL.
          </div>
        ) : results.length === 0 ? (
          <div className={styles.placeholder}>
            No items found matching "{query}"
          </div>
        ) : (
          <div className={styles.resultsList}>
            <div className={styles.resultsHeader}>
              <span className={styles.colName}>Name</span>
              <span className={styles.colKind}>Kind</span>
              <span className={styles.colLocation}>Location</span>
            </div>
            {results.map((item) => (
              <div
                key={item.id}
                className={styles.resultItem}
                onDoubleClick={() => handleOpenItem(item)}
              >
                <span className={styles.colName}>
                  <span className={styles.typeIcon}>{getTypeIcon(item.type)}</span>
                  {item.name}
                </span>
                <span className={styles.colKind}>{item.type}</span>
                <span className={styles.colLocation}>{getLocationName(item)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.resultsCount}>
        {results.length > 0 && `${results.length} item${results.length !== 1 ? 's' : ''} found`}
      </div>
    </div>
  );
}
