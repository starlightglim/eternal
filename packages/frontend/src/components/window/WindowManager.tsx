import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { useDesktopStore } from '../../stores/desktopStore';
import { ImageViewer } from '../viewers/ImageViewer';
import { TextViewer } from '../viewers/TextViewer';
import { GetInfo } from '../viewers/GetInfo';
import { WallpaperPicker } from '../viewers/WallpaperPicker';
import { WelcomeReadMe } from '../viewers/WelcomeReadMe';
import { DeskAssistant } from '../assistant';
import { FolderView } from './FolderView';
import type { DesktopItem } from '../../types';

interface WindowManagerProps {
  isVisitorMode?: boolean;
  visitorItems?: DesktopItem[];
}

/**
 * WindowManager - renders all open windows
 * Manages which window is active (top z-index)
 */
export function WindowManager({ isVisitorMode = false, visitorItems }: WindowManagerProps) {
  const windows = useWindowStore((state) => state.windows);

  // Find the active window (highest z-index among non-minimized)
  const visibleWindows = windows.filter((w) => !w.minimized);
  const activeWindowId =
    visibleWindows.length > 0
      ? visibleWindows.reduce((top, w) => (w.zIndex > top.zIndex ? w : top)).id
      : null;

  return (
    <>
      {windows.map((win) => (
        <Window
          key={win.id}
          id={win.id}
          title={win.title}
          position={win.position}
          size={win.size}
          zIndex={win.zIndex}
          minimized={win.minimized}
          isActive={win.id === activeWindowId}
        >
          {/* Window content will be rendered based on contentType */}
          <WindowContent
            contentType={win.contentType}
            contentId={win.contentId}
            isVisitorMode={isVisitorMode}
            visitorItems={visitorItems}
          />
        </Window>
      ))}
    </>
  );
}

/**
 * Renders content inside a window based on its type
 * Uses real viewers for images and text, folder view for folders
 */
function WindowContent({
  contentType,
  contentId,
  isVisitorMode = false,
  visitorItems,
}: {
  contentType: string;
  contentId?: string;
  isVisitorMode?: boolean;
  visitorItems?: DesktopItem[];
}) {
  const getItem = useDesktopStore((state) => state.getItem);

  // In visitor mode, look up items from visitorItems instead of the store
  const item = contentId
    ? isVisitorMode && visitorItems
      ? visitorItems.find((i) => i.id === contentId)
      : getItem(contentId)
    : undefined;

  switch (contentType) {
    case 'folder':
      return (
        <FolderView
          folderId={contentId || null}
          visitorItems={isVisitorMode ? visitorItems : undefined}
        />
      );

    case 'image':
      if (!item) {
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: 'var(--platinum)',
            }}
          >
            <p style={{ color: 'var(--shadow)', fontSize: '12px' }}>Image not found</p>
          </div>
        );
      }
      return (
        <ImageViewer
          itemId={item.id}
          name={item.name}
          r2Key={item.r2Key}
          mimeType={item.mimeType}
        />
      );

    case 'text':
      if (!item) {
        return (
          <div
            style={{
              padding: '8px',
              fontFamily: 'var(--font-monaco)',
              fontSize: '12px',
            }}
          >
            <p style={{ color: 'var(--shadow)' }}>Text file not found</p>
          </div>
        );
      }
      return (
        <TextViewer
          itemId={item.id}
          name={item.name}
          textContent={item.textContent}
          isOwner={!isVisitorMode} // Read-only in visitor mode
        />
      );

    case 'get-info':
      if (!item) {
        return (
          <div
            style={{
              padding: '12px',
              fontFamily: 'var(--font-geneva)',
              fontSize: '11px',
              color: 'var(--shadow)',
            }}
          >
            Item not found
          </div>
        );
      }
      return <GetInfo item={item} isOwner={!isVisitorMode} />;

    case 'about':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-chicago)',
              fontSize: '16px',
              marginBottom: '8px',
            }}
          >
            EternalOS
          </h2>
          <p style={{ fontFamily: 'var(--font-geneva)', fontSize: '11px', color: 'var(--shadow)' }}>
            Your corner of the internet
          </p>
          <p
            style={{
              fontFamily: 'var(--font-geneva)',
              fontSize: '10px',
              color: 'var(--shadow)',
              marginTop: '12px',
            }}
          >
            Version 0.1.0
          </p>
        </div>
      );

    case 'assistant':
      return <DeskAssistant isOwner={!isVisitorMode} />;

    case 'wallpaper':
      return <WallpaperPicker />;

    case 'welcome':
      return <WelcomeReadMe />;

    default:
      return null;
  }
}
