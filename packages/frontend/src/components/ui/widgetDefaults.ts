import type { WidgetType } from '../../types';

const WIDGET_DEFAULT_SIZES: Record<WidgetType, { width: number; height: number }> = {
  'sticky-note': { width: 200, height: 200 },
  guestbook: { width: 280, height: 350 },
  'music-player': { width: 250, height: 300 },
  'pixel-canvas': { width: 280, height: 320 },
  'link-board': { width: 280, height: 250 },
};

export function getWidgetDefaultSize(widgetType: WidgetType): { width: number; height: number } {
  return WIDGET_DEFAULT_SIZES[widgetType] || { width: 250, height: 250 };
}
