/**
 * MusicPlayer Widget - Mini playlist with play/pause/skip
 *
 * Features:
 * - Owner adds track URLs (mp3 links)
 * - Displays playlist with play/pause/skip controls
 * - Classic Mac audio player aesthetic
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { MusicPlayerConfig, MusicTrack } from '../../types';
import { useDesktopStore } from '../../stores/desktopStore';
import styles from './MusicPlayer.module.css';

interface MusicPlayerProps {
  itemId: string;
  config?: MusicPlayerConfig;
  isOwner: boolean;
  onConfigUpdate?: (config: MusicPlayerConfig) => void;
}

export function MusicPlayer({ itemId, config, isOwner, onConfigUpdate }: MusicPlayerProps) {
  const updateItem = useDesktopStore((state) => state.updateItem);

  const tracks = config?.tracks || [];

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const currentTrack = tracks[currentTrackIndex];

  const saveConfig = useCallback(
    (newTracks: MusicTrack[]) => {
      const newConfig: MusicPlayerConfig = { tracks: newTracks };
      updateItem(itemId, { widgetConfig: newConfig });
      onConfigUpdate?.(newConfig);
    },
    [itemId, updateItem, onConfigUpdate]
  );

  const handlePlay = useCallback(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [currentTrack]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handlePrev = useCallback(() => {
    if (tracks.length === 0) return;
    const newIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : tracks.length - 1;
    setCurrentTrackIndex(newIndex);
    setProgress(0);
  }, [currentTrackIndex, tracks.length]);

  const handleNext = useCallback(() => {
    if (tracks.length === 0) return;
    const newIndex = currentTrackIndex < tracks.length - 1 ? currentTrackIndex + 1 : 0;
    setCurrentTrackIndex(newIndex);
    setProgress(0);
  }, [currentTrackIndex, tracks.length]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack && isPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex, currentTrack]);

  const addTrack = useCallback(() => {
    if (!editTitle.trim() || !editUrl.trim()) return;

    const newTrack: MusicTrack = {
      title: editTitle.trim(),
      url: editUrl.trim(),
    };

    saveConfig([...tracks, newTrack]);
    setEditTitle('');
    setEditUrl('');
    setIsEditing(false);
  }, [editTitle, editUrl, tracks, saveConfig]);

  const removeTrack = useCallback(
    (index: number) => {
      const newTracks = tracks.filter((_, i) => i !== index);
      saveConfig(newTracks);

      // Adjust current track index if needed
      if (currentTrackIndex >= newTracks.length) {
        setCurrentTrackIndex(Math.max(0, newTracks.length - 1));
      }
    },
    [tracks, currentTrackIndex, saveConfig]
  );

  const selectTrack = useCallback(
    (index: number) => {
      setCurrentTrackIndex(index);
      setProgress(0);
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    },
    []
  );

  return (
    <div className={styles.musicPlayer}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Now playing */}
      <div className={styles.nowPlaying}>
        <div className={styles.trackTitle}>
          {currentTrack ? currentTrack.title : 'No tracks'}
        </div>
        <div className={styles.trackTime}>
          {currentTrack && `${formatTime(progress)} / ${formatTime(duration || 0)}`}
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressContainer}>
        <input
          type="range"
          className={styles.progressBar}
          min={0}
          max={duration || 0}
          value={progress}
          onChange={handleSeek}
          disabled={!currentTrack}
        />
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          className={styles.controlButton}
          onClick={handlePrev}
          disabled={tracks.length === 0}
          title="Previous"
        >
          ⏮
        </button>
        {isPlaying ? (
          <button
            className={`${styles.controlButton} ${styles.playPause}`}
            onClick={handlePause}
            disabled={!currentTrack}
            title="Pause"
          >
            ⏸
          </button>
        ) : (
          <button
            className={`${styles.controlButton} ${styles.playPause}`}
            onClick={handlePlay}
            disabled={!currentTrack}
            title="Play"
          >
            ▶
          </button>
        )}
        <button
          className={styles.controlButton}
          onClick={handleNext}
          disabled={tracks.length === 0}
          title="Next"
        >
          ⏭
        </button>
      </div>

      {/* Playlist */}
      <div className={styles.playlist}>
        {tracks.length === 0 ? (
          <div className={styles.emptyPlaylist}>
            {isOwner ? 'Add tracks below' : 'No tracks in playlist'}
          </div>
        ) : (
          tracks.map((track, index) => (
            <div
              key={`${track.url}-${index}`}
              className={`${styles.playlistItem} ${
                index === currentTrackIndex ? styles.active : ''
              }`}
              onClick={() => selectTrack(index)}
            >
              <span className={styles.playlistTrackNumber}>{index + 1}.</span>
              <span className={styles.playlistTrackTitle}>{track.title}</span>
              {isOwner && (
                <button
                  className={styles.removeTrack}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTrack(index);
                  }}
                  title="Remove"
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add track form (owner only) */}
      {isOwner && (
        <div className={styles.addTrack}>
          {isEditing ? (
            <div className={styles.addForm}>
              <input
                type="text"
                className={styles.addInput}
                placeholder="Track title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <input
                type="url"
                className={styles.addInput}
                placeholder="MP3 URL"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
              />
              <div className={styles.addButtons}>
                <button className={styles.addButton} onClick={addTrack}>
                  Add
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle('');
                    setEditUrl('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className={styles.addTrackButton}
              onClick={() => setIsEditing(true)}
            >
              + Add Track
            </button>
          )}
        </div>
      )}
    </div>
  );
}
