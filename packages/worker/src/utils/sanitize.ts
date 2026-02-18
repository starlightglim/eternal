/**
 * Input Sanitization Utilities
 *
 * Provides sanitization functions for user input to prevent
 * XSS, injection attacks, and other security issues.
 */

/**
 * Sanitize a string for safe display (removes/escapes HTML)
 * Use for: display names, folder names, item names, text content
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';

  // Trim and truncate
  let sanitized = input.trim().slice(0, maxLength);

  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Escape HTML entities to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Sanitize a filename for safe storage and display
 * Use for: uploaded file names, folder names
 */
export function sanitizeFilename(filename: string, maxLength = 255): string {
  if (!filename || typeof filename !== 'string') return 'unnamed';

  // Get the extension first
  const lastDot = filename.lastIndexOf('.');
  const hasExtension = lastDot > 0 && lastDot < filename.length - 1;
  const extension = hasExtension ? filename.slice(lastDot) : '';
  const basename = hasExtension ? filename.slice(0, lastDot) : filename;

  // Remove path traversal attempts
  let sanitized = basename
    .replace(/\.\./g, '')
    .replace(/\//g, '')
    .replace(/\\/g, '');

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Replace problematic characters with underscores
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');

  // Trim whitespace and dots from the start/end
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Ensure we have a valid filename
  if (!sanitized) {
    sanitized = 'unnamed';
  }

  // Truncate if needed (accounting for extension)
  const maxBasenameLength = maxLength - extension.length;
  if (sanitized.length > maxBasenameLength) {
    sanitized = sanitized.slice(0, maxBasenameLength);
  }

  return sanitized + extension;
}

/**
 * Sanitize a username for storage and URL safety
 * Use for: usernames during registration
 */
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') return '';

  // Lowercase and trim
  let sanitized = username.toLowerCase().trim();

  // Remove everything except alphanumeric, underscores, and hyphens
  sanitized = sanitized.replace(/[^a-z0-9_-]/g, '');

  // Ensure it doesn't start with a hyphen or underscore
  sanitized = sanitized.replace(/^[-_]+/, '');

  // Truncate to reasonable length
  sanitized = sanitized.slice(0, 30);

  return sanitized;
}

/**
 * Sanitize an email address
 * Use for: email during registration/login
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';

  // Lowercase and trim
  let sanitized = email.toLowerCase().trim();

  // Remove any characters that shouldn't be in an email
  // This is a basic sanitization - validation should be done separately
  sanitized = sanitized.replace(/[\x00-\x1F\x7F<>]/g, '');

  // Truncate to reasonable length
  sanitized = sanitized.slice(0, 254);

  return sanitized;
}

/**
 * Sanitize a display name
 * Use for: user display names
 */
export function sanitizeDisplayName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  // Trim and remove excessive whitespace
  let sanitized = name.trim().replace(/\s+/g, ' ');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove HTML-like tags (but keep the content)
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Truncate to reasonable length
  sanitized = sanitized.slice(0, 50);

  return sanitized;
}

/**
 * Validate and sanitize a URL
 * Use for: link items, external URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // Trim
  const trimmed = url.trim();

  // Check for allowed protocols
  const allowedProtocols = ['http:', 'https:'];

  try {
    const parsed = new URL(trimmed);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    // Return the normalized URL
    return parsed.href;
  } catch {
    // If it doesn't have a protocol, try adding https://
    if (!trimmed.includes('://')) {
      try {
        const withProtocol = new URL('https://' + trimmed);
        return withProtocol.href;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Sanitize text content for file storage
 * Preserves newlines and tabs but removes dangerous content
 * Use for: text file content
 */
export function sanitizeTextContent(content: string, maxLength = 100000): string {
  if (!content || typeof content !== 'string') return '';

  // Truncate
  let sanitized = content.slice(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');

  return sanitized;
}

/**
 * Sanitize JSON input - parse and validate structure
 * Returns null if invalid
 */
export function sanitizeJsonInput<T>(
  input: string,
  validator: (parsed: unknown) => parsed is T
): T | null {
  try {
    const parsed = JSON.parse(input);
    if (validator(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
