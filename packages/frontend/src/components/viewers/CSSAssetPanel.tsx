/**
 * CSSAssetPanel - Upload and manage images for use in custom CSS
 *
 * Users can upload images (stickers, cursors, tiled patterns) that get
 * hosted on our CDN and can be referenced in custom CSS via url().
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  uploadCSSAsset,
  listCSSAssets,
  deleteCSSAsset,
  getCSSAssetUrl,
  type CSSAsset,
} from '../../services/api';
import styles from './CSSAssetPanel.module.css';

const MAX_ASSETS = 10;

interface CSSAssetPanelProps {
  onInsertUrl?: (url: string) => void;
}

export function CSSAssetPanel({ onInsertUrl }: CSSAssetPanelProps) {
  const [assets, setAssets] = useState<CSSAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listCSSAssets();
      setAssets(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const result = await uploadCSSAsset(file, (progress) => {
        setUploadProgress(progress);
      });

      setAssets((prev) => [...prev, result.asset]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleUpload]
  );

  const handleDelete = useCallback(async (assetId: string) => {
    try {
      setError(null);
      await deleteCSSAsset(assetId);
      setAssets((prev) => prev.filter((a) => a.assetId !== assetId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  }, []);

  const handleCopyUrl = useCallback(
    (asset: CSSAsset) => {
      const urlPath = asset.url;
      // Copy the relative path for use in CSS url()
      navigator.clipboard.writeText(`url(${urlPath})`).then(() => {
        setCopiedId(asset.assetId);
        setTimeout(() => setCopiedId(null), 1500);
      });
    },
    []
  );

  const handleInsertUrl = useCallback(
    (asset: CSSAsset) => {
      if (onInsertUrl) {
        onInsertUrl(asset.url);
      }
    },
    [onInsertUrl]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(0)}KB`;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>CSS Assets</span>
        <span className={styles.assetCount}>
          {assets.length}/{MAX_ASSETS}
        </span>
      </div>

      <div className={styles.panelNote}>
        Upload images to use in your CSS (backgrounds, stickers, cursors). Click an
        asset to copy its <code>url()</code> snippet.
      </div>

      {/* Upload button */}
      <div className={styles.uploadSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />
        <button
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || assets.length >= MAX_ASSETS}
        >
          {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Image'}
        </button>
        {uploading && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={styles.error}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Asset grid */}
      <div className={styles.assetGrid}>
        {loading ? (
          <div className={styles.loadingText}>Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className={styles.emptyText}>
            No assets yet. Upload images to use in your custom CSS.
          </div>
        ) : (
          assets.map((asset) => (
            <div key={asset.assetId} className={styles.assetItem}>
              <img
                src={getCSSAssetUrl(asset.url)}
                alt={asset.filename}
                className={styles.assetThumbnail}
              />
              <div className={styles.assetInfo}>
                <span className={styles.assetName} title={asset.filename}>
                  {asset.filename}
                </span>
                <span className={styles.assetSize}>{formatSize(asset.size)}</span>
              </div>
              <div className={styles.assetActions}>
                <button
                  className={styles.copyButton}
                  onClick={() => handleCopyUrl(asset)}
                  title="Copy url() to clipboard"
                >
                  {copiedId === asset.assetId ? 'Copied!' : 'Copy URL'}
                </button>
                {onInsertUrl && (
                  <button
                    className={styles.insertButton}
                    onClick={() => handleInsertUrl(asset)}
                    title="Insert URL at cursor"
                  >
                    Insert
                  </button>
                )}
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(asset.assetId)}
                  title="Delete asset"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
