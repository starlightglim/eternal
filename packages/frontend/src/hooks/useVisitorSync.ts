/**
 * useVisitorSync — WebSocket hook for real-time visitor page updates.
 *
 * Connects to the owner's Durable Object via /api/ws/:username and
 * receives live item, window, and profile changes.
 */
import { useEffect, useEffectEvent, useRef } from 'react';
import type { DesktopItem, UserProfile } from '../types';
import type { SavedWindowState } from '../services/api';

interface UseVisitorSyncOptions {
  username: string | undefined;
  enabled: boolean;
  onItemsUpdate: (items: DesktopItem[]) => void;
  onWindowsUpdate: (windows: SavedWindowState[]) => void;
  onProfileUpdate: (profile: UserProfile) => void;
}

export function useVisitorSync({
  username,
  enabled,
  onItemsUpdate,
  onWindowsUpdate,
  onProfileUpdate,
}: UseVisitorSyncOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectDelayRef = useRef(1000);
  const connectRef = useRef<() => void>(() => {});
  const connect = useEffectEvent(() => {
    if (!username || !enabled) return;

    // Derive WebSocket URL from API URL
    const apiUrl = import.meta.env.VITE_API_URL || '';
    let wsUrl: string;
    if (apiUrl) {
      wsUrl = apiUrl.replace(/^http/, 'ws') + `/api/ws/${username}`;
    } else {
      // Relative — use current host (dev proxy)
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.host}/api/ws/${username}`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Reset backoff on successful connection
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'snapshot':
            if (data.items) onItemsUpdate(data.items);
            if (data.windows) onWindowsUpdate(data.windows);
            if (data.profile) onProfileUpdate(data.profile);
            break;
          case 'items':
            if (data.items) onItemsUpdate(data.items);
            break;
          case 'windows':
            if (data.windows) onWindowsUpdate(data.windows);
            break;
          case 'profile':
            if (data.profile) onProfileUpdate(data.profile);
            break;
        }
      } catch (err) {
        console.error('[useVisitorSync] message parse error:', err);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!enabled) return;

      // Reconnect with exponential backoff (cap at 30s)
      const delay = reconnectDelayRef.current;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(delay * 2, 30000);
        connectRef.current();
      }, delay);
    };

    ws.onerror = () => {
      // Error will trigger onclose, reconnect handled there
    };
  });

  useEffect(() => {
    connectRef.current = connect;
  });

  useEffect(() => {
    if (!enabled || !username) return;

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, username]);
}
