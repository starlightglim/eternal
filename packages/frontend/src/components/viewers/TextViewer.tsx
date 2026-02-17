import { useState, useEffect, useRef, useCallback } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { useWindowStore } from '../../stores/windowStore';
import { isApiConfigured } from '../../services/api';
import styles from './TextViewer.module.css';

interface TextViewerProps {
  itemId: string;
  windowId: string;
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
  windowId,
  name,
  textContent: initialContent = '',
  isOwner = true,
}: TextViewerProps) {
  const [content, setContent] = useState(initialContent);
  const [fileName, setFileName] = useState(name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { updateItem } = useDesktopStore();
  const { updateWindowTitle } = useWindowStore();

  // Update content when prop changes
  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
  }, [initialContent]);

  // Update filename when prop changes
  useEffect(() => {
    setFileName(name);
  }, [name]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Handle filename rename
  const handleRename = useCallback(() => {
    if (!isOwner || !fileName.trim()) {
      setFileName(name);
      setIsEditingName(false);
      return;
    }

    const newName = fileName.trim();
    if (newName !== name) {
      updateItem(itemId, { name: newName });
      updateWindowTitle(windowId, newName);
    }
    setIsEditingName(false);
  }, [fileName, name, isOwner, itemId, windowId, updateItem, updateWindowTitle]);

  // Handle name input key events
  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setFileName(name);
        setIsEditingName(false);
      }
    },
    [handleRename, name]
  );

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

  // Download the text file
  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }, [content, fileName]);

  return (
    <div className={styles.textViewer}>
      {/* Title bar with file info */}
      <div className={styles.toolbar}>
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            className={styles.fileNameInput}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleNameKeyDown}
          />
        ) : (
          <span
            className={`${styles.fileName} ${isOwner ? styles.fileNameEditable : ''}`}
            onClick={isOwner ? () => setIsEditingName(true) : undefined}
            title={isOwner ? 'Click to rename' : undefined}
          >
            {fileName}
          </span>
        )}
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
        <div className={styles.statusLeft}>
          <span className={styles.charCount}>
            {content.length} characters
          </span>
          <span className={styles.lineCount}>
            {content.split('\n').length} lines
          </span>
        </div>
        <button
          className={styles.downloadButton}
          onClick={handleDownload}
          title="Download"
        >
          Download
        </button>
      </div>
    </div>
  );
}
