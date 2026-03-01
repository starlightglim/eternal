/**
 * Dynamic OG Image Generation for EternalOS
 *
 * GET /api/og/:username.png - Generate a preview image of a user's desktop
 *
 * Generates an SVG representation of the user's desktop that can be
 * converted to PNG for og:image. The image includes:
 * - Custom desktop/accent colors
 * - Desktop icons (up to 12 shown)
 * - Username/display name
 * - EternalOS branding
 *
 * The SVG is designed to look like a stylized Mac OS 8 desktop screenshot.
 */

import type { Env } from '../index';
import type { DesktopItem, UserProfile } from '../types';

// OG image dimensions (Twitter/Facebook optimized)
const WIDTH = 1200;
const HEIGHT = 630;

// Grid settings for icon layout
const ICON_SIZE = 48;
const ICON_SPACING = 100;
const ICONS_PER_ROW = 6;
const MAX_ICONS = 12;

// Colors
const DEFAULT_DESKTOP_COLOR = '#C0C0C0'; // Platinum gray
const DEFAULT_ACCENT_COLOR = '#000080'; // Classic Mac blue
const WINDOW_BORDER = '#000000';

/**
 * Generate an icon SVG based on item type
 */
function getIconSvg(item: DesktopItem, x: number, y: number): string {
  const type = item.type;
  const iconX = x;
  const iconY = y;
  const labelY = y + ICON_SIZE + 14;

  // Truncate name if too long
  const name = item.name.length > 12 ? item.name.slice(0, 11) + '…' : item.name;

  // Icon graphics based on type
  let iconGraphic = '';

  switch (type) {
    case 'folder':
      iconGraphic = `
        <rect x="${iconX + 4}" y="${iconY + 8}" width="40" height="32" fill="#FFCC00" stroke="#000" stroke-width="1"/>
        <path d="M${iconX + 4} ${iconY + 8} L${iconX + 4} ${iconY + 4} L${iconX + 20} ${iconY + 4} L${iconX + 24} ${iconY + 8}" fill="#FFCC00" stroke="#000" stroke-width="1"/>
      `;
      break;
    case 'text':
      iconGraphic = `
        <rect x="${iconX + 8}" y="${iconY + 4}" width="32" height="40" fill="#FFFFFF" stroke="#000" stroke-width="1"/>
        <line x1="${iconX + 12}" y1="${iconY + 12}" x2="${iconX + 36}" y2="${iconY + 12}" stroke="#666" stroke-width="1"/>
        <line x1="${iconX + 12}" y1="${iconY + 18}" x2="${iconX + 36}" y2="${iconY + 18}" stroke="#666" stroke-width="1"/>
        <line x1="${iconX + 12}" y1="${iconY + 24}" x2="${iconX + 30}" y2="${iconY + 24}" stroke="#666" stroke-width="1"/>
      `;
      break;
    case 'image':
      iconGraphic = `
        <rect x="${iconX + 6}" y="${iconY + 4}" width="36" height="36" fill="#FFFFFF" stroke="#000" stroke-width="1"/>
        <rect x="${iconX + 10}" y="${iconY + 8}" width="28" height="28" fill="#87CEEB"/>
        <circle cx="${iconX + 18}" cy="${iconY + 16}" r="4" fill="#FFD700"/>
        <path d="M${iconX + 10} ${iconY + 32} L${iconX + 20} ${iconY + 22} L${iconX + 26} ${iconY + 28} L${iconX + 38} ${iconY + 18} L${iconX + 38} ${iconY + 36} L${iconX + 10} ${iconY + 36} Z" fill="#228B22"/>
      `;
      break;
    case 'link':
      iconGraphic = `
        <rect x="${iconX + 4}" y="${iconY + 4}" width="40" height="40" fill="#E0E0FF" stroke="#000" stroke-width="1"/>
        <text x="${iconX + 24}" y="${iconY + 32}" font-family="serif" font-size="28" text-anchor="middle" fill="#0000FF">@</text>
      `;
      break;
    case 'audio':
      iconGraphic = `
        <rect x="${iconX + 8}" y="${iconY + 4}" width="32" height="40" fill="#FFE4E1" stroke="#000" stroke-width="1"/>
        <text x="${iconX + 24}" y="${iconY + 32}" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#FF1493">♪</text>
      `;
      break;
    case 'video':
      iconGraphic = `
        <rect x="${iconX + 6}" y="${iconY + 8}" width="36" height="32" fill="#2F2F2F" stroke="#000" stroke-width="1"/>
        <polygon points="${iconX + 20},${iconY + 16} ${iconX + 20},${iconY + 32} ${iconX + 34},${iconY + 24}" fill="#FFFFFF"/>
      `;
      break;
    case 'pdf':
      iconGraphic = `
        <rect x="${iconX + 8}" y="${iconY + 4}" width="32" height="40" fill="#FFFFFF" stroke="#000" stroke-width="1"/>
        <rect x="${iconX + 10}" y="${iconY + 6}" width="28" height="8" fill="#FF0000"/>
        <text x="${iconX + 24}" y="${iconY + 13}" font-family="sans-serif" font-size="7" font-weight="bold" text-anchor="middle" fill="#FFFFFF">PDF</text>
      `;
      break;
    case 'widget':
      iconGraphic = `
        <rect x="${iconX + 6}" y="${iconY + 6}" width="36" height="36" fill="#E8E8E8" stroke="#000" stroke-width="1"/>
        <rect x="${iconX + 10}" y="${iconY + 10}" width="28" height="6" fill="#CCCCCC"/>
        <line x1="${iconX + 12}" y1="${iconY + 20}" x2="${iconX + 36}" y2="${iconY + 20}" stroke="#999" stroke-width="1"/>
        <line x1="${iconX + 12}" y1="${iconY + 26}" x2="${iconX + 32}" y2="${iconY + 26}" stroke="#999" stroke-width="1"/>
        <line x1="${iconX + 12}" y1="${iconY + 32}" x2="${iconX + 28}" y2="${iconY + 32}" stroke="#999" stroke-width="1"/>
      `;
      break;
    default:
      // Generic file icon
      iconGraphic = `
        <rect x="${iconX + 8}" y="${iconY + 4}" width="32" height="40" fill="#FFFFFF" stroke="#000" stroke-width="1"/>
        <path d="M${iconX + 28} ${iconY + 4} L${iconX + 40} ${iconY + 16} L${iconX + 28} ${iconY + 16} Z" fill="#CCCCCC" stroke="#000" stroke-width="1"/>
      `;
  }

  return `
    <g class="icon">
      ${iconGraphic}
      <text x="${iconX + ICON_SIZE / 2}" y="${labelY}" font-family="Chicago, Geneva, sans-serif" font-size="11" text-anchor="middle" fill="#000000">
        <tspan>${escapeXml(name)}</tspan>
      </text>
    </g>
  `;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate title bar stripe pattern (classic Mac OS 8)
 */
function getTitleBarPattern(id: string): string {
  return `
    <pattern id="${id}" patternUnits="userSpaceOnUse" width="2" height="2">
      <rect width="2" height="1" fill="white"/>
      <rect y="1" width="2" height="1" fill="black"/>
    </pattern>
  `;
}

/**
 * Truncate a string to a max length, adding ellipsis if needed
 */
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

/**
 * Word-wrap text into lines of max width (approximate character count)
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.slice(0, 3); // Max 3 lines
}

/**
 * Generate the complete SVG for a user's desktop
 */
function generateDesktopSvg(
  username: string,
  displayName: string,
  items: DesktopItem[],
  profile: Partial<UserProfile>
): string {
  const desktopColor = profile.desktopColor || DEFAULT_DESKTOP_COLOR;
  const accentColor = profile.accentColor || DEFAULT_ACCENT_COLOR;

  // Filter to root items only (exclude stickers), limit to MAX_ICONS
  const rootItems = items
    .filter(item => item.parentId === null && !item.isTrashed && item.type !== 'sticker')
    .slice(0, MAX_ICONS);

  // Calculate icon positions
  const iconsStartX = 60;
  const iconsStartY = 80;
  const iconsSvg = rootItems.map((item, index) => {
    const row = Math.floor(index / ICONS_PER_ROW);
    const col = index % ICONS_PER_ROW;
    const x = iconsStartX + col * ICON_SPACING;
    const y = iconsStartY + row * ICON_SPACING;
    return getIconSvg(item, x, y);
  }).join('');

  // Generate item count text
  const itemCount = items.filter(i => !i.isTrashed).length;
  const itemText = itemCount === 1 ? '1 item' : `${itemCount} items`;

  // Build description text for the info window
  const shareDescription = profile.shareDescription || profile.bio || '';
  const descriptionLines = shareDescription
    ? wrapText(truncateText(shareDescription, 120), 35)
    : [];

  // Dynamically size the info window based on description
  const baseWindowHeight = 140;
  const descLineHeight = 16;
  const extraDescHeight = descriptionLines.length > 0 ? (descriptionLines.length * descLineHeight + 12) : 0;
  const windowHeight = baseWindowHeight + extraDescHeight;
  const windowY = HEIGHT - windowHeight - 40;

  // Description SVG lines
  const descriptionSvg = descriptionLines.map((line, i) =>
    `<text x="${WIDTH - 300}" y="${windowY + 88 + (i * descLineHeight)}" font-family="Geneva, system-ui, sans-serif" font-size="11" fill="#444444" font-style="italic">${escapeXml(line)}</text>`
  ).join('\n    ');

  // Content positions
  const contentStartY = windowY + 50;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    ${getTitleBarPattern('titleStripes')}
    <!-- Drop shadow filter -->
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="3" dy="3" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Desktop background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${escapeXml(desktopColor)}"/>

  <!-- Menu bar -->
  <rect x="0" y="0" width="${WIDTH}" height="22" fill="#FFFFFF" stroke="${WINDOW_BORDER}" stroke-width="1"/>
  <text x="12" y="16" font-family="Chicago, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#000000">⌘</text>
  <text x="36" y="16" font-family="Chicago, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#000000">File</text>
  <text x="70" y="16" font-family="Chicago, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#000000">Edit</text>
  <text x="104" y="16" font-family="Chicago, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#000000">View</text>
  <text x="142" y="16" font-family="Chicago, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#000000">Special</text>

  <!-- Desktop icons -->
  ${iconsSvg}

  <!-- Info window (bottom right) -->
  <g filter="url(#shadow)">
    <!-- Window border -->
    <rect x="${WIDTH - 320}" y="${windowY}" width="280" height="${windowHeight}" fill="#FFFFFF" stroke="${WINDOW_BORDER}" stroke-width="2"/>
    <!-- Title bar -->
    <rect x="${WIDTH - 318}" y="${windowY + 2}" width="276" height="20" fill="url(#titleStripes)"/>
    <!-- Close box -->
    <rect x="${WIDTH - 314}" y="${windowY + 6}" width="12" height="12" fill="#FFFFFF" stroke="${WINDOW_BORDER}" stroke-width="1"/>
    <!-- Title -->
    <rect x="${WIDTH - 220}" y="${windowY + 4}" width="120" height="16" fill="#FFFFFF"/>
    <text x="${WIDTH - 180}" y="${windowY + 17}" font-family="Chicago, system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">@${escapeXml(username)}</text>

    <!-- Window content -->
    <text x="${WIDTH - 300}" y="${contentStartY}" font-family="Geneva, system-ui, sans-serif" font-size="14" fill="#000000">${escapeXml(displayName)}'s Desktop</text>
    <text x="${WIDTH - 300}" y="${contentStartY + 22}" font-family="Geneva, system-ui, sans-serif" font-size="12" fill="#666666">${itemText} on display</text>

    ${descriptionSvg ? `<!-- Share description -->
    ${descriptionSvg}` : ''}

    <!-- Accent color indicator -->
    <rect x="${WIDTH - 300}" y="${windowY + windowHeight - 36}" width="16" height="16" fill="${escapeXml(accentColor)}" stroke="${WINDOW_BORDER}" stroke-width="1"/>
    <text x="${WIDTH - 278}" y="${windowY + windowHeight - 24}" font-family="Geneva, system-ui, sans-serif" font-size="11" fill="#666666">Theme color</text>
  </g>

  <!-- EternalOS logo badge (bottom right corner) -->
  <g transform="translate(${WIDTH - 160}, ${HEIGHT - 28})">
    <!-- Badge background -->
    <rect x="0" y="0" width="140" height="20" rx="3" fill="rgba(0,0,0,0.6)"/>
    <!-- Mac-style command key icon -->
    <text x="8" y="15" font-family="Chicago, system-ui, sans-serif" font-size="11" fill="#FFFFFF">⌘</text>
    <!-- Brand text -->
    <text x="24" y="14" font-family="Chicago, system-ui, sans-serif" font-size="10" fill="#FFFFFF">EternalOS</text>
  </g>
</svg>`;
}

/**
 * Handle OG image generation request
 * GET /api/og/:username.png
 */
export async function handleOgImage(
  request: Request,
  env: Env,
  username: string
): Promise<Response> {
  try {
    // Normalize username
    const normalizedUsername = username.toLowerCase().replace(/\.png$/, '');

    // Look up user
    const usernameData = await env.AUTH_KV.get<{ uid: string }>(
      `username:${normalizedUsername}`,
      'json'
    );

    if (!usernameData) {
      // Return a default "user not found" image
      return generateNotFoundImage(normalizedUsername);
    }

    const { uid } = usernameData;

    // Try KV cache first (same cache as visitor page)
    const cacheKey = `og:${uid}`;
    const cachedSvg = await env.DESKTOP_KV.get(cacheKey);

    if (cachedSvg) {
      return new Response(cachedSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=300', // 5 minutes
        },
      });
    }

    // Fetch from Durable Object
    const doId = env.USER_DESKTOP.idFromName(uid);
    const stub = env.USER_DESKTOP.get(doId);
    const doResponse = await stub.fetch(
      new Request('http://internal/public-snapshot')
    );

    if (!doResponse.ok) {
      // User exists but has no public items
      const svg = generateDesktopSvg(normalizedUsername, normalizedUsername, [], {});
      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    const data = await doResponse.json() as { items: DesktopItem[]; profile?: UserProfile };
    const profile = data.profile;
    const displayName = profile?.displayName || normalizedUsername;

    // Generate SVG
    const svg = generateDesktopSvg(
      normalizedUsername,
      displayName,
      data.items,
      profile || {}
    );

    // Cache for 5 minutes
    await env.DESKTOP_KV.put(cacheKey, svg, { expirationTtl: 300 });

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('OG image generation error:', error);
    return generateErrorImage();
  }
}

/**
 * Generate a "user not found" placeholder image
 */
function generateNotFoundImage(username: string): Response {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#C0C0C0"/>
  <rect x="${WIDTH / 2 - 200}" y="${HEIGHT / 2 - 80}" width="400" height="160" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
  <rect x="${WIDTH / 2 - 198}" y="${HEIGHT / 2 - 78}" width="396" height="20" fill="#CCCCCC"/>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2 - 62}" font-family="Chicago, system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Error</text>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2 - 10}" font-family="Geneva, system-ui, sans-serif" font-size="24" text-anchor="middle" fill="#000000">⚠️</text>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2 + 30}" font-family="Geneva, system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#000000">User @${escapeXml(username)} not found</text>
  <text x="${WIDTH - 20}" y="${HEIGHT - 10}" font-family="Chicago, system-ui, sans-serif" font-size="10" text-anchor="end" fill="#666666">EternalOS</text>
</svg>`;

  return new Response(svg, {
    status: 404,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

/**
 * Generate a generic error image
 */
function generateErrorImage(): Response {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#C0C0C0"/>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2}" font-family="Chicago, system-ui, sans-serif" font-size="18" text-anchor="middle" fill="#000000">EternalOS</text>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2 + 30}" font-family="Geneva, system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#666666">A personal corner of the internet</text>
</svg>`;

  return new Response(svg, {
    status: 500,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store',
    },
  });
}
