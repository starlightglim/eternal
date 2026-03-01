/**
 * Cloudflare Pages Functions Middleware
 *
 * Intercepts /@username requests and checks User-Agent for social media crawlers.
 * For crawlers: returns a minimal HTML page with proper OG meta tags so link
 * previews work on Twitter, Discord, Slack, iMessage, etc.
 * For normal users: passes through to the SPA (index.html via _redirects).
 */

interface Env {
  API_URL?: string;
}

// Crawler User-Agent patterns
const CRAWLER_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'Discordbot',
  'TelegramBot',
  'WhatsApp',
  'Applebot',
  'Googlebot',
  'bingbot',
  'Pinterestbot',
  'Embedly',
  'Iframely',
  'SkypeUriPreview',
  'vkShare',
  'W3C_Validator',
  'redditbot',
  'Rogerbot',
  'SummalyBot',
  'opengraph',
  'Outbrain',
  'ia_archiver',
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some(pattern => ua.includes(pattern.toLowerCase()));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Only intercept /@username routes
  const usernameMatch = path.match(/^\/@([a-zA-Z0-9_-]+)$/);
  if (!usernameMatch) {
    return context.next();
  }

  // Check if request is from a crawler
  const userAgent = context.request.headers.get('User-Agent') || '';
  if (!isCrawler(userAgent)) {
    return context.next();
  }

  const username = usernameMatch[1];

  // Determine API URL: use env var, or derive from known worker URL
  const apiBase = context.env.API_URL || 'https://eternalos-api.wubny31.workers.dev';

  try {
    // Fetch visitor data from the worker API
    const visitResponse = await fetch(`${apiBase}/api/visit/${username}`, {
      headers: { 'User-Agent': 'EternalOS-Middleware/1.0' },
    });

    if (!visitResponse.ok) {
      // User not found or error — pass through to SPA
      return context.next();
    }

    const data = await visitResponse.json() as {
      username: string;
      displayName: string;
      bio?: string;
      shareDescription?: string;
      items: unknown[];
    };

    const displayName = data.displayName || username;
    const itemCount = data.items?.length || 0;

    // Build description: user's custom shareDescription > bio > default
    const description = data.shareDescription
      || data.bio
      || `${displayName}'s personal desktop on EternalOS - ${itemCount} item${itemCount !== 1 ? 's' : ''} on display.`;

    const pageTitle = `${displayName}'s Desktop - EternalOS`;
    const pageUrl = `${url.origin}/@${username}`;
    const ogImageUrl = `${apiBase}/api/og/${username}.png`;

    // Return minimal HTML with OG meta tags for crawlers
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- OpenGraph -->
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="EternalOS" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />

  <meta name="theme-color" content="#C0C0C0" />
</head>
<body>
  <p>Redirecting to ${escapeHtml(displayName)}'s desktop...</p>
  <script>window.location.replace("${escapeHtml(pageUrl)}");</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Middleware error fetching user data:', error);
    // On error, pass through to SPA
    return context.next();
  }
};
