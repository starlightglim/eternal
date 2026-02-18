/**
 * ThumbnailIcon Component
 *
 * Displays a pixelated thumbnail preview of media files (images, videos).
 * Uses the actual file content scaled down with pixelated rendering
 * for that authentic retro Mac aesthetic.
 */

import { useState, useCallback } from 'react';
import { getFileUrl } from '../../services/api';
import styles from './ThumbnailIcon.module.css';

interface ThumbnailIconProps {
  /** R2 key for the thumbnail (or full image if no separate thumbnail) */
  r2Key: string;
  /** Optional separate thumbnail key for faster loading */
  thumbnailKey?: string;
  /** Alt text for accessibility */
  alt: string;
  /** Icon size (width and height in px) */
  size?: number;
  /** Whether the icon is currently selected */
  isSelected?: boolean;
}

/**
 * ThumbnailIcon displays a pixelated preview of an image file.
 * Falls back to loading state or error state gracefully.
 */
export function ThumbnailIcon({
  r2Key,
  thumbnailKey,
  alt,
  size = 32,
  isSelected = false,
}: ThumbnailIconProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Use thumbnail key if available, otherwise use full image
  const imageKey = thumbnailKey || r2Key;
  const imageUrl = getFileUrl(imageKey);

  const handleLoad = useCallback(() => {
    setLoadState('loaded');
  }, []);

  const handleError = useCallback(() => {
    setLoadState('error');
  }, []);

  return (
    <div
      className={`${styles.thumbnailContainer} ${isSelected ? styles.selected : ''}`}
      style={{ width: size, height: size }}
    >
      {/* Loading placeholder */}
      {loadState === 'loading' && (
        <div className={styles.placeholder}>
          <div className={styles.loadingDots}>
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {/* Error state - show generic image icon */}
      {loadState === 'error' && (
        <div className={styles.errorIcon}>
          <svg width={size * 0.75} height={size * 0.75} viewBox="0 0 32 32" fill="none">
            {/* Simple image icon fallback */}
            <rect x="2" y="4" width="28" height="24" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
            <circle cx="10" cy="12" r="3" fill="#FFCC00" />
            <path d="M4 24 L12 16 L18 22 L24 14 L28 20 L28 26 L4 26 Z" fill="#4CAF50" />
          </svg>
        </div>
      )}

      {/* Actual thumbnail image */}
      <img
        src={imageUrl}
        alt={alt}
        className={`${styles.thumbnail} ${loadState === 'loaded' ? styles.visible : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        draggable={false}
      />

      {/* Pixelated border frame for that retro Mac look */}
      <div className={styles.frame} />
    </div>
  );
}
