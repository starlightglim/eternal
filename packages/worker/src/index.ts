/**
 * EternalOS Cloudflare Worker Entry Point
 *
 * Routes all /api/* requests to appropriate handlers.
 * Integrates with KV, R2, Durable Objects, and Workers AI.
 */

import { UserDesktop } from './durable-objects/UserDesktop';
import { handleSignup, handleLogin, handleLogout } from './routes/auth';
import { handleUpload, handleServeFile } from './routes/upload';
import { handleVisit } from './routes/visit';
import { handleAssistant } from './routes/assistant';
import { requireAuth, authenticate } from './middleware/auth';

export interface Env {
  // KV Namespaces
  AUTH_KV: KVNamespace;
  DESKTOP_KV: KVNamespace;

  // R2 Bucket
  ETERNALOS_FILES: R2Bucket;

  // Durable Objects
  USER_DESKTOP: DurableObjectNamespace;

  // Workers AI
  AI: Ai;

  // Secrets
  JWT_SECRET: string;
}

export { UserDesktop };

// Helper to add CORS headers to response
function withCors(response: Response, corsHeaders: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for development
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (path === '/api/health') {
      return Response.json({ status: 'ok', timestamp: Date.now() }, { headers: corsHeaders });
    }

    // Route to appropriate handler
    try {
      let response: Response;

      // Auth routes
      if (path === '/api/auth/signup' && request.method === 'POST') {
        response = await handleSignup(request, env);
        return withCors(response, corsHeaders);
      }

      if (path === '/api/auth/login' && request.method === 'POST') {
        response = await handleLogin(request, env);
        return withCors(response, corsHeaders);
      }

      if (path === '/api/auth/logout' && request.method === 'POST') {
        response = await handleLogout(request, env);
        return withCors(response, corsHeaders);
      }

      // Desktop routes (require auth)
      if (path === '/api/desktop' && request.method === 'GET') {
        const authResult = await requireAuth(request, env);
        if (authResult instanceof Response) {
          return withCors(authResult, corsHeaders);
        }

        // Forward to user's Durable Object
        const doId = env.USER_DESKTOP.idFromName(authResult.uid);
        const stub = env.USER_DESKTOP.get(doId);
        const doResponse = await stub.fetch(new Request('http://internal/items'));
        return withCors(doResponse, corsHeaders);
      }

      if (path === '/api/desktop/items' && request.method === 'POST') {
        const authResult = await requireAuth(request, env);
        if (authResult instanceof Response) {
          return withCors(authResult, corsHeaders);
        }

        const doId = env.USER_DESKTOP.idFromName(authResult.uid);
        const stub = env.USER_DESKTOP.get(doId);
        const body = await request.text();
        const doResponse = await stub.fetch(new Request('http://internal/items', {
          method: 'POST',
          body,
        }));
        return withCors(doResponse, corsHeaders);
      }

      if (path === '/api/desktop/items' && request.method === 'PATCH') {
        const authResult = await requireAuth(request, env);
        if (authResult instanceof Response) {
          return withCors(authResult, corsHeaders);
        }

        const doId = env.USER_DESKTOP.idFromName(authResult.uid);
        const stub = env.USER_DESKTOP.get(doId);
        const body = await request.text();
        const doResponse = await stub.fetch(new Request('http://internal/items', {
          method: 'PATCH',
          body,
        }));
        return withCors(doResponse, corsHeaders);
      }

      if (path.startsWith('/api/desktop/items/') && request.method === 'DELETE') {
        const authResult = await requireAuth(request, env);
        if (authResult instanceof Response) {
          return withCors(authResult, corsHeaders);
        }

        const itemId = path.slice('/api/desktop/items/'.length);
        const doId = env.USER_DESKTOP.idFromName(authResult.uid);
        const stub = env.USER_DESKTOP.get(doId);
        const doResponse = await stub.fetch(new Request(`http://internal/items/${itemId}`, {
          method: 'DELETE',
        }));

        // If there was an R2 key, clean up the file
        const result = await doResponse.json() as { deleted: boolean; r2Key?: string };
        if (result.r2Key) {
          await env.ETERNALOS_FILES.delete(result.r2Key);
        }

        return withCors(Response.json(result), corsHeaders);
      }

      // File upload
      if (path === '/api/upload' && request.method === 'POST') {
        const authResult = await requireAuth(request, env);
        if (authResult instanceof Response) {
          return withCors(authResult, corsHeaders);
        }
        response = await handleUpload(request, env, authResult);
        return withCors(response, corsHeaders);
      }

      // File serving: /api/files/:uid/:itemId/:filename
      if (path.startsWith('/api/files/') && request.method === 'GET') {
        const parts = path.slice('/api/files/'.length).split('/');
        if (parts.length < 3) {
          return Response.json({ error: 'Invalid file path' }, { status: 400, headers: corsHeaders });
        }

        const [fileOwnerUid, itemId, ...filenameParts] = parts;
        const filename = filenameParts.join('/'); // Handle filenames with slashes

        // Authenticate but don't require it (visitors can access public files)
        const auth = await authenticate(request, env);

        response = await handleServeFile(request, env, fileOwnerUid, itemId, filename, auth);
        return withCors(response, corsHeaders);
      }

      // Visitor mode: /api/visit/:username
      if (path.startsWith('/api/visit/') && request.method === 'GET') {
        const username = path.slice('/api/visit/'.length);
        if (!username) {
          return Response.json({ error: 'Username required' }, { status: 400, headers: corsHeaders });
        }
        response = await handleVisit(request, env, username);
        return withCors(response, corsHeaders);
      }

      // Desk assistant (requires auth)
      if (path === '/api/assistant' && request.method === 'POST') {
        const authResult = await requireAuth(request, env);
        if (authResult instanceof Response) {
          return withCors(authResult, corsHeaders);
        }
        response = await handleAssistant(request, env, authResult);
        return withCors(response, corsHeaders);
      }

      // 404 for unmatched routes
      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });

    } catch (error) {
      console.error('Worker error:', error);
      return Response.json(
        { error: 'Internal server error' },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
