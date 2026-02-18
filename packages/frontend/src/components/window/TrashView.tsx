import { useCallback, useState } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { useAlertStore } from '../../stores/alertStore';
import { FolderIcon, ImageFileIcon, TextFileIcon, LinkIcon } from '../icons/PixelIcons';
import { renderCustomIcon, CUSTOM_ICON_LIBRARY, type CustomIconId } from '../icons/CustomIconLibrary';
import { getCustomIconUrl } from '../../services/api';
import type { DesktopItem } from '../../types';
import styles from './TrashView.module.css';

/**
 * TrashView - Shows contents of the Trash
 * Classic Mac OS trash view with restore and empty functionality
 */
export function TrashView() {
  const getTrashedItems = useDesktopStore((state) => state.getTrashedItems);
  const restoreFromTrash = useDesktopStore((state) => state.restoreFromTrash);
  const emptyTrash = useDesktopStore((state) => state.emptyTrash);
  const { showConfirm } = useAlertStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const trashedItems = getTrashedItems();

  // Handle background click to deselect
  const handleBackgroundClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Restore selected item
  const handleRestore = useCallback(() => {
    if (selectedId) {
      restoreFromTrash([selectedId]);
      setSelectedId(null);
    }
  }, [selectedId, restoreFromTrash]);

  // Restore all items
  const handleRestoreAll = useCallback(() => {
    const allIds = trashedItems.map((item) => item.id);
    restoreFromTrash(allIds);
    setSelectedId(null);
  }, [trashedItems, restoreFromTrash]);

  // Empty trash with confirmation
  const handleEmptyTrash = useCallback(() => {
    if (trashedItems.length === 0) return;

    showConfirm(
      `Are you sure you want to permanently delete ${trashedItems.length} item${trashedItems.length > 1 ? 's' : ''}? This cannot be undone.`,
      () => {
        emptyTrash();
        setSelectedId(null);
      },
      undefined,
      'Empty Trash'
    );
  }, [trashedItems, emptyTrash, showConfirm]);

  // Get icon for item type (or custom icon if set)
  const getIcon = (item: DesktopItem) => {
    // Custom icon takes precedence if set
    if (item.customIcon) {
      // Check if it's an uploaded icon (starts with "upload:") or a library icon
      if (item.customIcon.startsWith('upload:')) {
        return (
          <img
            src={getCustomIconUrl(item.customIcon)}
            alt={item.name}
            width={32}
            height={32}
            style={{ imageRendering: 'pixelated' }}
          />
        );
      } else if (CUSTOM_ICON_LIBRARY[item.customIcon as CustomIconId]) {
        return renderCustomIcon(item.customIcon, 32);
      }
    }

    switch (item.type) {
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

  // Format relative time
  const formatTrashedTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (trashedItems.length === 0) {
    return (
      <div className={styles.trashView}>
        <div className={styles.emptyTrash}>
          <div className={styles.emptyIcon}>
            <TrashEmptyIcon />
          </div>
          <p>The Trash is empty</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.trashView}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          className={styles.toolbarButton}
          onClick={handleRestore}
          disabled={!selectedId}
          title="Put Back"
        >
          Put Back
        </button>
        <button
          className={styles.toolbarButton}
          onClick={handleRestoreAll}
          title="Restore All"
        >
          Restore All
        </button>
        <div className={styles.toolbarSpacer} />
        <button
          className={`${styles.toolbarButton} ${styles.emptyButton}`}
          onClick={handleEmptyTrash}
          title="Empty Trash"
        >
          Empty Trash
        </button>
      </div>

      {/* Item list */}
      <div className={styles.itemList} onClick={handleBackgroundClick}>
        {trashedItems.map((item) => (
          <div
            key={item.id}
            className={`${styles.item} ${selectedId === item.id ? styles.selected : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(item.id);
            }}
            onDoubleClick={handleRestore}
          >
            <div className={styles.itemIcon}>{getIcon(item)}</div>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{item.name}</span>
              <span className={styles.itemMeta}>
                {item.type} &bull; {formatTrashedTime(item.trashedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>
          {trashedItems.length} item{trashedItems.length !== 1 ? 's' : ''} in Trash
        </span>
        {selectedId && (
          <span className={styles.hint}>Double-click to restore</span>
        )}
      </div>
    </div>
  );
}

/**
 * Empty trash icon (pixel art style)
 */
function TrashEmptyIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Trash can body */}
      <rect x="8" y="10" width="16" height="18" fill="#C0C0C0" stroke="#000" strokeWidth="1" />
      {/* Lid */}
      <rect x="6" y="8" width="20" height="3" fill="#C0C0C0" stroke="#000" strokeWidth="1" />
      {/* Handle */}
      <rect x="12" y="5" width="8" height="4" fill="#C0C0C0" stroke="#000" strokeWidth="1" />
      {/* Lines on can */}
      <line x1="11" y1="13" x2="11" y2="25" stroke="#808080" strokeWidth="1" />
      <line x1="16" y1="13" x2="16" y2="25" stroke="#808080" strokeWidth="1" />
      <line x1="21" y1="13" x2="21" y2="25" stroke="#808080" strokeWidth="1" />
    </svg>
  );
}
