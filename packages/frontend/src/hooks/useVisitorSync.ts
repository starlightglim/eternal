/**
 * useVisitorSync — WebSocket hook for real-time visitor page updates.
 *
 * Connects to the owner's Durable Object via /api/ws/:username and
 * receives live item, window, and profile changes.
 */
import { useEffect, useRef, useCallback } from 'react';
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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(1000);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Stable callback refs to avoid reconnecting on callback changes
  const onItemsRef = useRef(onItemsUpdate);
  onItemsRef.current = onItemsUpdate;
  const onWindowsRef = useRef(onWindowsUpdate);
  onWindowsRef.current = onWindowsUpdate;
  const onProfileRef = useRef(onProfileUpdate);
  onProfileRef.current = onProfileUpdate;

  const connect = useCallback(() => {
    if (!username || !enabledRef.current) return;

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
            if (data.items) onItemsRef.current(data.items);
            if (data.windows) onWindowsRef.current(data.windows);
            if (data.profile) onProfileRef.current(data.profile);
            break;
          case 'items':
            if (data.items) onItemsRef.current(data.items);
            break;
          case 'windows':
            if (data.windows) onWindowsRef.current(data.windows);
            break;
          case 'profile':
            if (data.profile) onProfileRef.current(data.profile);
            break;
        }
      } catch (err) {
        console.error('[useVisitorSync] message parse error:', err);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!enabledRef.current) return;

      // Reconnect with exponential backoff (cap at 30s)
      const delay = reconnectDelayRef.current;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(delay * 2, 30000);
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // Error will trigger onclose, reconnect handled there
    };
  }, [username]);

  useEffect(() => {
    if (!enabled || !username) return;

    connect();

    return () => {
      enabledRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, username, connect]);
}
