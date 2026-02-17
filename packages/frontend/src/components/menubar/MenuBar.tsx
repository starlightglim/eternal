import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWindowStore } from '../../stores/windowStore';
import { useDesktopStore } from '../../stores/desktopStore';
import { useAuthStore } from '../../stores/authStore';
import { isApiConfigured } from '../../services/api';
import type { MenuItem } from '../../types';
import styles from './MenuBar.module.css';

/**
 * Classic Mac OS-style Menu Bar
 * Features:
 * - Fixed top position, 20px tall, white background
 * - Apple icon + File, Edit, View, Special menus
 * - Click to open dropdown, hover to switch between menus
 * - Inverted colors on hover (black bg, white text)
 * - Keyboard shortcuts display
 */
export function MenuBar() {
  const { windows, closeWindow, getTopWindow, openWindow } = useWindowStore();
  const { selectedIds, addItem, items, deselectAll, removeItem } = useDesktopStore();
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const menuBarRef = useRef<HTMLDivElement>(null);

  // ============================================
  // MENU ACTIONS (defined before useEffect)
  // ============================================

  const handleNewFolder = useCallback(() => {
    // Find next available position
    const rootItems = items.filter((item) => item.parentId === null);
    let maxY = -1;
    rootItems.forEach((item) => {
      if (item.position.x === 0 && item.position.y > maxY) {
        maxY = item.position.y;
      }
    });

    const newFolder = {
      id: `folder-${Date.now()}`,
      type: 'folder' as const,
      name: 'Untitled Folder',
      parentId: null,
      position: { x: 0, y: maxY + 1 },
      isPublic: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addItem(newFolder);
    setActiveMenu(null);
  }, [items, addItem]);

  const handleCloseWindow = useCallback(() => {
    const topWindow = getTopWindow();
    if (topWindow) {
      closeWindow(topWindow.id);
    }
    setActiveMenu(null);
  }, [getTopWindow, closeWindow]);

  const handleTrashSelected = useCallback(() => {
    // Delete selected items
    selectedIds.forEach((id) => {
      removeItem(id);
    });
    deselectAll();
    setActiveMenu(null);
  }, [selectedIds, deselectAll, removeItem]);

  const handleEmptyTrash = useCallback(() => {
    // In Phase 3, trash is just immediate deletion
    // Phase 4+ will have a proper trash folder
    setActiveMenu(null);
  }, []);

  const handleAbout = useCallback(() => {
    openWindow({
      id: 'about-eternalos',
      title: 'About EternalOS',
      position: { x: 150, y: 100 },
      size: { width: 300, height: 200 },
      minimized: false,
      maximized: false,
      contentType: 'about',
    });
    setActiveMenu(null);
  }, [openWindow]);

  const handlePreviewAsVisitor = useCallback(() => {
    if (profile?.username) {
      // Open visitor view in new tab
      window.open(`/@${profile.username}`, '_blank');
    }
    setActiveMenu(null);
  }, [profile]);

  const handleOpenAssistant = useCallback(() => {
    openWindow({
      id: 'desk-assistant',
      title: 'Desk Assistant',
      position: { x: 100, y: 80 },
      size: { width: 500, height: 400 },
      minimized: false,
      maximized: false,
      contentType: 'assistant',
    });
    setActiveMenu(null);
  }, [openWindow]);

  const handleOpenWallpaperPicker = useCallback(() => {
    openWindow({
      id: 'wallpaper-picker',
      title: 'Desktop Patterns',
      position: { x: 150, y: 100 },
      size: { width: 320, height: 400 },
      minimized: false,
      maximized: false,
      contentType: 'wallpaper',
    });
    setActiveMenu(null);
  }, [openWindow]);

  const handleLogout = useCallback(async () => {
    setActiveMenu(null);
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  // ============================================
  // EFFECTS
  // ============================================

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === 'n') {
        e.preventDefault();
        handleNewFolder();
      } else if (isMeta && e.key === 'w') {
        e.preventDefault();
        handleCloseWindow();
      } else if (isMeta && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        handleTrashSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNewFolder, handleCloseWindow, handleTrashSelected]);

  // ============================================
  // OTHER HANDLERS
  // ============================================

  // Menu click handler - toggle or switch menus
  const handleMenuClick = useCallback((menuName: string) => {
    setActiveMenu((current) => (current === menuName ? null : menuName));
  }, []);

  // Menu hover - switch to hovered menu if another is already open
  const handleMenuHover = useCallback((menuName: string) => {
    if (activeMenu && activeMenu !== menuName) {
      setActiveMenu(menuName);
    }
  }, [activeMenu]);

  const handleDropdownItemClick = useCallback((item: MenuItem) => {
    if (item.disabled || item.divider) return;
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  }, []);

  // ============================================
  // MENU DEFINITIONS
  // ============================================

  const menus: Record<string, MenuItem[]> = {
    apple: [
      { label: 'About EternalOS...', action: handleAbout },
      { divider: true, label: '' },
      { label: 'Preferences...', disabled: true },
    ],
    file: [
      { label: 'New Folder', shortcut: '⌘N', action: handleNewFolder },
      { divider: true, label: '' },
      { label: 'Open', shortcut: '⌘O', disabled: true },
      { label: 'Close Window', shortcut: '⌘W', action: handleCloseWindow, disabled: windows.length === 0 },
      { divider: true, label: '' },
      { label: 'Get Info', shortcut: '⌘I', disabled: selectedIds.size === 0 },
    ],
    edit: [
      { label: 'Undo', shortcut: '⌘Z', disabled: true },
      { divider: true, label: '' },
      { label: 'Cut', shortcut: '⌘X', disabled: true },
      { label: 'Copy', shortcut: '⌘C', disabled: true },
      { label: 'Paste', shortcut: '⌘V', disabled: true },
      { label: 'Clear', disabled: true },
      { divider: true, label: '' },
      { label: 'Select All', shortcut: '⌘A', disabled: true },
    ],
    view: [
      { label: 'By Icon', action: () => setActiveMenu(null) },
      { label: 'By Name', action: () => setActiveMenu(null) },
      { label: 'By Date', action: () => setActiveMenu(null) },
      { divider: true, label: '' },
      { label: 'Clean Up', disabled: true },
    ],
    special: [
      { label: 'Desk Assistant', action: handleOpenAssistant },
      { label: 'Desktop Patterns...', action: handleOpenWallpaperPicker },
      { divider: true, label: '' },
      { label: 'Empty Trash...', action: handleEmptyTrash },
      { divider: true, label: '' },
      { label: 'Preview as Visitor', action: handlePreviewAsVisitor, disabled: !profile?.username },
      { divider: true, label: '' },
      { label: 'Eject', disabled: true },
      { label: 'Restart', disabled: true },
      { label: 'Shut Down', disabled: true },
      { divider: true, label: '' },
      { label: 'Log Out', action: handleLogout, disabled: !isApiConfigured },
    ],
  };

  // Format time for display (12-hour format)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render a dropdown menu
  const renderDropdown = (menuItems: MenuItem[]) => (
    <div className={styles.dropdown}>
      {menuItems.map((item, index) =>
        item.divider ? (
          <div key={index} className={styles.divider} />
        ) : (
          <div
            key={index}
            className={`${styles.dropdownItem} ${item.disabled ? styles.disabled : ''}`}
            onClick={() => handleDropdownItemClick(item)}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
          </div>
        )
      )}
    </div>
  );

  return (
    <div className={styles.menuBar} ref={menuBarRef}>
      {/* Apple Menu */}
      <div
        className={`${styles.menuItem} ${styles.appleMenu} ${activeMenu === 'apple' ? styles.active : ''}`}
        onClick={() => handleMenuClick('apple')}
        onMouseEnter={() => handleMenuHover('apple')}
      >
        <AppleIcon />
        {activeMenu === 'apple' && renderDropdown(menus.apple)}
      </div>

      {/* File Menu */}
      <div
        className={`${styles.menuItem} ${activeMenu === 'file' ? styles.active : ''}`}
        onClick={() => handleMenuClick('file')}
        onMouseEnter={() => handleMenuHover('file')}
      >
        File
        {activeMenu === 'file' && renderDropdown(menus.file)}
      </div>

      {/* Edit Menu */}
      <div
        className={`${styles.menuItem} ${activeMenu === 'edit' ? styles.active : ''}`}
        onClick={() => handleMenuClick('edit')}
        onMouseEnter={() => handleMenuHover('edit')}
      >
        Edit
        {activeMenu === 'edit' && renderDropdown(menus.edit)}
      </div>

      {/* View Menu */}
      <div
        className={`${styles.menuItem} ${activeMenu === 'view' ? styles.active : ''}`}
        onClick={() => handleMenuClick('view')}
        onMouseEnter={() => handleMenuHover('view')}
      >
        View
        {activeMenu === 'view' && renderDropdown(menus.view)}
      </div>

      {/* Special Menu */}
      <div
        className={`${styles.menuItem} ${activeMenu === 'special' ? styles.active : ''}`}
        onClick={() => handleMenuClick('special')}
        onMouseEnter={() => handleMenuHover('special')}
      >
        Special
        {activeMenu === 'special' && renderDropdown(menus.special)}
      </div>

      {/* Clock (right side) */}
      <div className={styles.clock}>{formatTime(currentTime)}</div>
    </div>
  );
}

/**
 * Custom EternalOS logo icon for the menu bar
 */
function AppleIcon() {
  return (
    <span className={styles.appleIconSvg}>𐬽𐬻𐬽𐬻𐬽</span>
  );
}
