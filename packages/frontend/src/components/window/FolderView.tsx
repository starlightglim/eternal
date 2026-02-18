import { useCallback, useState, useRef, useEffect } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { useWindowStore } from '../../stores/windowStore';
import { FolderIcon, ImageFileIcon, TextFileIcon, LinkIcon, AudioFileIcon, VideoFileIcon, PDFFileIcon } from '../icons/PixelIcons';
import { getTextFileContentType, type DesktopItem } from '../../types';
import styles from './FolderView.module.css';

// Counter for staggering window positions
let windowOffsetCounter = 0;

// Custom events for cross-component drag communication
export const FOLDER_DRAG_START = 'folder-drag-start';
export const FOLDER_DRAG_MOVE = 'folder-drag-move';
export const FOLDER_DRAG_END = 'folder-drag-end';

export interface FolderDragEvent {
  itemId: string;
  sourceFolderId: string | null;
  clientX: number;
  clientY: number;
}

interface FolderViewProps {
  folderId: string | null;
  visitorItems?: DesktopItem[];
  isVisitorMode?: boolean;
  isDropTarget?: boolean; // True when a desktop item is being dragged over this folder window
}

/**
 * FolderView - Shows contents of a folder in a window
 * Classic Mac OS folder view with icon grid
 * Supports drag-and-drop for moving items between folders
 */
export function FolderView({ folderId, visitorItems, isVisitorMode = false, isDropTarget = false }: FolderViewProps) {
  const getItemsByParent = useDesktopStore((state) => state.getItemsByParent);
  const updateItem = useDesktopStore((state) => state.updateItem);
  const getNextAvailablePositionsInFolder = useDesktopStore((state) => state.getNextAvailablePositionsInFolder);
  const openWindow = useWindowStore((state) => state.openWindow);

  // Selection and drag state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasDragged = useRef(false);
  // Track the element and pointer ID that captured the pointer
  const capturedElementRef = useRef<HTMLElement | null>(null);
  const capturedPointerIdRef = useRef<number | null>(null);

  // If visitorItems is provided, filter from those; otherwise use the store
  // Always filter out trashed items
  const items = (visitorItems
    ? visitorItems.filter((item) => item.parentId === folderId)
    : getItemsByParent(folderId)
  ).filter((item) => !item.isTrashed);

  // Handle double-click to open item
  const handleDoubleClick = useCallback(
    (itemId: string, itemType: string, itemName: string) => {
      // Determine content type based on item type and file extension
      let contentType: string = itemType === 'folder' ? 'folder' : itemType;
      if (itemType === 'text') {
        contentType = getTextFileContentType(itemName);
      }
      // Set appropriate window size based on media type
      let windowSize = { width: 400, height: 300 };
      if (itemType === 'audio') {
        windowSize = { width: 320, height: 240 };
      } else if (itemType === 'video') {
        windowSize = { width: 480, height: 360 };
      } else if (itemType === 'pdf') {
        windowSize = { width: 550, height: 700 };
      }
      // Stagger window positions using a counter instead of Math.random
      windowOffsetCounter = (windowOffsetCounter + 1) % 10;
      const offset = windowOffsetCounter * 20;
      openWindow({
        id: `window-${itemId}`,
        title: itemName,
        position: { x: 100 + offset, y: 50 + offset },
        size: windowSize,
        minimized: false,
        maximized: false,
        contentType: contentType as 'folder' | 'image' | 'text' | 'markdown' | 'code' | 'get-info' | 'about' | 'audio' | 'video' | 'pdf',
        contentId: itemId,
      });
    },
    [openWindow]
  );

  // Handle link double-click
  const handleLinkClick = (url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle pointer down on item (start potential drag)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, itemId: string) => {
      if (isVisitorMode) return;

      e.stopPropagation();
      setSelectedId(itemId);
      setDraggingId(itemId);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      hasDragged.current = false;

      // Dispatch drag start event for Desktop to track
      window.dispatchEvent(
        new CustomEvent<FolderDragEvent>(FOLDER_DRAG_START, {
          detail: {
            itemId,
            sourceFolderId: folderId,
            clientX: e.clientX,
            clientY: e.clientY,
          },
        })
      );

      // Capture on currentTarget (the item div) rather than target (could be child)
      const element = e.currentTarget as HTMLElement;
      element.setPointerCapture(e.pointerId);
      capturedElementRef.current = element;
      capturedPointerIdRef.current = e.pointerId;
    },
    [isVisitorMode, folderId]
  );

  // Handle pointer move during drag
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !dragStartPos.current) return;

      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);

      // Only consider it a drag if moved more than 5 pixels
      if (dx > 5 || dy > 5) {
        hasDragged.current = true;

        // Dispatch drag move event for Desktop to track (for cross-window drops)
        window.dispatchEvent(
          new CustomEvent<FolderDragEvent>(FOLDER_DRAG_MOVE, {
            detail: {
              itemId: draggingId,
              sourceFolderId: folderId,
              clientX: e.clientX,
              clientY: e.clientY,
            },
          })
        );
      }

      // Find if we're over a folder (drop target detection within this folder view)
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let newDropTarget: string | null = null;

      for (const el of elements) {
        const folderEl = (el as HTMLElement).closest('[data-folder-id]');
        if (folderEl) {
          const targetFolderId = folderEl.getAttribute('data-folder-id');
          // Don't allow dropping on itself
          if (targetFolderId && targetFolderId !== draggingId) {
            newDropTarget = targetFolderId;
            break;
          }
        }
      }

      setFolderDropTargetId(newDropTarget);
    },
    [draggingId, folderId]
  );

  // Helper to release pointer capture safely
  const releasePointerCapture = useCallback(() => {
    if (capturedElementRef.current && capturedPointerIdRef.current !== null) {
      try {
        capturedElementRef.current.releasePointerCapture(capturedPointerIdRef.current);
      } catch {
        // Ignore - pointer may already be released
      }
      capturedElementRef.current = null;
      capturedPointerIdRef.current = null;
    }
  }, []);

  // Handle pointer up (end drag)
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Dispatch drag end event for Desktop to potentially handle the drop
      // The event contains drop coordinates so Desktop can determine if it's a valid drop target
      const dragEndEvent = new CustomEvent<FolderDragEvent>(FOLDER_DRAG_END, {
        detail: {
          itemId: draggingId || '',
          sourceFolderId: folderId,
          clientX: e.clientX,
          clientY: e.clientY,
        },
      });
      window.dispatchEvent(dragEndEvent);

      // If we dropped on a folder within this folder view, handle it here
      if (draggingId && hasDragged.current && folderDropTargetId) {
        // Get the next available position in the target folder
        const positions = getNextAvailablePositionsInFolder(folderDropTargetId, 1, [draggingId]);
        // Move item to the target folder at the available position
        updateItem(draggingId, {
          parentId: folderDropTargetId,
          position: positions[0],
        });
      }

      releasePointerCapture();
      setDraggingId(null);
      setFolderDropTargetId(null);
      dragStartPos.current = null;
      hasDragged.current = false;
    },
    [draggingId, folderDropTargetId, updateItem, getNextAvailablePositionsInFolder, folderId, releasePointerCapture]
  );

  // Handle pointer cancel (when browser/OS interrupts the drag)
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      // Dispatch drag end event to clean up Desktop state
      window.dispatchEvent(
        new CustomEvent<FolderDragEvent>(FOLDER_DRAG_END, {
          detail: {
            itemId: draggingId || '',
            sourceFolderId: folderId,
            clientX: e.clientX,
            clientY: e.clientY,
          },
        })
      );

      releasePointerCapture();
      setDraggingId(null);
      setFolderDropTargetId(null);
      dragStartPos.current = null;
      hasDragged.current = false;
    },
    [draggingId, folderId, releasePointerCapture]
  );

  // Clean up pointer capture on unmount
  useEffect(() => {
    return () => {
      releasePointerCapture();
    };
  }, [releasePointerCapture]);

  // Clear selection when clicking empty area
  const handleBackgroundClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Get icon for item type
  const getIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return <FolderIcon size={32} />;
      case 'image':
        return <ImageFileIcon size={32} />;
      case 'text':
        return <TextFileIcon size={32} />;
      case 'link':
        return <LinkIcon size={32} />;
      case 'audio':
        return <AudioFileIcon size={32} />;
      case 'video':
        return <VideoFileIcon size={32} />;
      case 'pdf':
        return <PDFFileIcon size={32} />;
      default:
        return <TextFileIcon size={32} />;
    }
  };

  if (items.length === 0) {
    return (
      <div
        className={`${styles.emptyFolder} ${isDropTarget ? styles.windowDropTarget : ''}`}
        data-folder-window-id={folderId}
      >
        <p>This folder is empty</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.folderView} ${isDropTarget ? styles.windowDropTarget : ''}`}
      data-folder-window-id={folderId}
      onClick={handleBackgroundClick}
      onPointerMove={draggingId ? handlePointerMove : undefined}
      onPointerUp={draggingId ? handlePointerUp : undefined}
      onPointerCancel={draggingId ? handlePointerCancel : undefined}
    >
      <div className={styles.itemGrid}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`${styles.item} ${selectedId === item.id ? styles.selected : ''} ${
              draggingId === item.id ? styles.dragging : ''
            } ${item.type === 'folder' && folderDropTargetId === item.id ? styles.dropTarget : ''}`}
            data-folder-id={item.type === 'folder' ? item.id : undefined}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(item.id);
            }}
            onDoubleClick={() => {
              if (item.type === 'link') {
                handleLinkClick(item.url);
              } else {
                handleDoubleClick(item.id, item.type, item.name);
              }
            }}
            onPointerDown={(e) => handlePointerDown(e, item.id)}
          >
            <div className={styles.itemIcon}>{getIcon(item.type)}</div>
            <span className={styles.itemName}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
