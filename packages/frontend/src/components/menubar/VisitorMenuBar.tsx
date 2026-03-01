import { useState, useEffect } from 'react';
import styles from './MenuBar.module.css';

interface VisitorMenuBarProps {
  username: string;
}

/**
 * Visitor Mode Menu Bar
 * Shows "Visiting @username's desktop" with no functional menus
 * Clock still shows on the right side
 */
export function VisitorMenuBar({ username }: VisitorMenuBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Format time for display (12-hour format)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={`${styles.menuBar} menuBar`} eos-name="menubar">
      {/* Visitor indicator instead of Apple menu */}
      <div className={styles.visitorIndicator}>
        <AppleIcon />
        <span className={styles.visitorText}>
          Visiting @{username}'s desktop
        </span>
      </div>

      {/* Clock (right side) */}
      <div className={styles.clock}>{formatTime(currentTime)}</div>
    </div>
  );
}

/**
 * Custom EternalOS logo icon for the menu bar
 */
function AppleIcon() {
  return (
    <span className={styles.appleIconSvg} style={{ marginRight: '8px' }}>𐬽𐬻𐬽𐬻𐬽</span>
  );
}
