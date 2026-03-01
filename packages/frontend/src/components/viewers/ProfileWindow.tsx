/**
 * ProfileWindow - User profile viewer/editor
 *
 * Mac OS 8 "Get Info" style layout showing:
 * - Display name and username
 * - Bio (editable textarea in owner mode)
 * - Links (add/remove in owner mode)
 * - Member since and item count stats
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDesktopStore } from '../../stores/desktopStore';
import type { ProfileLink } from '../../types';
import styles from './ProfileWindow.module.css';

interface ProfileWindowProps {
  isOwner?: boolean;
  /** For visitor mode: pass the profile data directly */
  visitorProfile?: {
    displayName?: string;
    username: string;
    bio?: string;
    profileLinks?: ProfileLink[];
    createdAt: number;
  };
}

export function ProfileWindow({ isOwner = true, visitorProfile }: ProfileWindowProps) {
  const { profile, setBio, setProfileLinks } = useAuthStore();
  const items = useDesktopStore((s) => s.items);

  // Use visitor profile if provided, otherwise owner's profile
  const displayProfile = visitorProfile || profile;
  const username = displayProfile?.username || '';
  const displayName = displayProfile?.displayName || username;

  // Editable state
  const [bio, setBioLocal] = useState(displayProfile?.bio || '');
  const [links, setLinksLocal] = useState<ProfileLink[]>(displayProfile?.profileLinks || []);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when profile changes externally
  useEffect(() => {
    if (displayProfile) {
      setBioLocal(displayProfile.bio || '');
      setLinksLocal(displayProfile.profileLinks || []);
    }
  }, [displayProfile]);

  const handleSave = useCallback(() => {
    if (!isOwner) return;
    setBio(bio);
    setProfileLinks(links);
    setSaved(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => setSaved(false), 2000);
  }, [isOwner, bio, links, setBio, setProfileLinks]);

  const handleAddLink = useCallback(() => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    if (links.length >= 5) return;

    let url = newLinkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const newLinks = [...links, { title: newLinkTitle.trim(), url }];
    setLinksLocal(newLinks);
    setNewLinkTitle('');
    setNewLinkUrl('');
  }, [links, newLinkTitle, newLinkUrl]);

  const handleRemoveLink = useCallback((index: number) => {
    setLinksLocal((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Stats
  const rootItemCount = items.filter((i) => i.parentId === null && !i.isTrashed).length;
  const memberSince = displayProfile?.createdAt
    ? new Date(displayProfile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Unknown';

  return (
    <div className={styles.container}>
      {/* Identity Section */}
      <div className={styles.section}>
        <div className={styles.displayName}>{displayName}</div>
        <div className={styles.username}>@{username}</div>
      </div>

      {/* Bio Section */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Bio</div>
        {isOwner ? (
          <>
            <textarea
              className={styles.bioArea}
              value={bio}
              onChange={(e) => setBioLocal(e.target.value.slice(0, 500))}
              placeholder="Tell visitors about yourself..."
              maxLength={500}
            />
            <div className={styles.charCount}>{bio.length}/500</div>
          </>
        ) : bio ? (
          <div className={styles.bioText}>{bio}</div>
        ) : (
          <div className={styles.bioEmpty}>No bio yet.</div>
        )}
      </div>

      {/* Links Section */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Links</div>
        {links.length > 0 ? (
          <div className={styles.linkList}>
            {links.map((link, i) => (
              <div key={i} className={styles.linkItem}>
                <span className={styles.linkTitle}>{link.title}</span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkUrl}
                >
                  {link.url}
                </a>
                {isOwner && (
                  <button
                    className={styles.linkRemoveBtn}
                    onClick={() => handleRemoveLink(i)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noLinks}>No links added.</div>
        )}

        {/* Add link form (owner only) */}
        {isOwner && links.length < 5 && (
          <div className={styles.addLinkForm}>
            <input
              className={styles.addLinkInput}
              placeholder="Title"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            />
            <input
              className={styles.addLinkInput}
              placeholder="URL"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            />
            <button className={styles.addLinkBtn} onClick={handleAddLink}>
              Add
            </button>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Info</div>
        <div className={styles.stats}>
          <span>Member since {memberSince}</span>
          <span>{rootItemCount} item{rootItemCount !== 1 ? 's' : ''} on desktop</span>
        </div>
      </div>

      {/* Save Button (owner only) */}
      {isOwner && (
        <div className={styles.saveRow}>
          {saved && <span className={styles.savedMessage}>Saved!</span>}
          <button className={styles.saveBtn} onClick={handleSave}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}
