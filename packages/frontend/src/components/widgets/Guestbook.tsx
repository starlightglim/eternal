/**
 * Guestbook Widget - Append-only visitor messages
 *
 * Features:
 * - THE ONLY visitor interaction in EternalOS
 * - Visitors can leave name + message
 * - Rate limited: 1 entry per visitor per hour
 * - Owner sees all entries with timestamps
 */

import { useState, useCallback, useEffect } from 'react';
import type { GuestbookConfig } from '../../types';
import { useDesktopStore } from '../../stores/desktopStore';
import { postGuestbookEntry } from '../../services/api';
import styles from './Guestbook.module.css';

interface GuestbookProps {
  itemId: string;
  ownerUid: string;
  config?: GuestbookConfig;
  isOwner: boolean;
  onConfigUpdate?: (config: GuestbookConfig) => void;
}

export function Guestbook({ itemId, ownerUid, config, isOwner, onConfigUpdate }: GuestbookProps) {
  const updateItem = useDesktopStore((state) => state.updateItem);

  // Use local state for entries so visitor submissions show immediately
  const [localEntries, setLocalEntries] = useState(config?.entries || []);

  // Sync local state when config changes (e.g., owner clears guestbook)
  useEffect(() => {
    setLocalEntries(config?.entries || []);
  }, [config?.entries]);

  const entries = localEntries;

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      if (!name.trim() || !message.trim()) {
        setError('Please enter both name and message');
        return;
      }

      if (name.length > 50) {
        setError('Name must be 50 characters or less');
        return;
      }

      if (message.length > 500) {
        setError('Message must be 500 characters or less');
        return;
      }

      setIsSubmitting(true);

      try {
        // Post to guestbook API endpoint
        const result = await postGuestbookEntry(ownerUid, itemId, {
          name: name.trim(),
          message: message.trim(),
        });

        if (result.success) {
          setName('');
          setMessage('');
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);

          // If we got the updated entries back, update local state
          if (result.entries) {
            setLocalEntries(result.entries);
            const newConfig: GuestbookConfig = { entries: result.entries };
            onConfigUpdate?.(newConfig);
          }
        } else {
          setError(result.error || 'Failed to submit entry');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to submit entry');
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, message, ownerUid, itemId, onConfigUpdate]
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const clearGuestbook = useCallback(() => {
    if (confirm('Are you sure you want to clear all guestbook entries? This cannot be undone.')) {
      updateItem(itemId, { widgetConfig: { entries: [] } });
      onConfigUpdate?.({ entries: [] });
    }
  }, [itemId, updateItem, onConfigUpdate]);

  return (
    <div className={styles.guestbook}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Guestbook</span>
        <span className={styles.count}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      {/* Entries list */}
      <div className={styles.entries}>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            No entries yet. Be the first to sign!
          </div>
        ) : (
          entries
            .slice()
            .reverse()
            .map((entry, index) => (
              <div key={`${entry.timestamp}-${index}`} className={styles.entry}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryName}>{entry.name}</span>
                  <span className={styles.entryDate}>{formatDate(entry.timestamp)}</span>
                </div>
                <div className={styles.entryMessage}>{entry.message}</div>
              </div>
            ))
        )}
      </div>

      {/* Sign form (for visitors) or clear button (for owner) */}
      {isOwner ? (
        <div className={styles.ownerControls}>
          {entries.length > 0 && (
            <button className={styles.clearButton} onClick={clearGuestbook}>
              Clear All Entries
            </button>
          )}
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label className={styles.label}>Name:</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Message:</label>
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message..."
              maxLength={500}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>Thanks for signing!</div>}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || !name.trim() || !message.trim()}
          >
            {isSubmitting ? 'Signing...' : 'Sign Guestbook'}
          </button>
        </form>
      )}
    </div>
  );
}
