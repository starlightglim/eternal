import { useState, useRef, useEffect, useCallback } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { getFileUrl, isApiConfigured } from '../../services/api';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  itemId: string;
  r2Key?: string;
  name?: string;
}

/**
 * VideoPlayer - Classic Mac OS-style video player
 * Features bordered video display with playback controls
 */
export function VideoPlayer({ itemId, r2Key: propR2Key, name: propName }: VideoPlayerProps) {
  // Get item from store as fallback (for backwards compatibility)
  const item = useDesktopStore((state) => state.getItem(itemId));
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Prefer prop r2Key, fall back to store item
  const r2Key = propR2Key || item?.r2Key;
  const fileName = propName || item?.name || 'Video';

  // Get video URL
  const videoUrl = r2Key && isApiConfigured
    ? getFileUrl(r2Key)
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
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => {
        console.error('Failed to play video:', err);
        setError('Failed to play video');
      });
    }
  }, [isPlaying]);

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      videoRef.current.requestFullscreen().catch((err) => {
        console.error('Failed to enter fullscreen:', err);
      });
      setIsFullscreen(true);
    }
  }, []);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleLoadedData = () => setIsLoading(false);
    const handleError = () => {
      setError('Failed to load video file');
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      video.currentTime = 0;
    };
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Show error if no r2Key available (item not found in store AND no prop passed)
  if (!r2Key && !item) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Video file not found</div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.demoMode}>
          <div className={styles.demoIcon}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="12" width="48" height="36" fill="#2a2a2a" stroke="#000" strokeWidth="2"/>
              <rect x="12" y="16" width="40" height="28" fill="#1a1a1a"/>
              <polygon points="28,24 28,40 40,32" fill="#808080"/>
              <rect x="6" y="48" width="12" height="8" fill="#808080" stroke="#000" strokeWidth="1"/>
              <rect x="46" y="48" width="12" height="8" fill="#808080" stroke="#000" strokeWidth="1"/>
            </svg>
          </div>
          <p className={styles.demoText}>{fileName}</p>
          <p className={styles.demoSubtext}>Demo mode: No video data</p>
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
      {/* Video display */}
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          src={videoUrl}
          preload="metadata"
          className={styles.video}
          onClick={togglePlay}
        />
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <span>Loading...</span>
          </div>
        )}
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
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" />
              <rect x="9" y="2" width="4" height="12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
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
          </div>
        </div>

        {/* Time display */}
        <div className={styles.timeDisplay}>
          <span>{formatTime(currentTime)}</span>
          <span className={styles.timeSeparator}>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Fullscreen button */}
        <button
          className={styles.fullscreenButton}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            {isFullscreen ? (
              <>
                <path d="M2 6H4V2H8V0H2V6Z" />
                <path d="M14 6V2H10V0H16V6H14Z" />
                <path d="M14 10H16V16H10V14H14V10Z" />
                <path d="M2 10V14H6V16H0V10H2Z" />
              </>
            ) : (
              <>
                <path d="M0 5V0H5V2H2V5H0Z" />
                <path d="M16 5H14V2H11V0H16V5Z" />
                <path d="M16 11V16H11V14H14V11H16Z" />
                <path d="M0 11H2V14H5V16H0V11Z" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
