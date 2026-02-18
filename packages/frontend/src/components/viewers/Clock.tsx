/**
 * Clock - Classic Mac OS Clock widget
 *
 * A simple clock displaying current time with analog and digital displays.
 * Updates every second with classic Mac aesthetic.
 */

import { useState, useEffect } from 'react';
import styles from './Clock.module.css';

export function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calculate angles for clock hands
  const secondAngle = seconds * 6; // 360 / 60 = 6 degrees per second
  const minuteAngle = minutes * 6 + seconds * 0.1; // 6 degrees per minute + smooth movement
  const hourAngle = (hours % 12) * 30 + minutes * 0.5; // 30 degrees per hour + smooth movement

  // Format digital time
  const formatTime = (h: number, m: number, s: number): string => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const displayMinute = m.toString().padStart(2, '0');
    const displaySecond = s.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute}:${displaySecond} ${period}`;
  };

  // Format date
  const formatDate = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <div className={styles.clock}>
      {/* Analog Clock */}
      <div className={styles.analogClock}>
        <div className={styles.clockFace}>
          {/* Hour markers */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={styles.hourMarker}
              style={{
                transform: `rotate(${i * 30}deg) translateY(-38px)`,
              }}
            />
          ))}

          {/* Clock hands */}
          <div
            className={styles.hourHand}
            style={{ transform: `rotate(${hourAngle}deg)` }}
          />
          <div
            className={styles.minuteHand}
            style={{ transform: `rotate(${minuteAngle}deg)` }}
          />
          <div
            className={styles.secondHand}
            style={{ transform: `rotate(${secondAngle}deg)` }}
          />

          {/* Center dot */}
          <div className={styles.centerDot} />
        </div>
      </div>

      {/* Digital Display */}
      <div className={styles.digitalDisplay}>
        <div className={styles.digitalTime}>{formatTime(hours, minutes, seconds)}</div>
        <div className={styles.digitalDate}>{formatDate(time)}</div>
      </div>
    </div>
  );
}
