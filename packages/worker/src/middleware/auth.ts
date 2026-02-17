/**
 * Auth Middleware
 *
 * Extracts and verifies JWT from Authorization header.
 * Attaches uid to request context for downstream handlers.
 *
 * Implementation in Phase 4
 */

import type { Env } from '../index';
import type { JWTPayload } from '../types';
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
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) {
      return null;
    }

    // Optionally verify session exists in KV
    // const session = await env.AUTH_KV.get(`session:${token}`);
    // if (!session) return null;

    return {
      uid: payload.uid,
      username: payload.username,
    };
  } catch {
    return null;
  }
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
