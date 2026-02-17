/**
 * WelcomeReadMe - First-time user tutorial window
 *
 * Auto-opens on first login to introduce users to EternalOS.
 * Classic Mac "Read Me" styling with pixel-perfect typography.
 */

import styles from './WelcomeReadMe.module.css';

export function WelcomeReadMe() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <WelcomeIcon />
        </div>
        <h1 className={styles.title}>Welcome to EternalOS</h1>
      </div>

      <div className={styles.content}>
        <p className={styles.intro}>
          Your personal desktop in the browser. Here's how to get started:
        </p>

        <div className={styles.section}>
          <h2>Creating Files</h2>
          <ul>
            <li><strong>New Folder:</strong> File → New Folder (or ⌘N)</li>
            <li><strong>New Text File:</strong> File → New Text File</li>
            <li><strong>Upload:</strong> File → Upload File... (images, text)</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Organizing Your Desktop</h2>
          <ul>
            <li><strong>Move icons:</strong> Click and drag to any position</li>
            <li><strong>Open items:</strong> Double-click folders or files</li>
            <li><strong>Get Info:</strong> Select item, then File → Get Info</li>
            <li><strong>Delete:</strong> Drag items to the Trash</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Sharing Your Desktop</h2>
          <ul>
            <li>Your public URL: <code>/@yourusername</code></li>
            <li>Mark items as "Public" in Get Info to make them visible</li>
            <li>Visitors can browse but not modify anything</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Customization</h2>
          <ul>
            <li><strong>Wallpaper:</strong> Special → Desktop Patterns...</li>
            <li><strong>Desk Assistant:</strong> Special → Desk Assistant (AI helper)</li>
          </ul>
        </div>

        <div className={styles.footer}>
          <p>No likes. No followers. No algorithms.</p>
          <p className={styles.tagline}>Just your corner of the internet.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Mac-style document icon for the welcome window
 */
function WelcomeIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Document body */}
      <rect x="4" y="2" width="20" height="28" fill="white" stroke="black" strokeWidth="2" />
      {/* Folded corner */}
      <polygon points="18,2 24,8 18,8" fill="#C0C0C0" stroke="black" strokeWidth="1" />
      {/* Text lines */}
      <line x1="8" y1="12" x2="20" y2="12" stroke="black" strokeWidth="2" />
      <line x1="8" y1="16" x2="18" y2="16" stroke="black" strokeWidth="2" />
      <line x1="8" y1="20" x2="20" y2="20" stroke="black" strokeWidth="2" />
      <line x1="8" y1="24" x2="14" y2="24" stroke="black" strokeWidth="2" />
    </svg>
  );
}
