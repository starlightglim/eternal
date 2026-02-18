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

  // Search results filtered by query
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(lowerQuery)
    );
  }, [query, items]);

  // Open an item (navigate to its folder and select it)
  const handleOpenItem = useCallback(
    (item: DesktopItem) => {
      if (item.type === 'folder') {
        // Open folder window
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
        // Open appropriate viewer based on file extension
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
        // Open image viewer
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
      default:
        return '\uD83D\uDCC4';
    }
  };

  return (
    <div className={styles.searchWindow}>
      <div className={styles.searchHeader}>
        <label className={styles.searchLabel}>Find items named:</label>
        <input
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter name..."
          autoFocus
        />
      </div>

      <div className={styles.resultsContainer}>
        {query.trim() === '' ? (
          <div className={styles.placeholder}>
            Type a name to search for files and folders.
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
