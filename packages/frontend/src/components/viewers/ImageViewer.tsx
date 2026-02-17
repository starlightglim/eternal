import { useState, useEffect } from 'react';
import { isApiConfigured, getFileUrl } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import styles from './ImageViewer.module.css';

interface ImageViewerProps {
  itemId: string;
  name: string;
  r2Key?: string;
  mimeType?: string;
}

/**
 * ImageViewer - Classic Mac OS style image viewer
 * Features:
 * - Pixel-art border frame
 * - Centered image, fit-to-window
 * - Loading state with dithered placeholder
 * - Error state for failed loads
 */
export function ImageViewer({ itemId, name, r2Key, mimeType }: ImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    function loadImage() {
      setLoading(true);
      setError(null);

      // In demo mode (no API), use a placeholder
      if (!isApiConfigured || !r2Key) {
        setImageUrl(null);
        setLoading(false);
        setError('Demo mode: No image data');
        return;
      }

      try {
        // Build the file URL from API
        const uid = user?.uid || 'unknown';
        const url = getFileUrl(uid, itemId, name);
        setImageUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Error loading image:', err);
        setError('Failed to load image');
        setLoading(false);
      }
    }

    loadImage();
  }, [r2Key, itemId, name, user?.uid]);

  return (
    <div className={styles.imageViewer}>
      {/* Pixel-art frame border */}
      <div className={styles.frame}>
        <div className={styles.frameInner}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.loadingIcon}>
                {/* Dithered loading pattern */}
                <div className={styles.dither} />
              </div>
              <span className={styles.loadingText}>Loading...</span>
            </div>
          )}

          {error && !loading && (
            <div className={styles.error}>
              <div className={styles.errorIcon}>!</div>
              <span className={styles.errorText}>{error}</span>
            </div>
          )}

          {imageUrl && !loading && !error && (
            <img
              src={imageUrl}
              alt={name}
              className={styles.image}
              onError={() => setError('Failed to load image')}
            />
          )}

          {/* Demo mode placeholder image */}
          {!isApiConfigured && !loading && (
            <div className={styles.demoImage}>
              <div className={styles.demoPlaceholder}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Pixel art image icon */}
                  <rect x="2" y="4" width="28" height="24" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
                  <rect x="4" y="6" width="24" height="20" fill="#C0C0C0" />
                  {/* Mountains */}
                  <polygon points="4,22 12,14 20,22" fill="#808080" />
                  <polygon points="14,22 22,12 28,22" fill="#606060" />
                  {/* Sun */}
                  <circle cx="24" cy="10" r="3" fill="#FFCC00" />
                </svg>
                <span className={styles.demoText}>{name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image info bar */}
      <div className={styles.infoBar}>
        <span className={styles.fileName}>{name}</span>
        {mimeType && <span className={styles.fileType}>{mimeType}</span>}
      </div>
    </div>
  );
}
