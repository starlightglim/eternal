/**
 * PixelCanvas Widget - 16x16 pixel art editor
 *
 * Features:
 * - 16×16 grid for drawing
 * - 8-color palette
 * - Owner can draw, visitors see read-only
 * - Classic Mac bitmap editor aesthetic
 * - Debounced save to prevent API flooding during drawing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PixelCanvasConfig } from '../../types';
import { useDesktopStore } from '../../stores/desktopStore';
import styles from './PixelCanvas.module.css';

const GRID_SIZE = 16;

// Debounce delay for saving pixel changes (ms)
const SAVE_DEBOUNCE_MS = 300;

// Default 8-color palette (classic Mac style)
const DEFAULT_PALETTE = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#0000FF', // Blue
  '#00FF00', // Green
  '#FFFF00', // Yellow
  '#800080', // Purple
  '#FFA500', // Orange
];

// Create empty grid
function createEmptyGrid(): number[][] {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(1)); // Default to white (index 1)
}

interface PixelCanvasProps {
  itemId: string;
  config?: PixelCanvasConfig;
  isOwner: boolean;
  onConfigUpdate?: (config: PixelCanvasConfig) => void;
}

export function PixelCanvas({ itemId, config, isOwner, onConfigUpdate }: PixelCanvasProps) {
  const updateItem = useDesktopStore((state) => state.updateItem);

  // Use local state for the grid to enable instant rendering during drawing
  const [localGrid, setLocalGrid] = useState<number[][]>(config?.grid || createEmptyGrid());
  const palette = config?.palette || DEFAULT_PALETTE;

  const [selectedColor, setSelectedColor] = useState(0); // Index into palette
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local grid when config changes externally
  useEffect(() => {
    if (config?.grid) {
      setLocalGrid(config.grid);
    }
  }, [config?.grid]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Debounced save — only syncs to API after drawing pauses
  const debouncedSave = useCallback(
    (newGrid: number[][]) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        const newConfig: PixelCanvasConfig = { grid: newGrid, palette };
        updateItem(itemId, { widgetConfig: newConfig });
        onConfigUpdate?.(newConfig);
        saveTimerRef.current = null;
      }, SAVE_DEBOUNCE_MS);
    },
    [itemId, palette, updateItem, onConfigUpdate]
  );

  const setPixel = useCallback(
    (row: number, col: number) => {
      if (!isOwner) return;
      if (localGrid[row][col] === selectedColor) return;

      const newGrid = localGrid.map((r, ri) =>
        ri === row ? r.map((c, ci) => (ci === col ? selectedColor : c)) : r
      );
      // Update local state instantly for responsive drawing
      setLocalGrid(newGrid);
      // Debounce the API sync
      debouncedSave(newGrid);
    },
    [localGrid, selectedColor, isOwner, debouncedSave]
  );

  const handlePointerDown = useCallback(
    (row: number, col: number) => {
      if (!isOwner) return;
      setIsDrawing(true);
      setPixel(row, col);
    },
    [isOwner, setPixel]
  );

  const handlePointerEnter = useCallback(
    (row: number, col: number) => {
      if (!isOwner || !isDrawing) return;
      setPixel(row, col);
    },
    [isOwner, isDrawing, setPixel]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const emptyGrid = createEmptyGrid();
    setLocalGrid(emptyGrid);
    // Save immediately for clear/fill (intentional user action)
    const newConfig: PixelCanvasConfig = { grid: emptyGrid, palette };
    updateItem(itemId, { widgetConfig: newConfig });
    onConfigUpdate?.(newConfig);
  }, [itemId, palette, updateItem, onConfigUpdate]);

  const fillCanvas = useCallback(() => {
    const filledGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(selectedColor));
    setLocalGrid(filledGrid);
    // Save immediately for clear/fill (intentional user action)
    const newConfig: PixelCanvasConfig = { grid: filledGrid, palette };
    updateItem(itemId, { widgetConfig: newConfig });
    onConfigUpdate?.(newConfig);
  }, [selectedColor, itemId, palette, updateItem, onConfigUpdate]);

  return (
    <div
      className={styles.pixelCanvas}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Toolbar (owner only) */}
      {isOwner && (
        <div className={styles.toolbar}>
          <div className={styles.palette}>
            {palette.map((color, index) => (
              <button
                key={index}
                className={`${styles.paletteColor} ${
                  selectedColor === index ? styles.selected : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(index)}
                title={`Color ${index + 1}`}
              />
            ))}
          </div>
          <div className={styles.tools}>
            <button className={styles.toolButton} onClick={clearCanvas} title="Clear">
              Clear
            </button>
            <button className={styles.toolButton} onClick={fillCanvas} title="Fill">
              Fill
            </button>
          </div>
        </div>
      )}

      {/* Canvas grid */}
      <div
        ref={canvasRef}
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          cursor: isOwner ? 'crosshair' : 'default',
        }}
      >
        {localGrid.map((row, rowIndex) =>
          row.map((colorIndex, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={styles.pixel}
              style={{ backgroundColor: palette[colorIndex] || '#FFFFFF' }}
              onPointerDown={() => handlePointerDown(rowIndex, colIndex)}
              onPointerEnter={() => handlePointerEnter(rowIndex, colIndex)}
            />
          ))
        )}
      </div>
    </div>
  );
}
