/**
 * LoadingOverlay - Classic Mac OS "Please wait..." overlay
 *
 * Displays a full-screen overlay with a centered loading dialog
 * styled like Mac OS 8 with watch cursor animation and message.
 */

import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.content}>
          {/* Classic Mac watch cursor animation */}
          <div className={styles.watchIcon}>
            <WatchCursor />
          </div>
          <div className={styles.message}>{message}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated watch cursor - classic Mac "please wait" indicator
 * A simple pixel-art wristwatch with rotating hands
 */
function WatchCursor() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className={styles.watchSvg}
      aria-hidden="true"
    >
      {/* Watch face - outer circle */}
      <circle cx="16" cy="16" r="10" fill="white" stroke="black" strokeWidth="2" />
      {/* Watch band - top */}
      <rect x="12" y="2" width="8" height="4" fill="black" />
      {/* Watch band - bottom */}
      <rect x="12" y="26" width="8" height="4" fill="black" />
      {/* Watch center dot */}
      <circle cx="16" cy="16" r="1" fill="black" />
      {/* Hour hand - rotating */}
      <line
        x1="16"
        y1="16"
        x2="16"
        y2="10"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        className={styles.hourHand}
      />
      {/* Minute hand - rotating faster */}
      <line
        x1="16"
        y1="16"
        x2="16"
        y2="8"
        stroke="black"
        strokeWidth="1"
        strokeLinecap="round"
        className={styles.minuteHand}
      />
    </svg>
  );
}
