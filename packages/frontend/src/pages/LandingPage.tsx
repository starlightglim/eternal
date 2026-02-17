/**
 * LandingPage - EternalOS Welcome Page
 *
 * Retro-styled landing page with:
 * - Headline: "Your corner of the internet"
 * - 3 key value propositions
 * - "Create Your Desktop" CTA
 * - Classic Mac OS aesthetic
 */

import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import styles from './LandingPage.module.css';

export function LandingPage() {
  // SEO meta tags for landing page
  useDocumentMeta({
    title: 'EternalOS - Your corner of the internet',
    description: 'A personal desktop in the browser. No algorithms. No feeds. Just you. Create your digital sanctuary today.',
    ogTitle: 'EternalOS',
    ogDescription: 'A personal desktop in the browser. Place files, receive visitors, enjoy the quiet.',
    ogType: 'website',
    twitterCard: 'summary_large_image',
  });

  return (
    <div className={styles.container}>
      {/* Fake menu bar for authenticity */}
      <div className={styles.menuBar}>
        <span className={styles.menuTitle}>EternalOS</span>
        <div className={styles.menuClock}>
          {new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </div>
      </div>

      {/* Main content - styled as a centered window */}
      <div className={styles.windowContainer}>
        <div className={styles.window}>
          {/* Window title bar */}
          <div className={styles.titleBar}>
            <div className={styles.closeBox} />
            <span className={styles.titleText}>Welcome to EternalOS</span>
          </div>

          {/* Window content */}
          <div className={styles.content}>
            {/* Hero section */}
            <div className={styles.hero}>
              <h1 className={styles.headline}>Your corner of the internet</h1>
              <p className={styles.subheadline}>
                A personal desktop in the browser. No algorithms. No feeds. Just you.
              </p>
            </div>

            {/* Value propositions */}
            <div className={styles.features}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <FolderIcon />
                </div>
                <div className={styles.featureText}>
                  <h3>Place, don't post</h3>
                  <p>Arrange your files on a desktop that feels like home. Drag, drop, organize.</p>
                </div>
              </div>

              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <WindowIcon />
                </div>
                <div className={styles.featureText}>
                  <h3>Visitors, not followers</h3>
                  <p>Share your unique link. People visit your space—no accounts required.</p>
                </div>
              </div>

              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <LockIcon />
                </div>
                <div className={styles.featureText}>
                  <h3>Quiet by design</h3>
                  <p>No likes, no comments, no metrics. A digital sanctuary for depth.</p>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className={styles.cta}>
              <Link to="/signup" className={styles.primaryButton}>
                Create Your Desktop
              </Link>
              <Link to="/login" className={styles.secondaryButton}>
                Log In
              </Link>
            </div>

            {/* Footer note */}
            <p className={styles.footer}>
              Built on Cloudflare. Inspired by classic Mac OS.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop icons decoration */}
      <div className={styles.decorationIcons}>
        <div className={styles.decorIcon} style={{ top: '120px', right: '80px' }}>
          <TrashIcon />
          <span>Trash</span>
        </div>
      </div>
    </div>
  );
}

// Pixel art icons for features
function FolderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="8" width="28" height="20" fill="white" stroke="black" strokeWidth="2" />
      <rect x="2" y="4" width="12" height="6" fill="white" stroke="black" strokeWidth="2" />
      <rect x="4" y="10" width="24" height="2" fill="black" />
    </svg>
  );
}

function WindowIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="4" width="28" height="24" fill="white" stroke="black" strokeWidth="2" />
      <rect x="2" y="4" width="28" height="8" fill="#C0C0C0" stroke="black" strokeWidth="2" />
      <rect x="4" y="6" width="4" height="4" fill="white" stroke="black" strokeWidth="1" />
      <line x1="2" y1="12" x2="30" y2="12" stroke="black" strokeWidth="2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ imageRendering: 'pixelated' }}>
      <rect x="6" y="14" width="20" height="14" fill="white" stroke="black" strokeWidth="2" />
      <path d="M10 14V10C10 6 12 4 16 4C20 4 22 6 22 10V14" stroke="black" strokeWidth="2" fill="none" />
      <circle cx="16" cy="21" r="2" fill="black" />
      <line x1="16" y1="23" x2="16" y2="26" stroke="black" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ imageRendering: 'pixelated' }}>
      <rect x="8" y="8" width="16" height="20" fill="white" stroke="black" strokeWidth="2" />
      <rect x="6" y="4" width="20" height="4" fill="#C0C0C0" stroke="black" strokeWidth="2" />
      <line x1="12" y1="12" x2="12" y2="24" stroke="black" strokeWidth="2" />
      <line x1="16" y1="12" x2="16" y2="24" stroke="black" strokeWidth="2" />
      <line x1="20" y1="12" x2="20" y2="24" stroke="black" strokeWidth="2" />
    </svg>
  );
}
