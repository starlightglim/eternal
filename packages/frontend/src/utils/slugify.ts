/**
 * Slugify - Convert a string to a CSS-safe, URL-safe identifier.
 *
 * Used for `eos-name` and `eos-folder` attributes so users get
 * readable selectors like [eos-name="sunset-pic"] instead of raw IDs.
 *
 * Rules:
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Strip emoji and non-ASCII
 * - Collapse consecutive hyphens
 * - Trim leading/trailing hyphens
 * - Max 50 characters
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    // Strip emoji and non-ASCII characters
    .replace(/[^\x20-\x7E]/g, '')
    // Replace spaces and special chars with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse consecutive hyphens
    .replace(/-{2,}/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Max 50 characters
    .slice(0, 50);
}
