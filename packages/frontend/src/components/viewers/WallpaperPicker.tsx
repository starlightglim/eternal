/**
 * WallpaperPicker - Classic Mac OS Desktop Pattern Selector
 *
 * Displays a grid of available wallpaper patterns and allows
 * the user to select one for their desktop. Includes tiling
 * options for custom wallpaper images.
 */

import { useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { WALLPAPER_OPTIONS, type WallpaperId } from '../desktop/Desktop';
import styles from './WallpaperPicker.module.css';

const DISPLAY_MODES = [
  { id: 'cover' as const, label: 'Fill', description: 'Scale to fill screen' },
  { id: 'tile' as const, label: 'Tile', description: 'Repeat pattern across desktop' },
  { id: 'center' as const, label: 'Center', description: 'Center at original size' },
];

export function WallpaperPicker() {
  const { profile, setWallpaper, setWallpaperMode } = useAuthStore();
  const currentWallpaper = profile?.wallpaper || 'default';
  const currentMode = profile?.wallpaperMode || 'cover';
  const isCustomWallpaper = currentWallpaper.startsWith('custom:');

  const handleSelectWallpaper = useCallback(
    (id: WallpaperId) => {
      setWallpaper(id);
    },
    [setWallpaper]
  );

  const handleSelectMode = useCallback(
    (mode: 'cover' | 'tile' | 'center') => {
      setWallpaperMode(mode);
    },
    [setWallpaperMode]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Desktop Patterns</span>
      </div>

      {/* Display mode selector - only shown when custom wallpaper is active */}
      {isCustomWallpaper && (
        <div className={styles.modeSection}>
          <span className={styles.modeLabel}>Display Mode</span>
          <div className={styles.modeButtons}>
            {DISPLAY_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`${styles.modeButton} ${currentMode === mode.id ? styles.modeSelected : ''}`}
                onClick={() => handleSelectMode(mode.id)}
                title={mode.description}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {WALLPAPER_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={`${styles.patternButton} ${currentWallpaper === option.id ? styles.selected : ''}`}
            onClick={() => handleSelectWallpaper(option.id)}
            title={option.name}
          >
            <div className={`${styles.preview} wallpaper-${option.id}`} />
            <span className={styles.patternName}>{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
