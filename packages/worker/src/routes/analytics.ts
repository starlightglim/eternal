/**
 * Analytics Routes
 *
 * Optional view tracking for user desktops.
 * Only tracks if the user has analyticsEnabled=true in their profile.
 *
 * - trackVisitAnalytics: Called non-blocking after handleVisit()
 * - handleGetAnalytics: GET /api/analytics - Returns view counts for the authenticated user
 */

import type { Env } from '../index';
import type { AuthContext } from '../middleware/auth';

/**
 * Track a visit to a user's desktop.
 * Deduplicates by hashed IP + date so refreshes don't inflate counts.
 * Called via ctx.waitUntil() (non-blocking).
 */
export async function trackVisitAnalytics(
  request: Request,
  env: Env,
  uid: string
): Promise<void> {
  try {
    // Check if user has analytics enabled
    const doId = env.USER_DESKTOP.idFromName(uid);
    const stub = env.USER_DESKTOP.get(doId);
    const profileRes = await stub.fetch(new Request('http://internal/profile'));
    if (!profileRes.ok) return;

    const { profile } = await profileRes.json() as { profile?: { analyticsEnabled?: boolean } };
    if (!profile?.analyticsEnabled) return;

    // Get visitor IP for dedup
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Create a hash of IP + date for dedup (privacy: we don't store raw IP)
    const encoder = new TextEncoder();
    const data = encoder.encode(`${ip}:${today}:${uid}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    // Check if already counted today
    const dedupeKey = `viewlog:${uid}:${hash}`;
    const existing = await env.DESKTOP_KV.get(dedupeKey);
    if (existing) return; // Already counted

    // Mark as counted (24h TTL)
    await env.DESKTOP_KV.put(dedupeKey, '1', { expirationTtl: 86400 });

    // Increment total counter
    const totalKey = `views:${uid}:total`;
    const currentTotal = parseInt(await env.DESKTOP_KV.get(totalKey) || '0', 10);
    await env.DESKTOP_KV.put(totalKey, String(currentTotal + 1));

    // Increment daily counter (90-day TTL)
    const dailyKey = `views:${uid}:daily:${today}`;
    const currentDaily = parseInt(await env.DESKTOP_KV.get(dailyKey) || '0', 10);
    await env.DESKTOP_KV.put(dailyKey, String(currentDaily + 1), { expirationTtl: 90 * 86400 });
  } catch (error) {
    // Analytics should never break the visit flow
    console.error('Analytics tracking error:', error);
  }
}

/**
 * GET /api/analytics
 * Returns view counts for the authenticated user's desktop.
 */
export async function handleGetAnalytics(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  try {
    // Get total views
    const totalKey = `views:${auth.uid}:total`;
    const totalViews = parseInt(await env.DESKTOP_KV.get(totalKey) || '0', 10);

    // Get daily views for last 30 days
    const dailyViews: { date: string; count: number }[] = [];
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dailyKey = `views:${auth.uid}:daily:${dateStr}`;
      const count = parseInt(await env.DESKTOP_KV.get(dailyKey) || '0', 10);
      dailyViews.push({ date: dateStr, count });
    }

    return Response.json({ totalViews, dailyViews });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return Response.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
