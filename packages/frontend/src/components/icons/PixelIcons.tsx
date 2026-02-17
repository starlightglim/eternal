/**
 * Pixel Art Icons for EternalOS
 * 32x32 pixel art icons inspired by classic Macintosh
 * Using inline SVG for pixel-perfect rendering
 */

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Folder Icon - Classic Mac folder with tab on top-left
 */
export function FolderIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Tab */}
      <rect x="2" y="6" width="10" height="4" fill="#FFCC00" stroke="#000" strokeWidth="1" />
      {/* Main body */}
      <rect x="2" y="9" width="28" height="18" fill="#FFCC00" stroke="#000" strokeWidth="1" />
      {/* Highlight */}
      <line x1="3" y1="10" x2="29" y2="10" stroke="#FFE066" strokeWidth="1" />
      <line x1="3" y1="10" x2="3" y2="26" stroke="#FFE066" strokeWidth="1" />
      {/* Shadow */}
      <line x1="29" y1="10" x2="29" y2="26" stroke="#CC9900" strokeWidth="1" />
      <line x1="3" y1="26" x2="29" y2="26" stroke="#CC9900" strokeWidth="1" />
    </svg>
  );
}

/**
 * Document/Text File Icon
 */
export function TextFileIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Page */}
      <path
        d="M6 2 L6 30 L26 30 L26 8 L20 2 Z"
        fill="#FFFFFF"
        stroke="#000"
        strokeWidth="1"
      />
      {/* Folded corner */}
      <path d="M20 2 L20 8 L26 8" fill="#C0C0C0" stroke="#000" strokeWidth="1" />
      {/* Text lines */}
      <line x1="9" y1="12" x2="23" y2="12" stroke="#000" strokeWidth="1" />
      <line x1="9" y1="16" x2="23" y2="16" stroke="#000" strokeWidth="1" />
      <line x1="9" y1="20" x2="18" y2="20" stroke="#000" strokeWidth="1" />
      <line x1="9" y1="24" x2="20" y2="24" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Image File Icon
 */
export function ImageFileIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Frame */}
      <rect x="4" y="4" width="24" height="24" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
      {/* Inner border */}
      <rect x="6" y="6" width="20" height="20" fill="#E0E0E0" stroke="#808080" strokeWidth="1" />
      {/* Mountains/landscape */}
      <polygon points="8,22 14,14 20,20 26,12 26,24 8,24" fill="#008000" />
      {/* Sun */}
      <circle cx="22" cy="12" r="3" fill="#FFCC00" />
    </svg>
  );
}

/**
 * Link/URL Icon
 */
export function LinkIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Globe */}
      <circle cx="16" cy="16" r="12" fill="#4169E1" stroke="#000" strokeWidth="1" />
      {/* Latitude lines */}
      <ellipse cx="16" cy="16" rx="12" ry="5" fill="none" stroke="#000" strokeWidth="1" />
      <line x1="4" y1="16" x2="28" y2="16" stroke="#000" strokeWidth="1" />
      {/* Longitude lines */}
      <ellipse cx="16" cy="16" rx="5" ry="12" fill="none" stroke="#000" strokeWidth="1" />
      <line x1="16" y1="4" x2="16" y2="28" stroke="#000" strokeWidth="1" />
      {/* Highlight */}
      <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}

/**
 * Trash Icon (Empty)
 */
export function TrashEmptyIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Lid */}
      <rect x="6" y="4" width="20" height="4" fill="#C0C0C0" stroke="#000" strokeWidth="1" />
      <rect x="12" y="2" width="8" height="3" fill="#C0C0C0" stroke="#000" strokeWidth="1" />
      {/* Body */}
      <path
        d="M8 8 L10 28 L22 28 L24 8 Z"
        fill="#C0C0C0"
        stroke="#000"
        strokeWidth="1"
      />
      {/* Ridges */}
      <line x1="12" y1="10" x2="12" y2="26" stroke="#808080" strokeWidth="1" />
      <line x1="16" y1="10" x2="16" y2="26" stroke="#808080" strokeWidth="1" />
      <line x1="20" y1="10" x2="20" y2="26" stroke="#808080" strokeWidth="1" />
    </svg>
  );
}

/**
 * Trash Icon (Full)
 */
export function TrashFullIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Paper sticking out */}
      <rect x="10" y="0" width="6" height="6" fill="#FFFFFF" stroke="#000" strokeWidth="1" transform="rotate(-15 13 3)" />
      <rect x="16" y="1" width="5" height="5" fill="#FFFFFF" stroke="#000" strokeWidth="1" transform="rotate(10 18 3)" />
      {/* Lid (slightly open) */}
      <rect x="6" y="5" width="20" height="4" fill="#C0C0C0" stroke="#000" strokeWidth="1" transform="rotate(-5 16 7)" />
      <rect x="12" y="3" width="8" height="3" fill="#C0C0C0" stroke="#000" strokeWidth="1" transform="rotate(-5 16 4)" />
      {/* Body */}
      <path
        d="M8 9 L10 28 L22 28 L24 9 Z"
        fill="#C0C0C0"
        stroke="#000"
        strokeWidth="1"
      />
      {/* Ridges */}
      <line x1="12" y1="11" x2="12" y2="26" stroke="#808080" strokeWidth="1" />
      <line x1="16" y1="11" x2="16" y2="26" stroke="#808080" strokeWidth="1" />
      <line x1="20" y1="11" x2="20" y2="26" stroke="#808080" strokeWidth="1" />
    </svg>
  );
}

/**
 * Desk Assistant Icon - Classic Mac terminal/computer icon
 */
export function AssistantIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Monitor body */}
      <rect x="3" y="2" width="26" height="20" fill="#C0C0C0" stroke="#000" strokeWidth="1" />
      {/* Monitor highlight */}
      <line x1="4" y1="3" x2="28" y2="3" stroke="#FFFFFF" strokeWidth="1" />
      <line x1="4" y1="3" x2="4" y2="21" stroke="#FFFFFF" strokeWidth="1" />
      {/* Monitor shadow */}
      <line x1="28" y1="3" x2="28" y2="21" stroke="#808080" strokeWidth="1" />
      <line x1="4" y1="21" x2="28" y2="21" stroke="#808080" strokeWidth="1" />
      {/* Screen */}
      <rect x="5" y="4" width="22" height="14" fill="#000000" stroke="#000" strokeWidth="1" />
      {/* Screen inner border */}
      <rect x="6" y="5" width="20" height="12" fill="#001a00" stroke="none" />
      {/* Terminal text lines (green on black) */}
      <line x1="8" y1="8" x2="16" y2="8" stroke="#00FF00" strokeWidth="1" />
      <line x1="8" y1="11" x2="20" y2="11" stroke="#00FF00" strokeWidth="1" />
      <line x1="8" y1="14" x2="12" y2="14" stroke="#00FF00" strokeWidth="1" />
      {/* Blinking cursor */}
      <rect x="13" y="13" width="2" height="3" fill="#00FF00" />
      {/* Stand neck */}
      <rect x="13" y="22" width="6" height="3" fill="#808080" stroke="#000" strokeWidth="1" />
      {/* Stand base */}
      <rect x="9" y="25" width="14" height="4" fill="#C0C0C0" stroke="#000" strokeWidth="1" />
      {/* Base highlight */}
      <line x1="10" y1="26" x2="22" y2="26" stroke="#FFFFFF" strokeWidth="1" />
      {/* Base shadow */}
      <line x1="10" y1="28" x2="22" y2="28" stroke="#808080" strokeWidth="1" />
    </svg>
  );
}

