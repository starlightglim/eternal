/**
 * Custom Icon Library for EternalOS
 * 32x32 pixel art icons for user customization
 *
 * Categories:
 * - Colored Folders (6 colors)
 * - Emoji-style Icons (25+ icons)
 */

interface IconProps {
  className?: string;
  size?: number;
}

// =============================================================================
// COLORED FOLDERS
// =============================================================================

/**
 * Red Folder Icon
 */
export function RedFolderIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="6" width="10" height="4" fill="#E53935" stroke="#000" strokeWidth="1" />
      <rect x="2" y="9" width="28" height="18" fill="#E53935" stroke="#000" strokeWidth="1" />
      <line x1="3" y1="10" x2="29" y2="10" stroke="#FF6659" strokeWidth="1" />
      <line x1="3" y1="10" x2="3" y2="26" stroke="#FF6659" strokeWidth="1" />
      <line x1="29" y1="10" x2="29" y2="26" stroke="#B71C1C" strokeWidth="1" />
      <line x1="3" y1="26" x2="29" y2="26" stroke="#B71C1C" strokeWidth="1" />
    </svg>
  );
}

/**
 * Blue Folder Icon
 */
export function BlueFolderIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="6" width="10" height="4" fill="#1E88E5" stroke="#000" strokeWidth="1" />
      <rect x="2" y="9" width="28" height="18" fill="#1E88E5" stroke="#000" strokeWidth="1" />
      <line x1="3" y1="10" x2="29" y2="10" stroke="#64B5F6" strokeWidth="1" />
      <line x1="3" y1="10" x2="3" y2="26" stroke="#64B5F6" strokeWidth="1" />
      <line x1="29" y1="10" x2="29" y2="26" stroke="#0D47A1" strokeWidth="1" />
      <line x1="3" y1="26" x2="29" y2="26" stroke="#0D47A1" strokeWidth="1" />
    </svg>
  );
}

/**
 * Green Folder Icon
 */
export function GreenFolderIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="6" width="10" height="4" fill="#43A047" stroke="#000" strokeWidth="1" />
      <rect x="2" y="9" width="28" height="18" fill="#43A047" stroke="#000" strokeWidth="1" />
      <line x1="3" y1="10" x2="29" y2="10" stroke="#81C784" strokeWidth="1" />
      <line x1="3" y1="10" x2="3" y2="26" stroke="#81C784" strokeWidth="1" />
      <line x1="29" y1="10" x2="29" y2="26" stroke="#1B5E20" strokeWidth="1" />
      <line x1="3" y1="26" x2="29" y2="26" stroke="#1B5E20" strokeWidth="1" />
    </svg>
  );
}

/**
 * Purple Folder Icon
 */
export function PurpleFolderIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="6" width="10" height="4" fill="#8E24AA" stroke="#000" strokeWidth="1" />
      <rect x="2" y="9" width="28" height="18" fill="#8E24AA" stroke="#000" strokeWidth="1" />
      <line x1="3" y1="10" x2="29" y2="10" stroke="#BA68C8" strokeWidth="1" />
      <line x1="3" y1="10" x2="3" y2="26" stroke="#BA68C8" strokeWidth="1" />
      <line x1="29" y1="10" x2="29" y2="26" stroke="#4A148C" strokeWidth="1" />
      <line x1="3" y1="26" x2="29" y2="26" stroke="#4A148C" strokeWidth="1" />
    </svg>
  );
}

/**
 * Orange Folder Icon
 */
export function OrangeFolderIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="6" width="10" height="4" fill="#FB8C00" stroke="#000" strokeWidth="1" />
      <rect x="2" y="9" width="28" height="18" fill="#FB8C00" stroke="#000" strokeWidth="1" />
      <line x1="3" y1="10" x2="29" y2="10" stroke="#FFB74D" strokeWidth="1" />
      <line x1="3" y1="10" x2="3" y2="26" stroke="#FFB74D" strokeWidth="1" />
      <line x1="29" y1="10" x2="29" y2="26" stroke="#E65100" strokeWidth="1" />
      <line x1="3" y1="26" x2="29" y2="26" stroke="#E65100" strokeWidth="1" />
    </svg>
  );
}

/**
 * Pink Folder Icon
 */
export function PinkFolderIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="6" width="10" height="4" fill="#EC407A" stroke="#000" strokeWidth="1" />
      <rect x="2" y="9" width="28" height="18" fill="#EC407A" stroke="#000" strokeWidth="1" />
      <line x1="3" y1="10" x2="29" y2="10" stroke="#F48FB1" strokeWidth="1" />
      <line x1="3" y1="10" x2="3" y2="26" stroke="#F48FB1" strokeWidth="1" />
      <line x1="29" y1="10" x2="29" y2="26" stroke="#AD1457" strokeWidth="1" />
      <line x1="3" y1="26" x2="29" y2="26" stroke="#AD1457" strokeWidth="1" />
    </svg>
  );
}

// =============================================================================
// EMOJI-STYLE ICONS
// =============================================================================

/**
 * Star Icon - Classic 5-point star
 */
export function StarIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <polygon
        points="16,2 20,12 30,12 22,18 25,28 16,22 7,28 10,18 2,12 12,12"
        fill="#FFD700"
        stroke="#000"
        strokeWidth="1"
      />
      <polygon
        points="16,5 18,11 12,11"
        fill="#FFF59D"
      />
    </svg>
  );
}

/**
 * Heart Icon - Classic heart shape
 */
export function HeartIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path
        d="M16 28 C16 28 4 18 4 10 C4 5 8 2 12 2 C14 2 16 4 16 6 C16 4 18 2 20 2 C24 2 28 5 28 10 C28 18 16 28 16 28"
        fill="#E53935"
        stroke="#000"
        strokeWidth="1"
      />
      <ellipse cx="10" cy="8" rx="2" ry="1" fill="#FF8A80" />
    </svg>
  );
}

/**
 * Music Note Icon - Single eighth note
 */
export function MusicNoteIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <ellipse cx="10" cy="24" rx="6" ry="4" fill="#1E88E5" stroke="#000" strokeWidth="1" />
      <rect x="14" y="6" width="3" height="18" fill="#1E88E5" stroke="#000" strokeWidth="1" />
      <path
        d="M17 6 Q24 4 26 10 Q24 14 17 12 Z"
        fill="#1E88E5"
        stroke="#000"
        strokeWidth="1"
      />
      <line x1="15" y1="8" x2="15" y2="12" stroke="#64B5F6" strokeWidth="1" />
    </svg>
  );
}

/**
 * Camera Icon - Classic camera
 */
export function CameraIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="10" width="28" height="18" fill="#424242" stroke="#000" strokeWidth="1" />
      <rect x="10" y="6" width="12" height="5" fill="#616161" stroke="#000" strokeWidth="1" />
      <circle cx="16" cy="19" r="6" fill="#1E88E5" stroke="#000" strokeWidth="1" />
      <circle cx="16" cy="19" r="3" fill="#0D47A1" stroke="#000" strokeWidth="1" />
      <circle cx="15" cy="18" r="1" fill="#64B5F6" />
      <rect x="24" y="12" width="4" height="3" fill="#E53935" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Book Icon - Closed book
 */
export function BookIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="6" y="4" width="20" height="24" fill="#8D6E63" stroke="#000" strokeWidth="1" />
      <rect x="8" y="4" width="16" height="24" fill="#D32F2F" stroke="#000" strokeWidth="1" />
      <line x1="9" y1="4" x2="9" y2="28" stroke="#EF5350" strokeWidth="1" />
      <rect x="10" y="6" width="12" height="3" fill="#FFECB3" stroke="#000" strokeWidth="1" />
      <line x1="12" y1="12" x2="20" y2="12" stroke="#FFECB3" strokeWidth="1" />
      <line x1="12" y1="15" x2="18" y2="15" stroke="#FFECB3" strokeWidth="1" />
    </svg>
  );
}

/**
 * Game Controller Icon
 */
export function GameControllerIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path
        d="M4 12 Q4 8 8 8 L24 8 Q28 8 28 12 L28 20 Q28 26 22 26 L20 20 L12 20 L10 26 Q4 26 4 20 Z"
        fill="#424242"
        stroke="#000"
        strokeWidth="1"
      />
      <rect x="7" y="13" width="2" height="6" fill="#616161" stroke="#000" strokeWidth="1" />
      <rect x="6" y="15" width="4" height="2" fill="#616161" stroke="#000" strokeWidth="1" />
      <circle cx="22" cy="13" r="2" fill="#E53935" stroke="#000" strokeWidth="1" />
      <circle cx="25" cy="16" r="2" fill="#1E88E5" stroke="#000" strokeWidth="1" />
      <rect x="14" y="18" width="4" height="1" fill="#616161" />
    </svg>
  );
}

/**
 * Coffee Icon - Coffee cup
 */
export function CoffeeIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path d="M8 10 L10 28 L22 28 L24 10 Z" fill="#FFFFFF" stroke="#000" strokeWidth="1" />
      <rect x="8" y="10" width="16" height="4" fill="#6D4C41" stroke="#000" strokeWidth="1" />
      <path d="M24 12 Q30 12 30 18 Q30 24 24 24" fill="none" stroke="#000" strokeWidth="2" />
      <path d="M10 6 Q11 4 12 6" fill="none" stroke="#9E9E9E" strokeWidth="1" />
      <path d="M15 5 Q16 3 17 5" fill="none" stroke="#9E9E9E" strokeWidth="1" />
      <path d="M20 6 Q21 4 22 6" fill="none" stroke="#9E9E9E" strokeWidth="1" />
    </svg>
  );
}

/**
 * Planet Icon - Saturn-like planet with ring
 */
export function PlanetIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <ellipse cx="16" cy="16" rx="14" ry="4" fill="none" stroke="#FFB74D" strokeWidth="2" />
      <circle cx="16" cy="16" r="8" fill="#FF7043" stroke="#000" strokeWidth="1" />
      <ellipse cx="16" cy="16" rx="14" ry="4" fill="none" stroke="#000" strokeWidth="1"
        strokeDasharray="0 12 28 100" />
      <path d="M12 12 Q14 10 18 12" fill="none" stroke="#FFAB91" strokeWidth="1" />
      <line x1="10" y1="18" x2="22" y2="18" stroke="#BF360C" strokeWidth="1" />
    </svg>
  );
}

/**
 * Lightning Icon - Lightning bolt
 */
export function LightningIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <polygon
        points="18,2 8,14 14,14 12,30 24,16 17,16 22,2"
        fill="#FFD600"
        stroke="#000"
        strokeWidth="1"
      />
      <polygon
        points="17,4 10,13 14,13"
        fill="#FFFF8D"
      />
    </svg>
  );
}

/**
 * Fire Icon - Flame
 */
export function FireIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path
        d="M16 2 Q22 8 22 14 Q26 10 24 18 Q28 16 26 24 Q26 30 16 30 Q6 30 6 24 Q4 16 8 18 Q6 10 10 14 Q10 8 16 2"
        fill="#FF6D00"
        stroke="#000"
        strokeWidth="1"
      />
      <path
        d="M16 10 Q20 14 18 20 Q18 26 16 28 Q14 26 14 20 Q12 14 16 10"
        fill="#FFD600"
      />
      <path
        d="M16 16 Q18 18 17 22 Q17 26 16 26 Q15 26 15 22 Q14 18 16 16"
        fill="#FFFF8D"
      />
    </svg>
  );
}

/**
 * Sparkle Icon - Magic sparkle/star burst
 */
export function SparkleIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <polygon
        points="16,2 18,12 28,16 18,20 16,30 14,20 4,16 14,12"
        fill="#AB47BC"
        stroke="#000"
        strokeWidth="1"
      />
      <polygon
        points="16,6 17,13 14,13"
        fill="#E1BEE7"
      />
      <circle cx="8" cy="8" r="2" fill="#CE93D8" stroke="#000" strokeWidth="1" />
      <circle cx="26" cy="24" r="2" fill="#CE93D8" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Clock Icon - Wall clock
 */
export function ClockIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <circle cx="16" cy="16" r="13" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
      <circle cx="16" cy="16" r="11" fill="#FAFAFA" stroke="#000" strokeWidth="1" />
      <line x1="16" y1="6" x2="16" y2="8" stroke="#000" strokeWidth="2" />
      <line x1="16" y1="24" x2="16" y2="26" stroke="#000" strokeWidth="2" />
      <line x1="6" y1="16" x2="8" y2="16" stroke="#000" strokeWidth="2" />
      <line x1="24" y1="16" x2="26" y2="16" stroke="#000" strokeWidth="2" />
      <line x1="16" y1="16" x2="16" y2="9" stroke="#000" strokeWidth="2" />
      <line x1="16" y1="16" x2="22" y2="16" stroke="#000" strokeWidth="2" />
      <circle cx="16" cy="16" r="2" fill="#E53935" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Mail Icon - Envelope
 */
export function MailIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="6" width="28" height="20" fill="#FFFFFF" stroke="#000" strokeWidth="1" />
      <polyline points="2,6 16,18 30,6" fill="none" stroke="#000" strokeWidth="1" />
      <line x1="2" y1="26" x2="12" y2="16" stroke="#000" strokeWidth="1" />
      <line x1="30" y1="26" x2="20" y2="16" stroke="#000" strokeWidth="1" />
      <polygon points="2,6 16,18 30,6 30,8 16,20 2,8" fill="#E0E0E0" />
    </svg>
  );
}

/**
 * Key Icon - Classic key
 */
export function KeyIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <circle cx="10" cy="10" r="6" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <circle cx="10" cy="10" r="2" fill="#FFFFFF" stroke="#000" strokeWidth="1" />
      <rect x="14" y="8" width="14" height="4" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <rect x="24" y="12" width="3" height="4" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <rect x="20" y="12" width="3" height="3" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <line x1="9" y1="6" x2="11" y2="8" stroke="#FFFF8D" strokeWidth="1" />
    </svg>
  );
}

/**
 * Lock Icon - Padlock
 */
export function LockIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="6" y="14" width="20" height="14" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <path d="M10 14 L10 10 Q10 4 16 4 Q22 4 22 10 L22 14" fill="none" stroke="#000" strokeWidth="2" />
      <circle cx="16" cy="21" r="2" fill="#000" />
      <rect x="15" y="21" width="2" height="4" fill="#000" />
      <line x1="8" y1="16" x2="24" y2="16" stroke="#FFFF8D" strokeWidth="1" />
    </svg>
  );
}

/**
 * Gift Icon - Wrapped present
 */
export function GiftIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="4" y="12" width="24" height="16" fill="#E53935" stroke="#000" strokeWidth="1" />
      <rect x="4" y="8" width="24" height="5" fill="#EF5350" stroke="#000" strokeWidth="1" />
      <rect x="14" y="8" width="4" height="20" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <rect x="4" y="10" width="24" height="4" fill="none" stroke="none" />
      <rect x="6" y="10" width="8" height="3" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <rect x="18" y="10" width="8" height="3" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <ellipse cx="12" cy="6" rx="4" ry="3" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <ellipse cx="20" cy="6" rx="4" ry="3" fill="#FFD600" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Flag Icon - Waving flag
 */
export function FlagIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="6" y="4" width="2" height="26" fill="#8D6E63" stroke="#000" strokeWidth="1" />
      <path
        d="M8 4 L28 4 Q26 10 28 16 L8 16 Z"
        fill="#E53935"
        stroke="#000"
        strokeWidth="1"
      />
      <line x1="8" y1="6" x2="26" y2="6" stroke="#EF5350" strokeWidth="1" />
    </svg>
  );
}

/**
 * Leaf Icon - Nature leaf
 */
export function LeafIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path
        d="M16 4 Q28 4 28 16 Q28 28 16 28 Q16 16 6 16 Q6 4 16 4"
        fill="#43A047"
        stroke="#000"
        strokeWidth="1"
      />
      <path d="M16 28 Q16 16 28 16" fill="none" stroke="#81C784" strokeWidth="2" />
      <path d="M8 28 Q10 22 16 28" fill="none" stroke="#6D4C41" strokeWidth="2" />
    </svg>
  );
}

/**
 * Sun Icon - Bright sun
 */
export function SunIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <circle cx="16" cy="16" r="7" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="#FFD600" strokeWidth="2" />
      <line x1="16" y1="26" x2="16" y2="30" stroke="#FFD600" strokeWidth="2" />
      <line x1="2" y1="16" x2="6" y2="16" stroke="#FFD600" strokeWidth="2" />
      <line x1="26" y1="16" x2="30" y2="16" stroke="#FFD600" strokeWidth="2" />
      <line x1="6" y1="6" x2="9" y2="9" stroke="#FFD600" strokeWidth="2" />
      <line x1="23" y1="23" x2="26" y2="26" stroke="#FFD600" strokeWidth="2" />
      <line x1="6" y1="26" x2="9" y2="23" stroke="#FFD600" strokeWidth="2" />
      <line x1="23" y1="9" x2="26" y2="6" stroke="#FFD600" strokeWidth="2" />
      <circle cx="14" cy="14" r="2" fill="#FFFF8D" />
    </svg>
  );
}

/**
 * Moon Icon - Crescent moon
 */
export function MoonIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path
        d="M20 4 Q28 8 28 16 Q28 24 20 28 Q24 24 24 16 Q24 8 20 4"
        fill="#FFD600"
        stroke="#000"
        strokeWidth="1"
      />
      <circle cx="8" cy="8" r="1" fill="#FFFF8D" />
      <circle cx="12" cy="24" r="1" fill="#FFFF8D" />
      <circle cx="6" cy="18" r="2" fill="#FFFF8D" />
    </svg>
  );
}

/**
 * Cloud Icon - Fluffy cloud
 */
export function CloudIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path
        d="M8 24 Q2 24 2 18 Q2 14 6 14 Q6 8 14 8 Q20 8 22 12 Q28 12 28 18 Q28 24 22 24 Z"
        fill="#FFFFFF"
        stroke="#000"
        strokeWidth="1"
      />
      <path
        d="M6 16 Q4 16 4 18 Q4 22 8 22"
        fill="none"
        stroke="#E0E0E0"
        strokeWidth="1"
      />
    </svg>
  );
}

/**
 * Rainbow Icon - Colorful rainbow arc
 */
export function RainbowIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path d="M2 28 Q2 8 16 8 Q30 8 30 28" fill="none" stroke="#E53935" strokeWidth="3" />
      <path d="M5 28 Q5 11 16 11 Q27 11 27 28" fill="none" stroke="#FF9800" strokeWidth="3" />
      <path d="M8 28 Q8 14 16 14 Q24 14 24 28" fill="none" stroke="#FFEB3B" strokeWidth="3" />
      <path d="M11 28 Q11 17 16 17 Q21 17 21 28" fill="none" stroke="#4CAF50" strokeWidth="3" />
      <path d="M14 28 Q14 20 16 20 Q18 20 18 28" fill="none" stroke="#2196F3" strokeWidth="3" />
    </svg>
  );
}

/**
 * Diamond Icon - Gem/crystal
 */
export function DiamondIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <polygon points="16,2 28,12 16,30 4,12" fill="#4FC3F7" stroke="#000" strokeWidth="1" />
      <polygon points="16,2 22,12 16,12 10,12 16,2" fill="#81D4FA" stroke="#000" strokeWidth="1" />
      <polygon points="10,12 16,12 16,30 4,12" fill="#29B6F6" stroke="#000" strokeWidth="1" />
      <line x1="16" y1="12" x2="16" y2="30" stroke="#000" strokeWidth="1" />
      <polygon points="16,4 18,10 14,10" fill="#E1F5FE" />
    </svg>
  );
}

/**
 * Lightbulb Icon - Idea bulb
 */
export function LightbulbIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path
        d="M12 20 Q8 18 8 12 Q8 4 16 4 Q24 4 24 12 Q24 18 20 20 Z"
        fill="#FFD600"
        stroke="#000"
        strokeWidth="1"
      />
      <rect x="12" y="20" width="8" height="4" fill="#E0E0E0" stroke="#000" strokeWidth="1" />
      <rect x="13" y="24" width="6" height="2" fill="#9E9E9E" stroke="#000" strokeWidth="1" />
      <path d="M14 26 Q16 28 18 26" fill="#9E9E9E" stroke="#000" strokeWidth="1" />
      <line x1="14" y1="21" x2="18" y2="21" stroke="#000" strokeWidth="1" />
      <line x1="14" y1="23" x2="18" y2="23" stroke="#000" strokeWidth="1" />
      <path d="M12 10 Q14 8 16 10" fill="none" stroke="#FFFF8D" strokeWidth="1" />
    </svg>
  );
}

/**
 * Rocket Icon - Space rocket
 */
export function RocketIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path
        d="M16 2 Q22 8 22 18 L20 24 L12 24 L10 18 Q10 8 16 2"
        fill="#E0E0E0"
        stroke="#000"
        strokeWidth="1"
      />
      <ellipse cx="16" cy="12" rx="3" ry="4" fill="#4FC3F7" stroke="#000" strokeWidth="1" />
      <polygon points="10,18 6,24 10,22" fill="#E53935" stroke="#000" strokeWidth="1" />
      <polygon points="22,18 26,24 22,22" fill="#E53935" stroke="#000" strokeWidth="1" />
      <polygon points="12,24 16,30 20,24" fill="#FF9800" stroke="#000" strokeWidth="1" />
      <polygon points="14,24 16,28 18,24" fill="#FFD600" />
      <line x1="14" y1="6" x2="15" y2="8" stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
}

/**
 * Palette Icon - Artist palette
 */
export function PaletteIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <ellipse cx="16" cy="16" rx="13" ry="11" fill="#8D6E63" stroke="#000" strokeWidth="1" />
      <ellipse cx="20" cy="22" rx="3" ry="2" fill="#8D6E63" stroke="#000" strokeWidth="1" />
      <circle cx="10" cy="12" r="3" fill="#E53935" stroke="#000" strokeWidth="1" />
      <circle cx="16" cy="9" r="2" fill="#FFD600" stroke="#000" strokeWidth="1" />
      <circle cx="22" cy="11" r="2" fill="#4CAF50" stroke="#000" strokeWidth="1" />
      <circle cx="10" cy="20" r="2" fill="#2196F3" stroke="#000" strokeWidth="1" />
      <circle cx="16" cy="18" r="2" fill="#9C27B0" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Pencil Icon - Writing pencil
 */
export function PencilIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <polygon points="4,28 6,20 12,26" fill="#FFCC80" stroke="#000" strokeWidth="1" />
      <rect x="6" y="6" width="6" height="18" fill="#FFD600" stroke="#000" strokeWidth="1" transform="rotate(45 9 15)" />
      <polygon points="21,3 27,9 24,12 18,6" fill="#EF9A9A" stroke="#000" strokeWidth="1" />
      <line x1="5" y1="27" x2="7" y2="22" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Terminal Icon - Command prompt
 */
export function TerminalIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="4" width="28" height="24" fill="#1E1E1E" stroke="#000" strokeWidth="1" />
      <rect x="4" y="6" width="24" height="20" fill="#0D0D0D" stroke="#333" strokeWidth="1" />
      <polyline points="8,12 12,16 8,20" fill="none" stroke="#4CAF50" strokeWidth="2" />
      <line x1="14" y1="20" x2="22" y2="20" stroke="#4CAF50" strokeWidth="2" />
    </svg>
  );
}

/**
 * Folder with Badge - Generic folder with customizable badge
 */
export function FolderBadgeIcon({ className, size = 32, badgeColor = '#E53935' }: IconProps & { badgeColor?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="2" y="6" width="10" height="4" fill="#FFCC00" stroke="#000" strokeWidth="1" />
      <rect x="2" y="9" width="28" height="18" fill="#FFCC00" stroke="#000" strokeWidth="1" />
      <line x1="3" y1="10" x2="29" y2="10" stroke="#FFE066" strokeWidth="1" />
      <line x1="3" y1="10" x2="3" y2="26" stroke="#FFE066" strokeWidth="1" />
      <line x1="29" y1="10" x2="29" y2="26" stroke="#CC9900" strokeWidth="1" />
      <line x1="3" y1="26" x2="29" y2="26" stroke="#CC9900" strokeWidth="1" />
      <circle cx="24" cy="12" r="5" fill={badgeColor} stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Photo Icon - Instant photo
 */
export function PhotoIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="4" y="2" width="24" height="28" fill="#FFFFFF" stroke="#000" strokeWidth="1" />
      <rect x="6" y="4" width="20" height="18" fill="#87CEEB" stroke="#000" strokeWidth="1" />
      <polygon points="6,18 12,12 18,16 26,10 26,22 6,22" fill="#43A047" />
      <circle cx="20" cy="10" r="3" fill="#FFD600" />
    </svg>
  );
}

/**
 * Headphones Icon - Music headphones
 */
export function HeadphonesIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <path d="M6 18 Q6 6 16 6 Q26 6 26 18" fill="none" stroke="#424242" strokeWidth="3" />
      <rect x="4" y="16" width="6" height="10" rx="2" fill="#424242" stroke="#000" strokeWidth="1" />
      <rect x="22" y="16" width="6" height="10" rx="2" fill="#424242" stroke="#000" strokeWidth="1" />
      <rect x="5" y="18" width="4" height="6" fill="#9E9E9E" stroke="#000" strokeWidth="1" />
      <rect x="23" y="18" width="4" height="6" fill="#9E9E9E" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/**
 * Home Icon - House
 */
export function HomeIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <polygon points="16,4 2,16 6,16 6,28 26,28 26,16 30,16" fill="#8D6E63" stroke="#000" strokeWidth="1" />
      <rect x="8" y="16" width="6" height="12" fill="#FFCC80" stroke="#000" strokeWidth="1" />
      <rect x="18" y="18" width="5" height="5" fill="#87CEEB" stroke="#000" strokeWidth="1" />
      <polygon points="16,4 4,14 6,16 16,8 26,16 28,14" fill="#D32F2F" stroke="#000" strokeWidth="1" />
      <rect x="22" y="6" width="3" height="6" fill="#757575" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

// =============================================================================
// ICON REGISTRY
// =============================================================================

/**
 * All available custom icons with metadata
 */
export const CUSTOM_ICON_LIBRARY = {
  // Colored Folders
  'folder-red': { component: RedFolderIcon, label: 'Red Folder', category: 'folders' },
  'folder-blue': { component: BlueFolderIcon, label: 'Blue Folder', category: 'folders' },
  'folder-green': { component: GreenFolderIcon, label: 'Green Folder', category: 'folders' },
  'folder-purple': { component: PurpleFolderIcon, label: 'Purple Folder', category: 'folders' },
  'folder-orange': { component: OrangeFolderIcon, label: 'Orange Folder', category: 'folders' },
  'folder-pink': { component: PinkFolderIcon, label: 'Pink Folder', category: 'folders' },

  // Emoji-style Icons
  'star': { component: StarIcon, label: 'Star', category: 'symbols' },
  'heart': { component: HeartIcon, label: 'Heart', category: 'symbols' },
  'music-note': { component: MusicNoteIcon, label: 'Music Note', category: 'media' },
  'camera': { component: CameraIcon, label: 'Camera', category: 'media' },
  'book': { component: BookIcon, label: 'Book', category: 'objects' },
  'game-controller': { component: GameControllerIcon, label: 'Game Controller', category: 'objects' },
  'coffee': { component: CoffeeIcon, label: 'Coffee', category: 'objects' },
  'planet': { component: PlanetIcon, label: 'Planet', category: 'nature' },
  'lightning': { component: LightningIcon, label: 'Lightning', category: 'nature' },
  'fire': { component: FireIcon, label: 'Fire', category: 'nature' },
  'sparkle': { component: SparkleIcon, label: 'Sparkle', category: 'symbols' },
  'clock': { component: ClockIcon, label: 'Clock', category: 'objects' },
  'mail': { component: MailIcon, label: 'Mail', category: 'objects' },
  'key': { component: KeyIcon, label: 'Key', category: 'objects' },
  'lock': { component: LockIcon, label: 'Lock', category: 'objects' },
  'gift': { component: GiftIcon, label: 'Gift', category: 'objects' },
  'flag': { component: FlagIcon, label: 'Flag', category: 'objects' },
  'leaf': { component: LeafIcon, label: 'Leaf', category: 'nature' },
  'sun': { component: SunIcon, label: 'Sun', category: 'nature' },
  'moon': { component: MoonIcon, label: 'Moon', category: 'nature' },
  'cloud': { component: CloudIcon, label: 'Cloud', category: 'nature' },
  'rainbow': { component: RainbowIcon, label: 'Rainbow', category: 'nature' },
  'diamond': { component: DiamondIcon, label: 'Diamond', category: 'symbols' },
  'lightbulb': { component: LightbulbIcon, label: 'Lightbulb', category: 'objects' },
  'rocket': { component: RocketIcon, label: 'Rocket', category: 'objects' },
  'palette': { component: PaletteIcon, label: 'Palette', category: 'objects' },
  'pencil': { component: PencilIcon, label: 'Pencil', category: 'objects' },
  'terminal': { component: TerminalIcon, label: 'Terminal', category: 'tech' },
  'photo': { component: PhotoIcon, label: 'Photo', category: 'media' },
  'headphones': { component: HeadphonesIcon, label: 'Headphones', category: 'media' },
  'home': { component: HomeIcon, label: 'Home', category: 'objects' },
} as const;

export type CustomIconId = keyof typeof CUSTOM_ICON_LIBRARY;

/**
 * Get all icons grouped by category
 */
export function getIconsByCategory() {
  const categories: Record<string, Array<{ id: CustomIconId; label: string; component: React.FC<IconProps> }>> = {};

  for (const [id, data] of Object.entries(CUSTOM_ICON_LIBRARY)) {
    if (!categories[data.category]) {
      categories[data.category] = [];
    }
    categories[data.category].push({
      id: id as CustomIconId,
      label: data.label,
      component: data.component,
    });
  }

  return categories;
}

/**
 * Render a custom icon by its ID
 */
export function renderCustomIcon(iconId: CustomIconId | string, size = 32, className?: string) {
  const iconData = CUSTOM_ICON_LIBRARY[iconId as CustomIconId];
  if (!iconData) return null;

  const IconComponent = iconData.component;
  return <IconComponent size={size} className={className} />;
}
