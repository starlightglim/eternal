/**
 * UserDesktop Durable Object
 *
 * Per-user desktop state management. Each user gets one instance
 * that holds their complete desktop: items, positions, folder hierarchy.
 *
 * All state is persisted in Durable Object transactional storage.
 */

import type { Env } from '../index';
import type { DesktopItem, UserProfile } from '../types';

export class UserDesktop {
  private state: DurableObjectState;
  private env: Env;
  private items: Map<string, DesktopItem> = new Map();
  private profile: UserProfile | null = null;
  private initialized = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Initialize state from storage on first request
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load all items from storage
    const storedItems = await this.state.storage.get<DesktopItem[]>('items');
    if (storedItems) {
      for (const item of storedItems) {
        this.items.set(item.id, item);
      }
    }

    // Load profile
    this.profile = await this.state.storage.get<UserProfile>('profile') ?? null;

    this.initialized = true;
  }

  /**
   * Handle incoming requests
   */
  async fetch(request: Request): Promise<Response> {
    await this.initialize();

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // GET /items - Get all items
      if (path === '/items' && method === 'GET') {
        return Response.json({
          items: Array.from(this.items.values()),
          profile: this.profile,
        });
      }

      // POST /items - Create new item
      if (path === '/items' && method === 'POST') {
        const item = await request.json() as Partial<DesktopItem>;
        const newItem = await this.createItem(item);
        return Response.json(newItem);
      }

      // PATCH /items - Batch update items
      if (path === '/items' && method === 'PATCH') {
        const patches = await request.json() as Array<{ id: string; updates: Partial<DesktopItem> }>;
        const updated = await this.updateItems(patches);
        return Response.json(updated);
      }

      // DELETE /items/:id - Delete item
      if (path.startsWith('/items/') && method === 'DELETE') {
        const id = path.slice('/items/'.length);
        const deleted = await this.deleteItem(id);
        return Response.json(deleted);
      }

      // GET /public-snapshot - Get public items only
      if (path === '/public-snapshot' && method === 'GET') {
        const snapshot = await this.getPublicSnapshot();
        return Response.json(snapshot);
      }

      // POST /profile - Initialize or update profile
      if (path === '/profile' && method === 'POST') {
        const profileData = await request.json() as UserProfile;
        await this.setProfile(profileData);
        return Response.json({ success: true });
      }

      return Response.json({ error: 'Not found' }, { status: 404 });

    } catch (error) {
      console.error('UserDesktop error:', error);
      return Response.json(
        { error: error instanceof Error ? error.message : 'Internal error' },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new desktop item
   * If an ID is provided (e.g., for file uploads), use it; otherwise generate one
   */
  private async createItem(partial: Partial<DesktopItem>): Promise<DesktopItem> {
    const now = Date.now();
    const item: DesktopItem = {
      id: partial.id || crypto.randomUUID(),
      type: partial.type ?? 'folder',
      name: partial.name ?? 'Untitled',
      parentId: partial.parentId ?? null,
      position: partial.position ?? { x: 0, y: 0 },
      isPublic: partial.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
      r2Key: partial.r2Key,
      mimeType: partial.mimeType,
      fileSize: partial.fileSize,
      textContent: partial.textContent,
      url: partial.url,
    };

    this.items.set(item.id, item);
    await this.saveItems();
    return item;
  }

  /**
   * Batch update items (positions, names, visibility, etc.)
   */
  private async updateItems(
    patches: Array<{ id: string; updates: Partial<DesktopItem> }>
  ): Promise<DesktopItem[]> {
    const updated: DesktopItem[] = [];

    for (const { id, updates } of patches) {
      const item = this.items.get(id);
      if (item) {
        const updatedItem = {
          ...item,
          ...updates,
          updatedAt: Date.now(),
        };
        this.items.set(id, updatedItem);
        updated.push(updatedItem);
      }
    }

    if (updated.length > 0) {
      await this.saveItems();
    }

    return updated;
  }

  /**
   * Delete an item and return its r2Key for cleanup
   */
  private async deleteItem(id: string): Promise<{ deleted: boolean; r2Key?: string }> {
    const item = this.items.get(id);
    if (!item) {
      return { deleted: false };
    }

    const r2Key = item.r2Key;
    this.items.delete(id);
    await this.saveItems();

    return { deleted: true, r2Key };
  }

  /**
   * Get public items only (for visitor mode)
   */
  private async getPublicSnapshot(): Promise<{
    items: DesktopItem[];
    profile: UserProfile | null;
  }> {
    const publicItems = Array.from(this.items.values()).filter((item) => item.isPublic);

    // Also push to KV for fast visitor reads (if we have the UID in profile)
    if (this.profile?.uid) {
      await this.env.DESKTOP_KV.put(
        `public:${this.profile.uid}`,
        JSON.stringify({ items: publicItems, profile: this.profile }),
        { expirationTtl: 300 } // Cache for 5 minutes
      );
    }

    return {
      items: publicItems,
      profile: this.profile,
    };
  }

  /**
   * Set user profile
   */
  private async setProfile(profile: UserProfile): Promise<void> {
    this.profile = profile;
    await this.state.storage.put('profile', profile);
  }

  /**
   * Persist items to DO storage
   */
  private async saveItems(): Promise<void> {
    const itemsArray = Array.from(this.items.values());
    await this.state.storage.put('items', itemsArray);
  }
}
