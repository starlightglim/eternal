import { useState, useCallback } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import {
  FolderIcon,
  TextFileIcon,
  ImageFileIcon,
  LinkIcon,
} from '../icons/PixelIcons';
import { renderCustomIcon, CUSTOM_ICON_LIBRARY, type CustomIconId } from '../icons/CustomIconLibrary';
import { getCustomIconUrl } from '../../services/api';
import type { DesktopItem } from '../../types';
import styles from './GetInfo.module.css';

interface GetInfoProps {
  item: DesktopItem;
  isOwner?: boolean;
}

/**
 * GetInfo - Classic Mac OS "Get Info" window
 * Shows file/folder properties with editable visibility toggle
 * Features:
 * - Large icon display
 * - Editable name field (owner only)
 * - Kind, size, dates
 * - Public checkbox toggle (owner only)
 */
export function GetInfo({ item, isOwner = true }: GetInfoProps) {
  const [isPublic, setIsPublic] = useState(item.isPublic);
  const [name, setName] = useState(item.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const { updateItem } = useDesktopStore();

  // Get the appropriate icon for this item type
  // Custom icon takes precedence if set
  const hasUploadedIcon = item.customIcon?.startsWith('upload:');
  const hasLibraryIcon = item.customIcon && CUSTOM_ICON_LIBRARY[item.customIcon as CustomIconId];
  const IconComponent = getIconForType(item.type);

  // Format the file size
  const sizeDisplay = item.fileSize ? formatFileSize(item.fileSize) : '--';

  // Format dates
  const createdDate = new Date(item.createdAt).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const modifiedDate = new Date(item.updatedAt).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // Get the "kind" description
  const kindDisplay = getKindDescription(item);

  // Handle visibility toggle
  const handlePublicToggle = useCallback(() => {
    if (!isOwner) return;
    const newValue = !isPublic;
    setIsPublic(newValue);
    updateItem(item.id, { isPublic: newValue });
  }, [isOwner, isPublic, updateItem, item.id]);

  // Handle name edit
  const handleNameBlur = useCallback(() => {
    setIsEditingName(false);
    if (name !== item.name && name.trim()) {
      updateItem(item.id, { name: name.trim() });
    } else {
      setName(item.name); // Reset if empty
    }
  }, [name, item.name, item.id, updateItem]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNameBlur();
      } else if (e.key === 'Escape') {
        setName(item.name);
        setIsEditingName(false);
      }
    },
    [handleNameBlur, item.name]
  );

  return (
    <div className={styles.getInfo}>
      {/* Header with icon and name */}
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          {hasUploadedIcon ? (
            <img
              src={getCustomIconUrl(item.customIcon!)}
              alt={item.name}
              width={48}
              height={48}
              style={{ imageRendering: 'pixelated' }}
            />
          ) : hasLibraryIcon ? (
            renderCustomIcon(item.customIcon!, 48)
          ) : (
            <IconComponent size={48} />
          )}
        </div>
        <div className={styles.nameContainer}>
          {isOwner && isEditingName ? (
            <input
              type="text"
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              autoFocus
            />
          ) : (
            <span
              className={styles.name}
              onDoubleClick={() => isOwner && setIsEditingName(true)}
              title={isOwner ? 'Double-click to edit' : undefined}
            >
              {item.name}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Info table */}
      <div className={styles.infoTable}>
        <InfoRow label="Kind" value={kindDisplay} />
        <InfoRow label="Size" value={sizeDisplay} />
        {item.type === 'image' && (
          <InfoRow
            label="Limit"
            value={
              <span className={item.fileSize && item.fileSize > 10 * 1024 * 1024 ? styles.warningText : undefined}>
                {item.fileSize && item.fileSize > 10 * 1024 * 1024 ? 'Exceeds 10MB limit' : '10MB max per image'}
              </span>
            }
          />
        )}
        {item.type === 'text' && item.textContent && (
          <InfoRow
            label="Chars"
            value={`${item.textContent.length.toLocaleString()} / 100,000`}
          />
        )}
        {item.mimeType && <InfoRow label="Type" value={item.mimeType} />}
        {item.url && (
          <InfoRow
            label="URL"
            value={
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                {truncateUrl(item.url)}
              </a>
            }
          />
        )}
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Dates section */}
      <div className={styles.infoTable}>
        <InfoRow label="Created" value={createdDate} />
        <InfoRow label="Modified" value={modifiedDate} />
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Visibility section (owner only) */}
      <div className={styles.visibilitySection}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={isPublic}
            onChange={handlePublicToggle}
            disabled={!isOwner}
          />
          <span className={styles.checkboxText}>
            Visible to visitors
          </span>
        </label>
        <p className={styles.visibilityHint}>
          {isPublic
            ? 'This item can be seen by anyone who visits your desktop.'
            : 'This item is private and only visible to you.'}
        </p>
      </div>

      {/* Location info */}
      {item.parentId && (
        <>
          <div className={styles.divider} />
          <div className={styles.infoTable}>
            <InfoRow label="Location" value={`In folder`} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Single row in the info table
 */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}:</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

/**
 * Get the appropriate icon component for an item type
 */
function getIconForType(type: string) {
  switch (type) {
    case 'folder':
      return FolderIcon;
    case 'text':
      return TextFileIcon;
    case 'image':
      return ImageFileIcon;
    case 'link':
      return LinkIcon;
    default:
      return TextFileIcon;
  }
}

/**
 * Get a human-readable "kind" description
 */
function getKindDescription(item: DesktopItem): string {
  switch (item.type) {
    case 'folder':
      return 'Folder';
    case 'text':
      return 'Text Document';
    case 'image':
      if (item.mimeType) {
        const format = item.mimeType.split('/')[1]?.toUpperCase() || 'Image';
        return `${format} Image`;
      }
      return 'Image';
    case 'link':
      return 'Internet Location';
    default:
      return 'Document';
  }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Truncate a URL for display
 */
function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}
