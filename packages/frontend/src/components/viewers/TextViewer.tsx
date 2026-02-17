import { useState, useEffect, useRef, useCallback } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { isApiConfigured } from '../../services/api';
import styles from './TextViewer.module.css';

interface TextViewerProps {
  itemId: string;
  name: string;
  textContent?: string;
  isOwner?: boolean; // Whether current user owns this file
}

/**
 * TextViewer - SimpleText clone
 * Features:
 * - Monaco font, white background, black text
 * - Editable for owner, read-only for visitor
 * - Auto-save on blur or Cmd+S
 * - Classic Mac scrollable text area
 */
export function TextViewer({
  itemId,
  name,
  textContent: initialContent = '',
  isOwner = true,
}: TextViewerProps) {
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { updateItem } = useDesktopStore();

  // Update content when prop changes
  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
  }, [initialContent]);

  // Save handler
  const saveContent = useCallback(async () => {
    if (!isDirty || !isOwner) return;

    setIsSaving(true);
    try {
      // Update the desktop item with new content
      updateItem(itemId, { textContent: content });
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [content, isDirty, isOwner, itemId, updateItem]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S or Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveContent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveContent]);

  // Handle content change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isOwner) return;
    setContent(e.target.value);
    setIsDirty(true);
  };

  // Auto-save on blur
  const handleBlur = () => {
    if (isDirty) {
      saveContent();
    }
  };

  return (
    <div className={styles.textViewer}>
      {/* Title bar with file info */}
      <div className={styles.toolbar}>
        <span className={styles.fileName}>{name}</span>
        {isDirty && <span className={styles.unsaved}>•</span>}
        {isSaving && <span className={styles.saving}>Saving...</span>}
        {!isOwner && <span className={styles.readOnly}>Read Only</span>}
      </div>

      {/* Text content area */}
      <div className={styles.content}>
        {isOwner ? (
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={content}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter text..."
            spellCheck={false}
          />
        ) : (
          <div className={styles.readOnlyText}>
            {content || (
              <span className={styles.emptyText}>
                {isApiConfigured
                  ? 'No content'
                  : 'Demo mode: This is sample text content.'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span className={styles.charCount}>
          {content.length} characters
        </span>
        <span className={styles.lineCount}>
          {content.split('\n').length} lines
        </span>
      </div>
    </div>
  );
}
