// Hook for syncing desktop state with Cloudflare Workers API
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDesktopStore } from '../stores/desktopStore';
import { isApiConfigured, fetchDesktop } from '../services/api';

/**
 * Hook to synchronize desktop state with API
 * - Loads items on mount when user is authenticated
 * - Handles cleanup on unmount or user change
 */
export function useDesktopSync() {
  const { user } = useAuthStore();
  const { setItems, setUid, setLoading } = useDesktopStore();
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if API is not configured (demo mode)
    if (!isApiConfigured) {
      return;
    }

    // If no user, clear the uid and reset items
    if (!user) {
      setUid(null);
      setItems([]);
      fetchedRef.current = null;
      return;
    }

    // Prevent duplicate fetches for the same user
    if (fetchedRef.current === user.uid) {
      return;
    }

    // Set the uid for the desktop store
    setUid(user.uid);
    setLoading(true);
    fetchedRef.current = user.uid;

    // Fetch items from API
    fetchDesktop()
      .then((data) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch desktop items:', error);
        setLoading(false);
        // Reset fetchedRef to allow retry
        fetchedRef.current = null;
      });

    // Cleanup on unmount or user change
    return () => {
      // No cleanup needed for API-based sync
    };
  }, [user, setItems, setUid, setLoading]);
}
