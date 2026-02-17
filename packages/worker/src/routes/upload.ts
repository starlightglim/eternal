/**
 * File Upload & Serving Routes
 *
 * POST /api/upload - Upload file to R2 and create desktop item
 * GET /api/files/:uid/:itemId/:filename - Serve file from R2
 *
 * Supports images (jpg/png/gif/webp) and text files (txt/md).
 */

import type { Env } from '../index';
import type { AuthContext } from '../middleware/auth';
import type { DesktopItem } from '../types';

// Allowed MIME types
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'text/markdown': 'md',
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Handle file upload
 * POST /api/upload
 *
 * Expects multipart/form-data with:
 * - file: The file to upload
 * - name: (optional) Custom filename
 * - parentId: (optional) Parent folder ID
 * - position: (optional) JSON { x: number, y: number }
 * - isPublic: (optional) "true" or "false"
 */
export async function handleUpload(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    // In Workers environment, formData.get() returns File or string
    if (!file || typeof file === 'string') {
      return Response.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // file is now a File-like object (Blob with name property)
    const fileBlob = file as File;

    // Validate file type
    const mimeType = fileBlob.type;
    if (!ALLOWED_TYPES[mimeType]) {
      return Response.json(
        { error: `Invalid file type: ${mimeType}. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileBlob.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate item ID and R2 key
    const itemId = crypto.randomUUID();
    const originalName = fileBlob.name || `file.${ALLOWED_TYPES[mimeType]}`;
    const sanitizedName = sanitizeFilename(originalName);
    const r2Key = `${auth.uid}/${itemId}/${sanitizedName}`;

    // Upload to R2
    const fileBuffer = await fileBlob.arrayBuffer();
    await env.ETERNALOS_FILES.put(r2Key, fileBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        originalName: sanitizedName,
        uploadedBy: auth.uid,
        itemId: itemId,
      },
    });

    // Parse optional metadata from form
    const customName = formData.get('name') as string | null;
    const parentId = formData.get('parentId') as string | null;
    const positionStr = formData.get('position') as string | null;
    const isPublicStr = formData.get('isPublic') as string | null;

    let position = { x: 0, y: 0 };
    if (positionStr) {
      try {
        position = JSON.parse(positionStr);
      } catch {
        // Use default position
      }
    }

    // Determine item type based on MIME type
    const itemType = mimeType.startsWith('image/') ? 'image' : 'text';

    // Create desktop item in Durable Object
    const doId = env.USER_DESKTOP.idFromName(auth.uid);
    const stub = env.USER_DESKTOP.get(doId);

    const itemData = {
      id: itemId, // Use pre-generated ID to match R2 key
      type: itemType,
      name: customName || sanitizedName,
      parentId: parentId || null,
      position,
      isPublic: isPublicStr === 'true',
      r2Key,
      mimeType,
      fileSize: fileBlob.size,
    };

    const doResponse = await stub.fetch(
      new Request('http://internal/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      })
    );

    if (!doResponse.ok) {
      // Cleanup R2 if DO fails
      await env.ETERNALOS_FILES.delete(r2Key);
      return Response.json(
        { error: 'Failed to create desktop item' },
        { status: 500 }
      );
    }

    const createdItem = await doResponse.json();

    return Response.json({
      success: true,
      item: createdItem,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Serve file from R2
 * GET /api/files/:uid/:itemId/:filename
 *
 * Access control:
 * - Owner (valid JWT with matching uid): always allowed
 * - Anyone else: only if the corresponding desktop item is public
 */
export async function handleServeFile(
  request: Request,
  env: Env,
  fileOwnerUid: string,
  itemId: string,
  filename: string,
  requestingAuth: AuthContext | null
): Promise<Response> {
  try {
    // Construct R2 key
    const r2Key = `${fileOwnerUid}/${itemId}/${filename}`;

    // Check access permissions
    const isOwner = requestingAuth?.uid === fileOwnerUid;

    if (!isOwner) {
      // Not the owner - check if item is public
      const isPublic = await checkItemIsPublic(env, fileOwnerUid, itemId);
      if (!isPublic) {
        return Response.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Fetch from R2
    const object = await env.ETERNALOS_FILES.get(r2Key);

    if (!object) {
      return Response.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Build response with proper headers
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Length', object.size.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.httpEtag);

    // Handle conditional requests
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(object.body, { headers });

  } catch (error) {
    console.error('Serve file error:', error);
    return Response.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}

/**
 * Check if a desktop item is public
 * First tries KV cache, falls back to Durable Object
 */
async function checkItemIsPublic(
  env: Env,
  uid: string,
  itemId: string
): Promise<boolean> {
  // Try KV cache first (public snapshot)
  const cached = await env.DESKTOP_KV.get<{ items: DesktopItem[] }>(`public:${uid}`, 'json');
  if (cached) {
    const item = cached.items.find(i => i.id === itemId);
    if (item) return true; // It's in the public snapshot, so it's public
  }

  // Fall back to Durable Object
  const doId = env.USER_DESKTOP.idFromName(uid);
  const stub = env.USER_DESKTOP.get(doId);
  const response = await stub.fetch(new Request('http://internal/items'));

  if (!response.ok) {
    return false;
  }

  const data = await response.json() as { items: DesktopItem[] };
  const item = data.items.find(i => i.id === itemId);

  return item?.isPublic ?? false;
}

/**
 * Sanitize filename to remove potentially problematic characters
 */
function sanitizeFilename(name: string): string {
  // Remove path separators and null bytes
  let sanitized = name.replace(/[/\\:\0]/g, '_');
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    sanitized = sanitized.slice(0, 250 - ext.length) + '.' + ext;
  }
  return sanitized;
}
