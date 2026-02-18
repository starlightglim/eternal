// Visitor Page - Read-only view of a user's desktop
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WindowManager } from '../components/window';
import { DesktopIcon } from '../components/icons';
import { MobileBrowser } from '../components/desktop/MobileBrowser';
import { VisitorMenuBar } from '../components/menubar/VisitorMenuBar';
import { useWindowStore } from '../stores/windowStore';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useIsMobile } from '../hooks/useIsMobile';
import { isApiConfigured, fetchVisitorDesktop, getWallpaperUrl } from '../services/api';
import { getTextFileContentType, type DesktopItem, type UserProfile } from '../types';
import styles from './VisitorPage.module.css';

const GRID_CELL_SIZE = 80;

type LoadingState = 'loading' | 'loaded' | 'not_found' | 'empty' | 'error';

// Mock data for demo mode visitor view
const mockVisitorItems: DesktopItem[] = [
  {
    id: 'visitor-folder',
    type: 'folder',
    name: 'Shared Folder',
    parentId: null,
    position: { x: 0, y: 0 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'visitor-text',
    type: 'text',
    name: 'Welcome.txt',
    parentId: null,
    position: { x: 0, y: 1 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    textContent: 'Welcome to my desktop!\n\nFeel free to look around.',
  },
  {
    id: 'visitor-image',
    type: 'image',
    name: 'Photo.png',
    parentId: null,
    position: { x: 1, y: 0 },
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mimeType: 'image/png',
  },
];

export function VisitorPage() {
  const { username } = useParams<{ username: string }>();
  const { openWindow } = useWindowStore();
  const isMobile = useIsMobile();

  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<DesktopItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Build meta config based on current state
  const metaConfig = useMemo(() => {
    const displayName = profile?.displayName || username || 'Unknown';
    const itemCount = items.filter((i) => i.parentId === null).length;

    return {
      title: `@${username}'s Desktop | EternalOS`,
      description: `Visit ${displayName}'s personal desktop on EternalOS. ${itemCount} item${itemCount !== 1 ? 's' : ''} on display.`,
      ogTitle: `@${username}'s Desktop`,
      ogDescription: `A personal corner of the internet. ${itemCount} item${itemCount !== 1 ? 's' : ''} curated by ${displayName}.`,
      ogType: 'website',
      ogUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      twitterCard: 'summary' as const,
    };
  }, [username, profile, items]);

  // Apply meta tags
  useDocumentMeta(metaConfig);

  // Fetch user data on mount
  useEffect(() => {
    if (!username) {
      setLoadingState('not_found');
      return;
    }

    // Demo mode - use mock data
    if (!isApiConfigured) {
      setProfile({
        uid: 'demo-user',
        username: username,
        displayName: username,
        createdAt: Date.now(),
        wallpaper: undefined,
      });
      setItems(mockVisitorItems);
      setLoadingState('loaded');
      return;
    }

    // API mode - fetch real data
    const loadVisitorData = async () => {
      try {
        setLoadingState('loading');

        const data = await fetchVisitorDesktop(username);

        setProfile(data.profile);

        if (data.items.length === 0) {
          setItems([]);
          setLoadingState('empty');
        } else {
          setItems(data.items);
          setLoadingState('loaded');
        }
      } catch (error) {
        console.error('Error loading visitor data:', error);
        if (error instanceof Error && error.message === 'User not found') {
          setLoadingState('not_found');
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load desktop');
          setLoadingState('error');
        }
      }
    };

    loadVisitorData();
  }, [username]);

  // Get root-level items (parentId === null)
  const rootItems = items.filter((item) => item.parentId === null);

  // Handle icon selection (simple click, no shift-click in visitor mode)
  const handleIconSelect = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  // Handle desktop click to deselect
  const handleDesktopClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedIds(new Set());
    }
  }, []);

  // Handle double-click to open (read-only viewing)
  const handleIconDoubleClick = useCallback((item: DesktopItem) => {
    // Create a counter for window positioning (based on existing windows)
    const existingWindows = useWindowStore.getState().windows.length;
    const offsetX = 30 * existingWindows;
    const offsetY = 30 * existingWindows;

    if (item.type === 'folder') {
      openWindow({
        id: `visitor-folder-${item.id}`,
        title: item.name,
        position: { x: 100 + offsetX, y: 100 + offsetY },
        size: { width: 400, height: 300 },
        minimized: false,
        maximized: false,
        contentType: 'folder',
        contentId: item.id,
      });
    } else if (item.type === 'text') {
      const contentType = getTextFileContentType(item.name);
      openWindow({
        id: `visitor-text-${item.id}`,
        title: item.name,
        position: { x: 150 + offsetX, y: 120 + offsetY },
        size: { width: 400, height: 300 },
        minimized: false,
        maximized: false,
        contentType,
        contentId: item.id,
      });
    } else if (item.type === 'image') {
      openWindow({
        id: `visitor-image-${item.id}`,
        title: item.name,
        position: { x: 120 + offsetX, y: 80 + offsetY },
        size: { width: 450, height: 350 },
        minimized: false,
        maximized: false,
        contentType: 'image',
        contentId: item.id,
      });
    } else if (item.type === 'video') {
      openWindow({
        id: `visitor-video-${item.id}`,
        title: item.name,
        position: { x: 100 + offsetX, y: 60 + offsetY },
        size: { width: 640, height: 480 },
        minimized: false,
        maximized: false,
        contentType: 'video',
        contentId: item.id,
      });
    } else if (item.type === 'audio') {
      openWindow({
        id: `visitor-audio-${item.id}`,
        title: item.name,
        position: { x: 150 + offsetX, y: 150 + offsetY },
        size: { width: 300, height: 180 },
        minimized: false,
        maximized: false,
        contentType: 'audio',
        contentId: item.id,
      });
    } else if (item.type === 'pdf') {
      openWindow({
        id: `visitor-pdf-${item.id}`,
        title: item.name,
        position: { x: 80 + offsetX, y: 40 + offsetY },
        size: { width: 550, height: 700 },
        minimized: false,
        maximized: false,
        contentType: 'pdf',
        contentId: item.id,
      });
    } else if (item.type === 'link' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  }, [openWindow]);

  // Loading state
  if (loadingState === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingText}>Loading desktop...</div>
        </div>
      </div>
    );
  }

  // User not found - classic Mac error dialog
  if (loadingState === 'not_found') {
    return (
      <div className={styles.container}>
        <div className={styles.errorDialog}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorTitle}>User Not Found</div>
          <div className={styles.errorMessage}>
            The desktop for "@{username}" could not be found.
          </div>
          <Link to="/" className={styles.errorButton}>OK</Link>
        </div>
      </div>
    );
  }

  // Error state
  if (loadingState === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.errorDialog}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorTitle}>Error</div>
          <div className={styles.errorMessage}>
            {errorMessage || 'An unexpected error occurred.'}
          </div>
          <Link to="/" className={styles.errorButton}>OK</Link>
        </div>
      </div>
    );
  }

  // Calculate wallpaper class and style
  const wallpaperValue = profile?.wallpaper;
  const isCustomWallpaper = wallpaperValue?.startsWith('custom:');
  const wallpaperClass = isCustomWallpaper ? '' : `wallpaper-${wallpaperValue || 'default'}`;
  const wallpaperStyle = isCustomWallpaper
    ? {
        backgroundImage: `url(${getWallpaperUrl(wallpaperValue!)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  // Empty desktop state
  if (loadingState === 'empty') {
    return (
      <div className={styles.container}>
        <VisitorMenuBar username={username || ''} />
        <div
          className={`${styles.desktop} ${wallpaperClass}`}
          style={wallpaperStyle}
        >
          <div className={styles.emptyDesktopWindow}>
            <div className={styles.emptyWindowTitleBar}>
              <span className={styles.emptyWindowTitle}>@{username}'s Desktop</span>
            </div>
            <div className={styles.emptyWindowContent}>
              <p>This desktop is empty.</p>
              <p className={styles.emptySubtext}>No public items to display.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loaded state - render the visitor desktop
  // On mobile, use MobileBrowser for better touch experience
  if (isMobile) {
    return (
      <MobileBrowser
        isVisitorMode={true}
        visitorItems={items}
        username={username}
      />
    );
  }

  // Desktop view
  return (
    <div className={styles.container}>
      <VisitorMenuBar username={username || ''} />
      <div
        className={`${styles.desktop} ${wallpaperClass}`}
        style={wallpaperStyle}
        onClick={handleDesktopClick}
      >
        {/* Desktop Icons - Read-only, no dragging */}
        {rootItems.map((item) => (
          <DesktopIcon
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            gridCellSize={GRID_CELL_SIZE}
            onSelect={handleIconSelect}
            onDoubleClick={handleIconDoubleClick}
            // No drag handlers - visitor mode is read-only
            onDragStart={undefined}
            onDragMove={undefined}
            onDragEnd={undefined}
            isDragging={false}
          />
        ))}

        {/* Window Manager - windows can still be moved/resized for browsing */}
        <WindowManager isVisitorMode={true} visitorItems={items} />
      </div>
    </div>
  );
}
