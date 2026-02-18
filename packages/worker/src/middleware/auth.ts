/**
 * Auth Middleware
 *
 * Extracts and verifies JWT from Authorization header.
 * Attaches uid to request context for downstream handlers.
 *
 * Implementation in Phase 4
 */

import type { Env } from '../index';
import type { JWTPayload, SessionRecord, UserRecord } from '../types';
import { verifyJWT } from '../utils/jwt';

export interface AuthContext {
  uid: string;
  username: string;
}

/**
 * Verify Authorization header and return auth context
 * Returns null if auth fails
 */
export async function authenticate(
  request: Request,
  env: Env
): Promise<AuthContext | null> {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length);
  } else {
    // Fall back to query parameter (for img/video/audio src URLs)
    const url = new URL(request.url);
    token = url.searchParams.get('token');
  }

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) {
      return null;
    }

    // Verify session exists in KV
    const sessionJson = await env.AUTH_KV.get(`session:${token}`);
    if (!sessionJson) {
      return null;
    }

    const session = JSON.parse(sessionJson) as SessionRecord;

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      // Clean up expired session
      await env.AUTH_KV.delete(`session:${token}`);
      return null;
    }

    // Check if password was changed after session was issued
    // This invalidates sessions when password changes
    const userJson = await getUserByUid(env, payload.uid);

    if (userJson) {
      const user = JSON.parse(userJson) as UserRecord;
      if (user.passwordChangedAt && session.issuedAt && session.issuedAt < user.passwordChangedAt) {
        // Session was issued before password change - invalidate it
        await env.AUTH_KV.delete(`session:${token}`);
        return null;
      }
    }

    return {
      uid: payload.uid,
      username: payload.username,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to find user by UID using the uid->email index
 */
async function getUserByUid(env: Env, uid: string): Promise<string | null> {
  // Look up UID -> email index
  const indexJson = await env.AUTH_KV.get(`uid:${uid}`);
  if (!indexJson) {
    return null;
  }

  const { email } = JSON.parse(indexJson) as { email: string };

  // Fetch the actual user record
  return await env.AUTH_KV.get(`user:${email}`);
}

/**
 * Middleware that requires authentication
 * Returns 401 if not authenticated
 */
export async function requireAuth(
  request: Request,
  env: Env
): Promise<Response | AuthContext> {
  const auth = await authenticate(request, env);
  if (!auth) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  return auth;
}
