/**
 * PreferencesWindow - Classic Mac OS Control Panel style preferences
 *
 * Features:
 * - Account info display (username, email, member since)
 * - Display name editing
 * - Wallpaper selection (integrated from WallpaperPicker)
 * - Classic Mac tabbed interface
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { WALLPAPER_OPTIONS, type WallpaperId } from '../desktop/Desktop';
import styles from './PreferencesWindow.module.css';

type TabId = 'account' | 'desktop';

export function PreferencesWindow() {
  const { user, profile, setWallpaper } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const currentWallpaper = profile?.wallpaper || 'default';

  // Update display name when profile changes
  useEffect(() => {
    setDisplayName(profile?.displayName || '');
  }, [profile?.displayName]);

  // Focus input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveDisplayName = useCallback(() => {
    // In a real app, this would call an API endpoint
    // For now, display name is read-only since we don't have the endpoint
    setIsEditingName(false);
  }, []);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveDisplayName();
      } else if (e.key === 'Escape') {
        setDisplayName(profile?.displayName || '');
        setIsEditingName(false);
      }
    },
    [handleSaveDisplayName, profile?.displayName]
  );

  const handleSelectWallpaper = useCallback(
    (id: WallpaperId) => {
      setWallpaper(id);
    },
    [setWallpaper]
  );

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.preferences}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'account' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'desktop' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('desktop')}
        >
          Desktop
        </button>
      </div>

      {/* Tab content */}
      <div className={styles.content}>
        {activeTab === 'account' && (
          <div className={styles.accountTab}>
            {/* User icon */}
            <div className={styles.userIcon}>
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="12" r="6" fill="#808080" />
                <path
                  d="M8 28c0-4.4 3.6-8 8-8s8 3.6 8 8"
                  fill="#808080"
                />
                <rect
                  x="2"
                  y="2"
                  width="28"
                  height="28"
                  stroke="#000000"
                  strokeWidth="2"
                  fill="none"
                  rx="4"
                />
              </svg>
            </div>

            {/* Account info */}
            <div className={styles.infoSection}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Username:</span>
                <span className={styles.infoValue}>@{user?.username || 'unknown'}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Display Name:</span>
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    className={styles.nameInput}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={handleSaveDisplayName}
                    onKeyDown={handleNameKeyDown}
                    maxLength={30}
                  />
                ) : (
                  <span
                    className={styles.infoValueEditable}
                    onClick={() => setIsEditingName(true)}
                    title="Click to edit"
                  >
                    {displayName || user?.username || 'Not set'}
                  </span>
                )}
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email:</span>
                <span className={styles.infoValue}>{user?.email || 'unknown'}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Member Since:</span>
                <span className={styles.infoValue}>{formatDate(profile?.createdAt)}</span>
              </div>
            </div>

            {/* Visitor URL */}
            <div className={styles.visitorSection}>
              <span className={styles.visitorLabel}>Your Public Desktop:</span>
              <div className={styles.visitorUrl}>
                <span className={styles.urlText}>
                  {window.location.origin}/@{user?.username || 'username'}
                </span>
                <button
                  className={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/@${user?.username}`
                    );
                  }}
                  title="Copy URL"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'desktop' && (
          <div className={styles.desktopTab}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Desktop Pattern</span>
            </div>
            <div className={styles.patternGrid}>
              {WALLPAPER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`${styles.patternButton} ${currentWallpaper === option.id ? styles.selected : ''}`}
                  onClick={() => handleSelectWallpaper(option.id)}
                  title={option.name}
                >
                  <div className={`${styles.patternPreview} wallpaper-${option.id}`} />
                  <span className={styles.patternName}>{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
