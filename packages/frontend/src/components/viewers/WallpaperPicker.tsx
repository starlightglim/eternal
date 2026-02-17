/**
 * WallpaperPicker - Classic Mac OS Desktop Pattern Selector
 *
 * Displays a grid of available wallpaper patterns and allows
 * the user to select one for their desktop.
 */

import { useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { WALLPAPER_OPTIONS, type WallpaperId } from '../desktop/Desktop';
import styles from './WallpaperPicker.module.css';

export function WallpaperPicker() {
  const { profile, setWallpaper } = useAuthStore();
  const currentWallpaper = profile?.wallpaper || 'default';

  const handleSelectWallpaper = useCallback(
    (id: WallpaperId) => {
      setWallpaper(id);
    },
    [setWallpaper]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Desktop Patterns</span>
      </div>
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
