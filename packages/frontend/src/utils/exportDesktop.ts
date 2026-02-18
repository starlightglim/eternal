/**
 * Export Desktop - Generates a static HTML archive of the user's desktop
 *
 * Creates a self-contained HTML file that displays the desktop items
 * with classic Mac OS styling, viewable offline without EternalOS.
 */

import type { DesktopItem } from '../types';

interface ExportOptions {
  items: DesktopItem[];
  username: string;
  wallpaper: string;
}

/**
 * Generates a static HTML file representing the desktop
 */
export function generateDesktopHTML(options: ExportOptions): string {
  const { items, username, wallpaper } = options;

  // Filter to root-level items (not in folders) and not trashed
  const rootItems = items.filter((item) => item.parentId === null && !item.isTrashed);

  // Generate icon HTML for each item
  const iconsHTML = rootItems
    .map((item) => {
      const left = item.position.x * 80;
      const top = item.position.y * 80 + 20; // Account for menu bar

      const iconSvg = getIconSVG(item.type);
      const displayName = item.name.length > 12 ? item.name.slice(0, 10) + '...' : item.name;

      return `
      <div class="desktop-icon" style="left: ${left}px; top: ${top}px;">
        <div class="icon-image">${iconSvg}</div>
        <div class="icon-label">${escapeHtml(displayName)}</div>
      </div>`;
    })
    .join('\n');

  // Generate folder contents summary
  const folderContents = items
    .filter((item) => item.type === 'folder' && !item.isTrashed)
    .map((folder) => {
      const children = items.filter((i) => i.parentId === folder.id && !i.isTrashed);
      if (children.length === 0) return '';
      return `
      <div class="folder-summary">
        <h3>📁 ${escapeHtml(folder.name)}</h3>
        <ul>
          ${children.map((c) => `<li>${getTypeEmoji(c.type)} ${escapeHtml(c.name)}</li>`).join('\n')}
        </ul>
      </div>`;
    })
    .filter(Boolean)
    .join('\n');

  const timestamp = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(username)}'s Desktop - EternalOS Export</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, "Geneva", "Helvetica Neue", sans-serif;
      background-color: #C0C0C0;
      min-height: 100vh;
      overflow: hidden;
    }

    /* Menu Bar */
    .menu-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 20px;
      background-color: #FFFFFF;
      border-bottom: 1px solid #000000;
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 12px;
      z-index: 1000;
    }

    .menu-bar span {
      margin-right: 16px;
    }

    .menu-bar .clock {
      margin-left: auto;
    }

    /* Desktop Surface */
    .desktop {
      position: absolute;
      top: 20px;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #C0C0C0;
      ${getWallpaperStyle(wallpaper)}
    }

    /* Desktop Icons */
    .desktop-icon {
      position: absolute;
      width: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px;
      cursor: default;
    }

    .icon-image {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-image svg {
      width: 32px;
      height: 32px;
    }

    .icon-label {
      font-size: 9px;
      text-align: center;
      margin-top: 2px;
      max-width: 72px;
      word-break: break-word;
      line-height: 1.2;
    }

    /* Export Info */
    .export-info {
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: white;
      border: 2px solid black;
      padding: 12px 16px;
      font-size: 11px;
      max-width: 300px;
      box-shadow:
        2px 2px 0 #808080,
        inset -1px -1px 0 #808080,
        inset 1px 1px 0 #DFDFDF;
    }

    .export-info h2 {
      font-size: 12px;
      margin-bottom: 8px;
      border-bottom: 1px solid #808080;
      padding-bottom: 4px;
    }

    .export-info p {
      margin: 4px 0;
      color: #333;
    }

    /* Folder Summaries */
    .folder-summaries {
      position: fixed;
      top: 40px;
      right: 20px;
      max-height: calc(100vh - 160px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .folder-summary {
      background: white;
      border: 2px solid black;
      padding: 8px;
      font-size: 10px;
      min-width: 150px;
      box-shadow:
        2px 2px 0 #808080,
        inset -1px -1px 0 #808080,
        inset 1px 1px 0 #DFDFDF;
    }

    .folder-summary h3 {
      font-size: 11px;
      margin-bottom: 4px;
      border-bottom: 1px solid #C0C0C0;
      padding-bottom: 2px;
    }

    .folder-summary ul {
      list-style: none;
      margin-left: 8px;
    }

    .folder-summary li {
      margin: 2px 0;
    }
  </style>
</head>
<body>
  <!-- Menu Bar -->
  <div class="menu-bar">
    <span><strong>🍎</strong></span>
    <span>File</span>
    <span>Edit</span>
    <span>View</span>
    <span>Special</span>
    <span class="clock">${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
  </div>

  <!-- Desktop Surface -->
  <div class="desktop">
    ${iconsHTML}
  </div>

  <!-- Folder Contents Summaries -->
  ${folderContents ? `<div class="folder-summaries">${folderContents}</div>` : ''}

  <!-- Export Info -->
  <div class="export-info">
    <h2>📋 Desktop Archive</h2>
    <p><strong>User:</strong> ${escapeHtml(username)}</p>
    <p><strong>Items:</strong> ${rootItems.length} on desktop</p>
    <p><strong>Exported:</strong> ${timestamp}</p>
    <p style="margin-top: 8px; color: #666; font-style: italic;">
      Generated by EternalOS
    </p>
  </div>
</body>
</html>`;
}

/**
 * Downloads the HTML file
 */
export function downloadDesktopExport(options: ExportOptions): void {
  const html = generateDesktopHTML(options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.username}-desktop-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper: Escape HTML entities
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper: Get emoji for item type
function getTypeEmoji(type: string): string {
  switch (type) {
    case 'folder':
      return '📁';
    case 'image':
      return '🖼️';
    case 'text':
      return '📄';
    case 'audio':
      return '🎵';
    case 'video':
      return '🎬';
    case 'pdf':
      return '📕';
    case 'link':
      return '🔗';
    default:
      return '📄';
  }
}

// Helper: Get SVG icon for item type
function getIconSVG(type: string): string {
  switch (type) {
    case 'folder':
      return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 8V26H30V8H2Z" fill="#FFCC00"/>
        <path d="M2 6V8H14L16 6H2Z" fill="#FFCC00"/>
        <path d="M2 6H16L14 8H2V6Z" fill="#FFE066"/>
        <path d="M2 8H30V26H2V8Z" stroke="black" stroke-width="2"/>
        <path d="M2 6H16L14 8" stroke="black" stroke-width="2"/>
      </svg>`;
    case 'image':
      return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="24" height="24" fill="white" stroke="black" stroke-width="2"/>
        <path d="M8 20L12 16L16 20L22 14L26 18" stroke="#00AA00" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="#FFCC00"/>
      </svg>`;
    case 'text':
      return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="24" height="28" fill="white" stroke="black" stroke-width="2"/>
        <path d="M8 8H24" stroke="black" stroke-width="1"/>
        <path d="M8 12H24" stroke="black" stroke-width="1"/>
        <path d="M8 16H20" stroke="black" stroke-width="1"/>
        <path d="M8 20H22" stroke="black" stroke-width="1"/>
      </svg>`;
    case 'audio':
      return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="#333" stroke="black" stroke-width="2"/>
        <circle cx="16" cy="16" r="4" fill="#C0C0C0"/>
        <circle cx="16" cy="16" r="1" fill="black"/>
      </svg>`;
    case 'video':
      return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="28" height="20" fill="#333" stroke="black" stroke-width="2"/>
        <path d="M13 11L21 16L13 21V11Z" fill="white"/>
      </svg>`;
    case 'pdf':
      return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="24" height="28" fill="white" stroke="black" stroke-width="2"/>
        <rect x="6" y="20" width="14" height="6" fill="#CC0000"/>
        <text x="8" y="25" font-size="5" fill="white" font-weight="bold">PDF</text>
      </svg>`;
    default:
      return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="24" height="28" fill="white" stroke="black" stroke-width="2"/>
      </svg>`;
  }
}

// Helper: Get wallpaper CSS
function getWallpaperStyle(wallpaper: string): string {
  const patterns: Record<string, string> = {
    default: '',
    stripes: `background-image: repeating-linear-gradient(
      0deg,
      #C0C0C0,
      #C0C0C0 2px,
      #A0A0A0 2px,
      #A0A0A0 4px
    );`,
    dots: `background-image: radial-gradient(#808080 1px, transparent 1px);
      background-size: 8px 8px;`,
    grid: `background-image:
      linear-gradient(#A0A0A0 1px, transparent 1px),
      linear-gradient(90deg, #A0A0A0 1px, transparent 1px);
      background-size: 16px 16px;`,
    checker: `background-image:
      linear-gradient(45deg, #A0A0A0 25%, transparent 25%),
      linear-gradient(-45deg, #A0A0A0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #A0A0A0 75%),
      linear-gradient(-45deg, transparent 75%, #A0A0A0 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;`,
  };

  return patterns[wallpaper] || patterns.default;
}
