// Hook for syncing desktop state with Cloudflare Workers API
import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDesktopStore } from '../stores/desktopStore';
import { useAppearanceStore } from '../stores/appearanceStore';
import { isApiConfigured, fetchDesktop } from '../services/api';

/**
 * Hook to synchronize desktop state with API
 * - Loads items on mount when user is authenticated
 * - Updates profile (wallpaper, displayName) from backend
 * - Handles cleanup on unmount or user change
 */
export function useDesktopSync() {
  // Select primitives/stable references to avoid infinite loops
  const user = useAuthStore((state) => state.user);
  const setItems = useDesktopStore((state) => state.setItems);
  const setUid = useDesktopStore((state) => state.setUid);
  const setLoading = useDesktopStore((state) => state.setLoading);
  const fetchedRef = useRef<string | null>(null);

  // Stable callback to update profile
  const updateProfileFromBackend = useCallback((backendProfile: {
    displayName?: string;
    wallpaper?: string;
    isNewUser?: boolean;
    accentColor?: string;
    desktopColor?: string;
    windowBgColor?: string;
    fontSmoothing?: boolean;
    customCSS?: string;
  }) => {
    const currentProfile = useAuthStore.getState().profile;
    if (currentProfile) {
      useAuthStore.setState({
        profile: {
          ...currentProfile,
          displayName: backendProfile.displayName || currentProfile.displayName,
          wallpaper: backendProfile.wallpaper || currentProfile.wallpaper,
          isNewUser: backendProfile.isNewUser,
          accentColor: backendProfile.accentColor,
          desktopColor: backendProfile.desktopColor,
          windowBgColor: backendProfile.windowBgColor,
          fontSmoothing: backendProfile.fontSmoothing,
          customCSS: backendProfile.customCSS,
        },
      });
    }
  }, []);

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

    // Fetch items and profile from API
    fetchDesktop()
      .then((data) => {
        setItems(data.items);
        setLoading(false);

        // Store server window state for restoration by Desktop.tsx
        if (data.windows && data.windows.length > 0) {
          useDesktopStore.setState({ serverWindows: data.windows });
        }

        // Update profile from backend if available
        // This syncs wallpaper and other preferences from the server
        if (data.profile) {
          updateProfileFromBackend(data.profile);

          // Sync appearance settings (accent color, custom CSS, etc.) to the appearance store
          // so they get applied to the DOM. Without this, backend-saved appearance is ignored.
          const hasAppearance = data.profile.accentColor || data.profile.desktopColor ||
            data.profile.windowBgColor || data.profile.fontSmoothing !== undefined ||
            data.profile.customCSS;
          if (hasAppearance) {
            useAppearanceStore.getState().loadAppearance({
              accentColor: data.profile.accentColor,
              desktopColor: data.profile.desktopColor,
              windowBgColor: data.profile.windowBgColor,
              fontSmoothing: data.profile.fontSmoothing,
              customCSS: data.profile.customCSS,
            });
          }
        }
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
  }, [user, setItems, setUid, setLoading, updateProfileFromBackend]);
}
