/**
 * WidgetRenderer - Routes widget items to their specific widget components
 */

import type { DesktopItem, WidgetType, WidgetConfig } from '../../types';
import { StickyNote } from './StickyNote';
import { Guestbook } from './Guestbook';
import { MusicPlayer } from './MusicPlayer';
import { PixelCanvas } from './PixelCanvas';
import { LinkBoard } from './LinkBoard';

interface WidgetRendererProps {
  item: DesktopItem;
  isOwner: boolean;
  onConfigUpdate?: (config: WidgetConfig) => void;
  ownerUid?: string;
}

/**
 * Renders the appropriate widget based on widgetType
 */
export function WidgetRenderer({ item, isOwner, onConfigUpdate, ownerUid }: WidgetRendererProps) {
  const { widgetType, widgetConfig } = item;

  if (!widgetType) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '20px',
          fontFamily: 'var(--font-geneva)',
          fontSize: '11px',
          color: 'var(--shadow)',
        }}
      >
        Unknown widget type
      </div>
    );
  }

  const handleConfigUpdate = (newConfig: WidgetConfig) => {
    onConfigUpdate?.(newConfig);
  };

  switch (widgetType as WidgetType) {
    case 'sticky-note':
      return (
        <StickyNote
          itemId={item.id}
          config={widgetConfig as any}
          isOwner={isOwner}
          onConfigUpdate={handleConfigUpdate}
        />
      );

    case 'guestbook':
      return (
        <Guestbook
          itemId={item.id}
          ownerUid={ownerUid || ''}
          config={widgetConfig as any}
          isOwner={isOwner}
          onConfigUpdate={handleConfigUpdate}
        />
      );

    case 'music-player':
      return (
        <MusicPlayer
          itemId={item.id}
          config={widgetConfig as any}
          isOwner={isOwner}
          onConfigUpdate={handleConfigUpdate}
        />
      );

    case 'pixel-canvas':
      return (
        <PixelCanvas
          itemId={item.id}
          config={widgetConfig as any}
          isOwner={isOwner}
          onConfigUpdate={handleConfigUpdate}
        />
      );

    case 'link-board':
      return (
        <LinkBoard
          itemId={item.id}
          config={widgetConfig as any}
          isOwner={isOwner}
          onConfigUpdate={handleConfigUpdate}
        />
      );

    default:
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '20px',
            fontFamily: 'var(--font-geneva)',
            fontSize: '11px',
            color: 'var(--shadow)',
          }}
        >
          Widget type "{widgetType}" not supported
        </div>
      );
  }
}
