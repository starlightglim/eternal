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
import { sanitizeFilename, sanitizeText } from '../utils/sanitize';

// Allowed MIME types for regular file uploads
const ALLOWED_TYPES: Record<string, string> = {
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  // Text
  'text/plain': 'txt',
  'text/markdown': 'md',
  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  // Audio
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
};

// Allowed MIME types for wallpaper uploads (images only)
const WALLPAPER_ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

// Max file size: 10MB for regular files
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max wallpaper size: 2MB
const MAX_WALLPAPER_SIZE = 2 * 1024 * 1024;

// Max custom icon size: 50KB
const MAX_ICON_SIZE = 50 * 1024;

// Allowed MIME types for custom icons (PNG only for pixel art)
const ICON_ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
};

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

    // Check storage quota
    const doId = env.USER_DESKTOP.idFromName(auth.uid);
    const stub = env.USER_DESKTOP.get(doId);
    const quotaCheckResponse = await stub.fetch(
      new Request('http://internal/quota/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSize: fileBlob.size }),
      })
    );

    if (!quotaCheckResponse.ok) {
      return Response.json(
        { error: 'Failed to check storage quota' },
        { status: 500 }
      );
    }

    const quotaCheck = await quotaCheckResponse.json() as { allowed: boolean; quota: { used: number; limit: number; remaining: number } };
    if (!quotaCheck.allowed) {
      const usedMB = (quotaCheck.quota.used / 1024 / 1024).toFixed(1);
      const limitMB = (quotaCheck.quota.limit / 1024 / 1024).toFixed(0);
      return Response.json(
        {
          error: `Storage quota exceeded. You're using ${usedMB}MB of ${limitMB}MB. Delete some files or empty your trash to free up space.`,
          quota: quotaCheck.quota,
        },
        { status: 413 } // 413 Payload Too Large
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

    // Parse optional metadata from form (sanitize user input)
    const customNameRaw = formData.get('name') as string | null;
    const customName = customNameRaw ? sanitizeText(customNameRaw, 255) : null;
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
    let itemType: 'image' | 'text' | 'video' | 'audio' = 'text';
    if (mimeType.startsWith('image/')) {
      itemType = 'image';
    } else if (mimeType.startsWith('video/')) {
      itemType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      itemType = 'audio';
    }

    // Create desktop item in Durable Object (reuse doId and stub from quota check)
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

    // Check for Range request header (needed for video/audio streaming)
    const rangeHeader = request.headers.get('Range');

    if (rangeHeader) {
      // Parse Range header (e.g., "bytes=0-999" or "bytes=500-")
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        // First, get total file size with head request
        const headResult = await env.ETERNALOS_FILES.head(r2Key);
        if (!headResult) {
          return Response.json(
            { error: 'File not found' },
            { status: 404 }
          );
        }
        const totalSize = headResult.size;
        const contentType = headResult.httpMetadata?.contentType || 'application/octet-stream';
        const etag = headResult.httpEtag;

        const start = parseInt(match[1], 10);
        // If no end specified, serve to end of file
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
        // Clamp end to file bounds
        const clampedEnd = Math.min(end, totalSize - 1);
        const length = clampedEnd - start + 1;

        // Validate range
        if (start >= totalSize || start < 0) {
          const headers = new Headers();
          headers.set('Content-Range', `bytes */${totalSize}`);
          return new Response(null, { status: 416, headers }); // Range Not Satisfiable
        }

        // Fetch partial content from R2
        const object = await env.ETERNALOS_FILES.get(r2Key, {
          range: { offset: start, length },
        });

        if (!object) {
          return Response.json(
            { error: 'File not found' },
            { status: 404 }
          );
        }

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Length', length.toString());
        headers.set('Content-Range', `bytes ${start}-${clampedEnd}/${totalSize}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('ETag', etag);

        return new Response(object.body, { status: 206, headers });
      }
    }

    // No range request - fetch full file
    const object = await env.ETERNALOS_FILES.get(r2Key);

    if (!object) {
      return Response.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Build response with proper headers
    const headers = new Headers();
    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', object.size.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.httpEtag);
    // Always indicate we accept ranges for video/audio
    headers.set('Accept-Ranges', 'bytes');

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

// Note: sanitizeFilename is now imported from utils/sanitize.ts
// which provides a more comprehensive implementation with:
// - Path traversal prevention (removes .., /, \)
// - Control character removal
// - Problematic character replacement (<>:"|?*)
// - Proper extension handling
// - Length limiting

/**
 * Handle custom wallpaper upload
 * POST /api/wallpaper
 *
 * Expects multipart/form-data with:
 * - file: The wallpaper image file (jpg/png, max 2MB)
 */
export async function handleWallpaperUpload(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return Response.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileBlob = file as File;

    // Validate file type (only jpg/png for wallpapers)
    const mimeType = fileBlob.type;
    if (!WALLPAPER_ALLOWED_TYPES[mimeType]) {
      return Response.json(
        { error: `Invalid file type: ${mimeType}. Only JPG and PNG allowed for wallpapers.` },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB for wallpapers)
    if (fileBlob.size > MAX_WALLPAPER_SIZE) {
      return Response.json(
        { error: `File too large. Maximum wallpaper size: ${MAX_WALLPAPER_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Check storage quota (wallpapers count against quota too)
    const doId = env.USER_DESKTOP.idFromName(auth.uid);
    const stub = env.USER_DESKTOP.get(doId);
    const quotaCheckResponse = await stub.fetch(
      new Request('http://internal/quota/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSize: fileBlob.size }),
      })
    );

    if (!quotaCheckResponse.ok) {
      return Response.json(
        { error: 'Failed to check storage quota' },
        { status: 500 }
      );
    }

    const quotaCheck = await quotaCheckResponse.json() as { allowed: boolean; quota: { used: number; limit: number; remaining: number } };
    if (!quotaCheck.allowed) {
      const usedMB = (quotaCheck.quota.used / 1024 / 1024).toFixed(1);
      const limitMB = (quotaCheck.quota.limit / 1024 / 1024).toFixed(0);
      return Response.json(
        {
          error: `Storage quota exceeded. You're using ${usedMB}MB of ${limitMB}MB. Delete some files to free up space.`,
          quota: quotaCheck.quota,
        },
        { status: 413 }
      );
    }

    // Get the current wallpaper before uploading new one (so we can clean up the old R2 file)
    const profileResponse1 = await stub.fetch(new Request('http://internal/profile'));
    let oldWallpaperR2Key: string | null = null;
    if (profileResponse1.ok) {
      const profileData = await profileResponse1.json() as { profile?: { wallpaper?: string } };
      const oldWallpaper = profileData.profile?.wallpaper;
      if (oldWallpaper?.startsWith('custom:')) {
        // Extract the R2 key from the wallpaper value: "custom:uid/wallpaperId/filename"
        const oldPath = oldWallpaper.slice('custom:'.length);
        // R2 key format: uid/wallpaper/wallpaperId/filename
        const parts = oldPath.split('/');
        if (parts.length >= 3) {
          oldWallpaperR2Key = `${parts[0]}/wallpaper/${parts[1]}/${parts[2]}`;
        }
      }
    }

    // Generate unique wallpaper ID
    const wallpaperId = crypto.randomUUID();
    const ext = WALLPAPER_ALLOWED_TYPES[mimeType];
    const filename = `wallpaper.${ext}`;
    const r2Key = `${auth.uid}/wallpaper/${wallpaperId}/${filename}`;

    // Upload to R2
    const fileBuffer = await fileBlob.arrayBuffer();
    await env.ETERNALOS_FILES.put(r2Key, fileBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        uploadedBy: auth.uid,
        wallpaperId,
        type: 'custom-wallpaper',
      },
    });

    // Update the user's profile with the new wallpaper (reuse doId and stub from quota check)
    // Store just the path parts needed for URL construction (uid/wallpaperId/filename)
    // The "wallpaper" segment is already in the API path, so we don't include it here
    const wallpaperValue = `custom:${auth.uid}/${wallpaperId}/${filename}`;

    const profileResponse = await stub.fetch(
      new Request('http://internal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallpaper: wallpaperValue }),
      })
    );

    if (!profileResponse.ok) {
      // Cleanup R2 if profile update fails
      await env.ETERNALOS_FILES.delete(r2Key);
      return Response.json(
        { error: 'Failed to update profile with new wallpaper' },
        { status: 500 }
      );
    }

    const updatedProfile = await profileResponse.json();

    // Clean up the old wallpaper file from R2 (prevent orphaned files)
    if (oldWallpaperR2Key) {
      try {
        await env.ETERNALOS_FILES.delete(oldWallpaperR2Key);
      } catch (cleanupError) {
        // Non-critical — old file remains but doesn't affect functionality
        console.error('Failed to clean up old wallpaper:', cleanupError);
      }
    }

    return Response.json({
      success: true,
      wallpaper: wallpaperValue,
      r2Key,
      profile: updatedProfile,
    });

  } catch (error) {
    console.error('Wallpaper upload error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Wallpaper upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Serve wallpaper from R2
 * GET /api/wallpaper/:uid/:wallpaperId/:filename
 *
 * Wallpapers are always public (accessible by visitors)
 */
export async function handleServeWallpaper(
  request: Request,
  env: Env,
  uid: string,
  wallpaperId: string,
  filename: string
): Promise<Response> {
  try {
    // Construct R2 key
    const r2Key = `${uid}/wallpaper/${wallpaperId}/${filename}`;

    // Fetch from R2
    const object = await env.ETERNALOS_FILES.get(r2Key);

    if (!object) {
      return Response.json(
        { error: 'Wallpaper not found' },
        { status: 404 }
      );
    }

    // Build response with proper headers
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
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
    console.error('Serve wallpaper error:', error);
    return Response.json(
      { error: 'Failed to serve wallpaper' },
      { status: 500 }
    );
  }
}

/**
 * Handle custom icon upload
 * POST /api/icon
 *
 * Expects multipart/form-data with:
 * - file: The icon image file (PNG only, max 50KB)
 * - itemId: The desktop item ID to associate the icon with
 *
 * Icons are stored at {uid}/icons/{itemId}.png
 * The item's customIcon field is updated to point to the R2 key
 */
export async function handleIconUpload(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const itemId = formData.get('itemId') as string | null;

    if (!file || typeof file === 'string') {
      return Response.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!itemId) {
      return Response.json(
        { error: 'No itemId provided' },
        { status: 400 }
      );
    }

    const fileBlob = file as File;

    // Validate file type (only PNG for icons)
    const mimeType = fileBlob.type;
    if (!ICON_ALLOWED_TYPES[mimeType]) {
      return Response.json(
        { error: `Invalid file type: ${mimeType}. Only PNG files are allowed for custom icons.` },
        { status: 400 }
      );
    }

    // Validate file size (max 50KB for icons)
    if (fileBlob.size > MAX_ICON_SIZE) {
      return Response.json(
        { error: `File too large. Maximum icon size: ${MAX_ICON_SIZE / 1024}KB` },
        { status: 400 }
      );
    }

    // Verify the item exists and belongs to this user
    const doId = env.USER_DESKTOP.idFromName(auth.uid);
    const stub = env.USER_DESKTOP.get(doId);

    const itemCheckResponse = await stub.fetch(new Request('http://internal/items'));
    if (!itemCheckResponse.ok) {
      return Response.json(
        { error: 'Failed to verify item ownership' },
        { status: 500 }
      );
    }

    const { items } = await itemCheckResponse.json() as { items: DesktopItem[] };
    const item = items.find(i => i.id === itemId);
    if (!item) {
      return Response.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Generate R2 key for the icon
    const r2Key = `${auth.uid}/icons/${itemId}.png`;

    // Upload to R2
    const fileBuffer = await fileBlob.arrayBuffer();
    await env.ETERNALOS_FILES.put(r2Key, fileBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        uploadedBy: auth.uid,
        itemId,
        type: 'custom-icon',
      },
    });

    // Update the item's customIcon field to point to the R2 key
    // Use a special prefix to distinguish uploaded icons from library icons
    const customIconValue = `upload:${r2Key}`;

    const updateResponse = await stub.fetch(
      new Request('http://internal/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          id: itemId,
          updates: { customIcon: customIconValue },
        }]),
      })
    );

    if (!updateResponse.ok) {
      // Cleanup R2 if update fails
      await env.ETERNALOS_FILES.delete(r2Key);
      return Response.json(
        { error: 'Failed to update item with custom icon' },
        { status: 500 }
      );
    }

    const updatedItems = await updateResponse.json() as DesktopItem[];

    return Response.json({
      success: true,
      customIcon: customIconValue,
      r2Key,
      item: updatedItems[0],
    });

  } catch (error) {
    console.error('Icon upload error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Icon upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Serve custom icon from R2
 * GET /api/icon/:uid/:itemId/:filename
 *
 * Custom icons are always public (visible in visitor mode)
 */
export async function handleServeIcon(
  request: Request,
  env: Env,
  uid: string,
  itemId: string,
  filename: string
): Promise<Response> {
  try {
    // Construct R2 key
    const r2Key = `${uid}/icons/${itemId}.png`;

    // Fetch from R2
    const object = await env.ETERNALOS_FILES.get(r2Key);

    if (!object) {
      return Response.json(
        { error: 'Icon not found' },
        { status: 404 }
      );
    }

    // Build response with proper headers
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
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
    console.error('Serve icon error:', error);
    return Response.json(
      { error: 'Failed to serve icon' },
      { status: 500 }
    );
  }
}
