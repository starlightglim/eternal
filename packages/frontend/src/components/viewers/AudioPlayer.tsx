import { useState, useRef, useEffect, useCallback } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { getFileUrl, isApiConfigured } from '../../services/api';
import styles from './AudioPlayer.module.css';

interface AudioPlayerProps {
  itemId: string;
}

/**
 * AudioPlayer - Classic QuickTime-style audio player
 * Features a compact, retro design with play/pause, progress bar, and time display
 */
export function AudioPlayer({ itemId }: AudioPlayerProps) {
  const item = useDesktopStore((state) => state.getItem(itemId));
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get audio URL
  const audioUrl = item?.r2Key && isApiConfigured
    ? getFileUrl(item.r2Key)
    : null;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Failed to play audio:', err);
        setError('Failed to play audio');
      });
    }
  }, [isPlaying]);

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleLoadedData = () => setIsLoading(false);
    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  if (!item) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Audio file not found</div>
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.demoMode}>
          <div className={styles.demoIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="8" width="32" height="32" fill="#C0C0C0" stroke="#000" strokeWidth="2"/>
              <circle cx="24" cy="24" r="10" fill="#808080" stroke="#000" strokeWidth="1"/>
              <circle cx="24" cy="24" r="4" fill="#000"/>
              <path d="M20 16L20 32" stroke="#000" strokeWidth="2"/>
              <path d="M28 16L28 32" stroke="#000" strokeWidth="2"/>
            </svg>
          </div>
          <p className={styles.demoText}>{item.name}</p>
          <p className={styles.demoSubtext}>Demo mode: No audio data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.container}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* QuickTime-style player */}
      <div className={styles.player}>
        {/* CD/Record visualization */}
        <div className={styles.discContainer}>
          <div className={`${styles.disc} ${isPlaying ? styles.spinning : ''}`}>
            <div className={styles.discCenter} />
            <div className={styles.discGrooves} />
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          {/* Play/Pause button */}
          <button
            className={styles.playButton}
            onClick={togglePlay}
            disabled={isLoading}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <span className={styles.loading}>...</span>
            ) : isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" />
                <rect x="9" y="2" width="4" height="12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2L14 8L4 14V2Z" />
              </svg>
            )}
          </button>

          {/* Progress bar */}
          <div className={styles.progressContainer} onClick={handleProgressClick}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className={styles.progressHandle}
                style={{ left: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Time display */}
          <div className={styles.timeDisplay}>
            <span className={styles.currentTime}>{formatTime(currentTime)}</span>
            <span className={styles.timeSeparator}>/</span>
            <span className={styles.totalTime}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Track name */}
        <div className={styles.trackName}>{item.name}</div>
      </div>
    </div>
  );
}
