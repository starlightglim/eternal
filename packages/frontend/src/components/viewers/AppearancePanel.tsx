/**
 * AppearancePanel - Mac OS 8 Appearance Manager style control panel
 *
 * Allows users to customize their desktop appearance:
 * - Colors: Accent color, window background, desktop color
 * - Fonts: Font smoothing toggle (future: custom font selection)
 * - Preview: Live preview of color changes
 *
 * This is Layer 1 of the customization engine (Visual Identity).
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useThemeStore, THEMES, type ThemeId } from '../../stores/themeStore';
import { useAppearanceStore } from '../../stores/appearanceStore';
import styles from './AppearancePanel.module.css';

type TabId = 'colors' | 'fonts' | 'preview';

// Preset accent colors (classic Mac color palette)
const ACCENT_PRESETS = [
  { name: 'Blue', color: '#000080' },
  { name: 'Purple', color: '#800080' },
  { name: 'Red', color: '#800000' },
  { name: 'Orange', color: '#CC6600' },
  { name: 'Green', color: '#006600' },
  { name: 'Teal', color: '#008080' },
  { name: 'Graphite', color: '#666666' },
  { name: 'Pink', color: '#CC6699' },
];

// Preset desktop colors
const DESKTOP_COLOR_PRESETS = [
  { name: 'Platinum', color: '#C0C0C0' },
  { name: 'Blue', color: '#6699CC' },
  { name: 'Purple', color: '#9966CC' },
  { name: 'Teal', color: '#669999' },
  { name: 'Green', color: '#669966' },
  { name: 'Rose', color: '#CC9999' },
  { name: 'Warm Gray', color: '#B8A898' },
  { name: 'Dark', color: '#333333' },
];

// Preset window background colors
const WINDOW_BG_PRESETS = [
  { name: 'White', color: '#FFFFFF' },
  { name: 'Cream', color: '#FFFFF0' },
  { name: 'Light Gray', color: '#F0F0F0' },
  { name: 'Light Blue', color: '#F0F8FF' },
  { name: 'Light Green', color: '#F0FFF0' },
  { name: 'Light Pink', color: '#FFF0F5' },
  { name: 'Light Yellow', color: '#FFFFD0' },
  { name: 'Dark', color: '#2A2A2A' },
];

export function AppearancePanel() {
  const { currentTheme, setTheme } = useThemeStore();
  const {
    appearance,
    setAccentColor,
    setDesktopColor,
    setWindowBgColor,
    setFontSmoothing,
    resetAppearance,
    saveAppearance,
    isLoading,
    hasUnsavedChanges,
  } = useAppearanceStore();

  const [activeTab, setActiveTab] = useState<TabId>('colors');
  const [showCustomAccent, setShowCustomAccent] = useState(false);
  const [showCustomDesktop, setShowCustomDesktop] = useState(false);
  const [showCustomWindowBg, setShowCustomWindowBg] = useState(false);
  const [customAccentInput, setCustomAccentInput] = useState(appearance.accentColor || '#000080');
  const [customDesktopInput, setCustomDesktopInput] = useState(appearance.desktopColor || '#C0C0C0');
  const [customWindowBgInput, setCustomWindowBgInput] = useState(appearance.windowBgColor || '#FFFFFF');

  // Sync custom inputs when appearance changes
  useEffect(() => {
    if (appearance.accentColor) {
      setCustomAccentInput(appearance.accentColor);
    }
    if (appearance.desktopColor) {
      setCustomDesktopInput(appearance.desktopColor);
    }
    if (appearance.windowBgColor) {
      setCustomWindowBgInput(appearance.windowBgColor);
    }
  }, [appearance.accentColor, appearance.desktopColor, appearance.windowBgColor]);

  // Check if a preset is selected
  const isAccentPreset = useMemo(() => {
    return ACCENT_PRESETS.some(p => p.color.toLowerCase() === appearance.accentColor?.toLowerCase());
  }, [appearance.accentColor]);

  const isDesktopPreset = useMemo(() => {
    return !appearance.desktopColor || DESKTOP_COLOR_PRESETS.some(p => p.color.toLowerCase() === appearance.desktopColor?.toLowerCase());
  }, [appearance.desktopColor]);

  const isWindowBgPreset = useMemo(() => {
    return !appearance.windowBgColor || WINDOW_BG_PRESETS.some(p => p.color.toLowerCase() === appearance.windowBgColor?.toLowerCase());
  }, [appearance.windowBgColor]);

  // Handlers
  const handleAccentPreset = useCallback((color: string) => {
    setAccentColor(color);
    setShowCustomAccent(false);
  }, [setAccentColor]);

  const handleDesktopPreset = useCallback((color: string) => {
    setDesktopColor(color);
    setShowCustomDesktop(false);
  }, [setDesktopColor]);

  const handleWindowBgPreset = useCallback((color: string) => {
    setWindowBgColor(color);
    setShowCustomWindowBg(false);
  }, [setWindowBgColor]);

  const handleCustomAccent = useCallback(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customAccentInput)) {
      setAccentColor(customAccentInput);
    }
  }, [customAccentInput, setAccentColor]);

  const handleCustomDesktop = useCallback(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customDesktopInput)) {
      setDesktopColor(customDesktopInput);
    }
  }, [customDesktopInput, setDesktopColor]);

  const handleCustomWindowBg = useCallback(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customWindowBgInput)) {
      setWindowBgColor(customWindowBgInput);
    }
  }, [customWindowBgInput, setWindowBgColor]);

  const handleSave = useCallback(async () => {
    await saveAppearance();
  }, [saveAppearance]);

  const handleReset = useCallback(() => {
    resetAppearance();
  }, [resetAppearance]);

  const currentThemeData = THEMES[currentTheme];

  return (
    <div className={styles.panel}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'colors' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          Colors
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'fonts' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('fonts')}
        >
          Fonts
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'preview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      {/* Tab content */}
      <div className={styles.content}>
        {activeTab === 'colors' && (
          <div className={styles.colorsTab}>
            {/* Appearance icon */}
            <div className={styles.panelIcon}>
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                {/* Paint palette icon */}
                <ellipse cx="16" cy="16" rx="13" ry="11" fill="#DDDDDD" stroke="#000" strokeWidth="1.5" />
                <circle cx="10" cy="12" r="3" fill={appearance.accentColor || '#000080'} stroke="#000" strokeWidth="1" />
                <circle cx="17" cy="10" r="3" fill={appearance.desktopColor || '#C0C0C0'} stroke="#000" strokeWidth="1" />
                <circle cx="23" cy="13" r="3" fill={appearance.windowBgColor || '#FFFFFF'} stroke="#000" strokeWidth="1" />
                <circle cx="21" cy="20" r="3" fill="#DDAA44" stroke="#000" strokeWidth="1" />
                <ellipse cx="12" cy="19" rx="3" ry="4" fill="#FFFFFF" stroke="#000" strokeWidth="1" />
              </svg>
            </div>

            {/* Base Theme */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Base Theme</span>
              </div>
              <div className={styles.themeSelect}>
                <select
                  value={currentTheme}
                  onChange={(e) => setTheme(e.target.value as ThemeId)}
                  className={styles.select}
                >
                  {Object.values(THEMES).map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
                <span className={styles.themeDescription}>{currentThemeData.description}</span>
              </div>
            </div>

            {/* Accent Color */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Accent Color</span>
                <span className={styles.sectionHint}>Selection, title bars, highlights</span>
              </div>
              <div className={styles.colorGrid}>
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className={`${styles.colorSwatch} ${appearance.accentColor?.toLowerCase() === preset.color.toLowerCase() ? styles.selected : ''}`}
                    style={{ backgroundColor: preset.color }}
                    onClick={() => handleAccentPreset(preset.color)}
                    title={preset.name}
                  />
                ))}
                <button
                  className={`${styles.colorSwatch} ${styles.customSwatch} ${!isAccentPreset && appearance.accentColor ? styles.selected : ''}`}
                  onClick={() => setShowCustomAccent(!showCustomAccent)}
                  title="Custom color"
                >
                  <span className={styles.customIcon}>+</span>
                </button>
              </div>
              {showCustomAccent && (
                <div className={styles.customColorRow}>
                  <input
                    type="color"
                    value={customAccentInput}
                    onChange={(e) => setCustomAccentInput(e.target.value)}
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={customAccentInput}
                    onChange={(e) => setCustomAccentInput(e.target.value)}
                    className={styles.colorInput}
                    placeholder="#000080"
                    maxLength={7}
                  />
                  <button onClick={handleCustomAccent} className={styles.applyButton}>
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Color */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Desktop Color</span>
                <span className={styles.sectionHint}>Background behind icons (overrides pattern)</span>
              </div>
              <div className={styles.colorGrid}>
                {DESKTOP_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className={`${styles.colorSwatch} ${appearance.desktopColor?.toLowerCase() === preset.color.toLowerCase() ? styles.selected : ''} ${!appearance.desktopColor && preset.color === '#C0C0C0' ? styles.selected : ''}`}
                    style={{ backgroundColor: preset.color }}
                    onClick={() => handleDesktopPreset(preset.color)}
                    title={preset.name}
                  />
                ))}
                <button
                  className={`${styles.colorSwatch} ${styles.customSwatch} ${!isDesktopPreset ? styles.selected : ''}`}
                  onClick={() => setShowCustomDesktop(!showCustomDesktop)}
                  title="Custom color"
                >
                  <span className={styles.customIcon}>+</span>
                </button>
              </div>
              {showCustomDesktop && (
                <div className={styles.customColorRow}>
                  <input
                    type="color"
                    value={customDesktopInput}
                    onChange={(e) => setCustomDesktopInput(e.target.value)}
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={customDesktopInput}
                    onChange={(e) => setCustomDesktopInput(e.target.value)}
                    className={styles.colorInput}
                    placeholder="#C0C0C0"
                    maxLength={7}
                  />
                  <button onClick={handleCustomDesktop} className={styles.applyButton}>
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Window Background */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Window Background</span>
                <span className={styles.sectionHint}>Content area inside windows</span>
              </div>
              <div className={styles.colorGrid}>
                {WINDOW_BG_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className={`${styles.colorSwatch} ${appearance.windowBgColor?.toLowerCase() === preset.color.toLowerCase() ? styles.selected : ''} ${!appearance.windowBgColor && preset.color === '#FFFFFF' ? styles.selected : ''}`}
                    style={{ backgroundColor: preset.color }}
                    onClick={() => handleWindowBgPreset(preset.color)}
                    title={preset.name}
                  />
                ))}
                <button
                  className={`${styles.colorSwatch} ${styles.customSwatch} ${!isWindowBgPreset ? styles.selected : ''}`}
                  onClick={() => setShowCustomWindowBg(!showCustomWindowBg)}
                  title="Custom color"
                >
                  <span className={styles.customIcon}>+</span>
                </button>
              </div>
              {showCustomWindowBg && (
                <div className={styles.customColorRow}>
                  <input
                    type="color"
                    value={customWindowBgInput}
                    onChange={(e) => setCustomWindowBgInput(e.target.value)}
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={customWindowBgInput}
                    onChange={(e) => setCustomWindowBgInput(e.target.value)}
                    className={styles.colorInput}
                    placeholder="#FFFFFF"
                    maxLength={7}
                  />
                  <button onClick={handleCustomWindowBg} className={styles.applyButton}>
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'fonts' && (
          <div className={styles.fontsTab}>
            {/* Font icon */}
            <div className={styles.panelIcon}>
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                {/* Typography icon - letter A */}
                <rect x="4" y="4" width="24" height="24" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" rx="2" />
                <text x="16" y="24" textAnchor="middle" fontFamily="serif" fontSize="18" fontWeight="bold" fill="#000">A</text>
              </svg>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Font Smoothing</span>
              </div>
              <div className={styles.fontOption}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={appearance.fontSmoothing ?? currentThemeData.fontSmoothing}
                    onChange={(e) => setFontSmoothing(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Enable font smoothing (antialiasing)</span>
                </label>
                <p className={styles.optionDescription}>
                  When enabled, text appears smoother but less authentic to classic Macintosh.
                  Recommended for dark themes.
                </p>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>System Fonts</span>
              </div>
              <div className={styles.fontSamples}>
                <div className={styles.fontSample}>
                  <span className={styles.fontName}>Chicago</span>
                  <span className={styles.fontPreview} style={{ fontFamily: 'var(--font-chicago)' }}>
                    The quick brown fox jumps over the lazy dog.
                  </span>
                  <span className={styles.fontUsage}>Menus, buttons, titles</span>
                </div>
                <div className={styles.fontSample}>
                  <span className={styles.fontName}>Geneva</span>
                  <span className={styles.fontPreview} style={{ fontFamily: 'var(--font-geneva)' }}>
                    The quick brown fox jumps over the lazy dog.
                  </span>
                  <span className={styles.fontUsage}>Body text, labels</span>
                </div>
                <div className={styles.fontSample}>
                  <span className={styles.fontName}>Monaco</span>
                  <span className={styles.fontPreview} style={{ fontFamily: 'var(--font-monaco)' }}>
                    The quick brown fox jumps over the lazy dog.
                  </span>
                  <span className={styles.fontUsage}>Code, monospace text</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className={styles.previewTab}>
            <div className={styles.previewDescription}>
              Preview how your customizations will look. Colors are applied live as you change them.
            </div>

            <div className={styles.previewContainer}>
              {/* Mini desktop preview */}
              <div
                className={styles.previewDesktop}
                style={{ backgroundColor: appearance.desktopColor || 'var(--platinum)' }}
              >
                {/* Preview menu bar */}
                <div className={styles.previewMenuBar}>
                  <span>File</span>
                  <span>Edit</span>
                  <span>View</span>
                </div>

                {/* Preview window */}
                <div className={styles.previewWindow}>
                  <div
                    className={styles.previewTitleBar}
                    style={{
                      borderColor: appearance.accentColor || 'var(--selection)',
                    }}
                  >
                    <div className={styles.previewCloseBox} />
                    <span>Sample Window</span>
                  </div>
                  <div
                    className={styles.previewContent}
                    style={{ backgroundColor: appearance.windowBgColor || 'var(--white)' }}
                  >
                    <div
                      className={styles.previewSelection}
                      style={{ backgroundColor: appearance.accentColor || 'var(--selection)' }}
                    >
                      Selected text
                    </div>
                    <div className={styles.previewText}>
                      Regular window content appears here.
                    </div>
                  </div>
                </div>

                {/* Preview icon */}
                <div className={styles.previewIcon}>
                  <div className={styles.previewIconImage} />
                  <span>Folder</span>
                </div>
              </div>
            </div>

            <div className={styles.previewNote}>
              Colors are applied in real-time. Use Save to persist your changes.
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={styles.actionBar}>
        <button onClick={handleReset} className={styles.resetButton} disabled={isLoading}>
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className={styles.saveButton}
          disabled={isLoading || !hasUnsavedChanges}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
