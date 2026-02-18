/**
 * StickyNote Widget - A colored sticky note with editable text
 *
 * Features:
 * - 6 pastel color options (yellow, pink, blue, green, purple, orange)
 * - Editable text for owners, read-only for visitors
 * - Auto-saves on blur
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { StickyNoteConfig } from '../../types';
import { useDesktopStore } from '../../stores/desktopStore';
import styles from './StickyNote.module.css';

// Pastel colors for sticky notes
export const STICKY_NOTE_COLORS = [
  { name: 'Yellow', value: '#FFFACD' },
  { name: 'Pink', value: '#FFD1DC' },
  { name: 'Blue', value: '#BFEFFF' },
  { name: 'Green', value: '#BDFCC9' },
  { name: 'Purple', value: '#E6E6FA' },
  { name: 'Orange', value: '#FFDAB9' },
] as const;

interface StickyNoteProps {
  itemId: string;
  config?: StickyNoteConfig;
  isOwner: boolean;
  onConfigUpdate?: (config: StickyNoteConfig) => void;
}

export function StickyNote({ itemId, config, isOwner, onConfigUpdate }: StickyNoteProps) {
  const updateItem = useDesktopStore((state) => state.updateItem);

  // Default config
  const currentConfig: StickyNoteConfig = {
    color: config?.color || STICKY_NOTE_COLORS[0].value,
    text: config?.text || '',
  };

  const [text, setText] = useState(currentConfig.text);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when config changes externally
  useEffect(() => {
    if (config?.text !== undefined && config.text !== text) {
      setText(config.text);
    }
  }, [config?.text]);

  const saveConfig = useCallback(
    (newConfig: Partial<StickyNoteConfig>) => {
      const updatedConfig: StickyNoteConfig = {
        ...currentConfig,
        ...newConfig,
      };
      updateItem(itemId, { widgetConfig: updatedConfig });
      onConfigUpdate?.(updatedConfig);
    },
    [itemId, currentConfig, updateItem, onConfigUpdate]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
    },
    []
  );

  const handleTextBlur = useCallback(() => {
    if (text !== currentConfig.text) {
      saveConfig({ text });
    }
  }, [text, currentConfig.text, saveConfig]);

  const handleColorChange = useCallback(
    (color: string) => {
      saveConfig({ color });
      setShowColorPicker(false);
    },
    [saveConfig]
  );

  return (
    <div
      className={styles.stickyNote}
      style={{ backgroundColor: currentConfig.color }}
    >
      {/* Color picker button (owner only) */}
      {isOwner && (
        <div className={styles.toolbar}>
          <button
            className={styles.colorButton}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Change color"
          >
            <div
              className={styles.colorSwatch}
              style={{ backgroundColor: currentConfig.color }}
            />
          </button>
          {showColorPicker && (
            <div className={styles.colorPicker}>
              {STICKY_NOTE_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`${styles.colorOption} ${
                    currentConfig.color === color.value ? styles.selected : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorChange(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Text content */}
      {isOwner ? (
        <textarea
          ref={textareaRef}
          className={styles.textArea}
          value={text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder="Click to add a note..."
          spellCheck={false}
        />
      ) : (
        <div className={styles.textDisplay}>
          {currentConfig.text || (
            <span className={styles.placeholder}>No note content</span>
          )}
        </div>
      )}
    </div>
  );
}
