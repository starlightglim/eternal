/**
 * Visitor Mode Route
 *
 * GET /api/visit/:username - Get public desktop snapshot
 *
 * Returns public items for a user's desktop.
 * Uses KV cache for fast reads, falls back to Durable Object.
 */

import type { Env } from '../index';
import type { DesktopItem, UserProfile } from '../types';

interface VisitorResponse {
  username: string;
  displayName: string;
  wallpaper?: string;
  items: DesktopItem[];
}

/**
 * Handle visitor requests
 * GET /api/visit/:username
 *
 * Flow:
 * 1. Look up username in AUTH_KV to get uid
 * 2. Try DESKTOP_KV public:{uid} for cached snapshot
 * 3. Fall back to Durable Object getPublicSnapshot()
 * 4. Cache result in KV for next visitor
 */
export async function handleVisit(
  request: Request,
  env: Env,
  username: string
): Promise<Response> {
  try {
    // Normalize username (lowercase)
    const normalizedUsername = username.toLowerCase();

    // Look up username → uid in AUTH_KV
    const usernameData = await env.AUTH_KV.get<{ uid: string }>(
      `username:${normalizedUsername}`,
      'json'
    );

    if (!usernameData) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { uid } = usernameData;

    // Try KV cache first for fast visitor reads
    const cachedSnapshot = await env.DESKTOP_KV.get<VisitorResponse>(
      `public:${uid}`,
      'json'
    );

    if (cachedSnapshot) {
      return Response.json(cachedSnapshot, {
        headers: {
          'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        },
      });
    }

    // Fall back to Durable Object
    const doId = env.USER_DESKTOP.idFromName(uid);
    const stub = env.USER_DESKTOP.get(doId);

    const doResponse = await stub.fetch(
      new Request('http://internal/public-snapshot')
    );

    if (!doResponse.ok) {
      // Durable Object may not exist yet (new user with no items)
      // Return empty response
      const emptyResponse: VisitorResponse = {
        username: normalizedUsername,
        displayName: normalizedUsername,
        items: [],
      };
      return Response.json(emptyResponse);
    }

    const data = await doResponse.json() as { items: DesktopItem[]; profile?: UserProfile };

    // Build visitor response
    const visitorResponse: VisitorResponse = {
      username: normalizedUsername,
      displayName: data.profile?.displayName || normalizedUsername,
      wallpaper: data.profile?.wallpaper,
      items: data.items,
    };

    // Cache in KV for future visitors (5 minute TTL)
    await env.DESKTOP_KV.put(
      `public:${uid}`,
      JSON.stringify(visitorResponse),
      { expirationTtl: 300 }
    );

    return Response.json(visitorResponse, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    });

  } catch (error) {
    console.error('Visit error:', error);
    return Response.json(
      { error: 'Failed to load desktop' },
      { status: 500 }
    );
  }
}
