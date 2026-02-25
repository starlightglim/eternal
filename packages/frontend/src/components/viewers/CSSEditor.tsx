/**
 * CSSEditor - Custom CSS editor for power users
 *
 * Layer 4 of the customization engine. Allows users to write
 * custom CSS that transforms their desktop. All CSS is scoped
 * to .user-desktop to prevent breaking the app chrome.
 *
 * Features:
 * - Monospace textarea with good editing experience
 * - Live preview with "Apply" button
 * - CSS validation with smart url() allowlist for first-party assets
 * - CSS Reference showing available selectors + data attributes
 * - CSS Asset panel for uploading images to use in url()
 * - Auto-prefixes all rules with .user-desktop
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppearanceStore } from '../../stores/appearanceStore';
import { CSSAssetPanel } from './CSSAssetPanel';
import styles from './CSSEditor.module.css';

// Maximum CSS size (50KB)
const MAX_CSS_SIZE = 50 * 1024;

// Dangerous patterns that could be used for injection
// Note: url() is NOT blocked here — it's validated separately with an allowlist
const DANGEROUS_PATTERNS = [
  /@import/i,
  /expression\s*\(/i,
  /javascript:/i,
  /behavior\s*:/i,
  /-moz-binding/i,
  /<script/i,
  /<\/script/i,
  // CSS comments (/* ... */) are intentionally allowed — they're a standard
  // part of CSS authoring and don't pose an injection risk on their own.
];

// More specific dangerous patterns for XSS
const XSS_PATTERNS = [
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:/i,
  /expression\s*\(/i,
];

// Allowed url() path prefixes (first-party assets only)
const ALLOWED_URL_PREFIXES = [
  '/api/css-assets/',
  '/api/wallpaper/',
  '/api/icon/',
];

/**
 * Check if a URL value in CSS is allowed
 */
export function isAllowedCSSUrl(urlValue: string): boolean {
  return ALLOWED_URL_PREFIXES.some((prefix) => urlValue.startsWith(prefix));
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate CSS for dangerous patterns and url() values
 */
function validateCSS(css: string): ValidationResult {
  // Check size
  if (css.length > MAX_CSS_SIZE) {
    return {
      valid: false,
      error: `CSS exceeds maximum size of ${MAX_CSS_SIZE / 1024}KB`,
    };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(css)) {
      const match = css.match(pattern);
      return {
        valid: false,
        error: `Disallowed pattern detected: "${match?.[0] || pattern.source}"`,
      };
    }
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(css)) {
      return {
        valid: false,
        error: 'Potentially malicious content detected',
      };
    }
  }

  // Validate url() references — allow only first-party asset paths
  const urlPattern = /url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlPattern.exec(css)) !== null) {
    const urlValue = urlMatch[2];
    if (!isAllowedCSSUrl(urlValue)) {
      return {
        valid: false,
        error: `External url() not allowed: "${urlValue.slice(0, 50)}". Upload images via Assets panel instead.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Scope CSS to .user-desktop
 * Prepends .user-desktop to every selector
 */
function scopeCSS(css: string): string {
  if (!css.trim()) return '';

  const rules = css.split('}');
  const scopedRules: string[] = [];

  for (let rule of rules) {
    rule = rule.trim();
    if (!rule) continue;

    const braceIndex = rule.indexOf('{');
    if (braceIndex === -1) continue;

    const selectors = rule.slice(0, braceIndex).trim();
    const declarations = rule.slice(braceIndex + 1).trim();

    if (selectors.startsWith('@keyframes') || selectors.startsWith('@-webkit-keyframes')) {
      scopedRules.push(`${rule}}`);
      continue;
    }

    if (selectors.startsWith('@media') || selectors.startsWith('@supports')) {
      const atRuleHeader = selectors;
      const innerScoped = scopeCSS(declarations + '}');
      const cleanInner = innerScoped.trim().replace(/}\s*$/, '');
      scopedRules.push(`${atRuleHeader} { ${cleanInner} }}`);
      continue;
    }

    // Skip @font-face
    if (selectors.startsWith('@font-face')) {
      continue;
    }

    const scopedSelectors = selectors
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        if (s.startsWith('.user-desktop')) return s;
        if (s === ':root') return '.user-desktop';
        if (s === 'body' || s === 'html') return '.user-desktop';
        return `.user-desktop ${s}`;
      })
      .join(', ');

    scopedRules.push(`${scopedSelectors} { ${declarations} }`);
  }

  return scopedRules.join('\n');
}

// CSS Reference selectors
const CSS_REFERENCE = [
  { selector: '.user-desktop', description: 'The entire desktop area' },
  { selector: '.window', description: 'Window containers' },
  { selector: '.titleBar', description: 'Window title bars' },
  { selector: '.titleText', description: 'Title bar text' },
  { selector: '.windowContent', description: 'Window content area' },
  { selector: '.desktopIcon', description: 'Desktop icons' },
  { selector: '.iconLabel', description: 'Icon text labels' },
  { selector: '.menuBar', description: 'The menu bar at top' },
  { selector: '.folder-view', description: 'Folder window contents' },
  { selector: '.selectionRect', description: 'Drag selection rectangle' },
  // Data attribute selectors for per-type targeting
  { selector: '.window[data-content-type="folder"]', description: 'Folder windows' },
  { selector: '.window[data-content-type="image"]', description: 'Image windows' },
  { selector: '.window[data-content-type="text"]', description: 'Text editor windows' },
  { selector: '.window[data-content-type="widget"]', description: 'Widget windows' },
  { selector: '.desktopIcon[data-item-type="folder"]', description: 'Folder icons' },
  { selector: '.desktopIcon[data-item-type="image"]', description: 'Image file icons' },
  { selector: '.desktopIcon[data-item-type="link"]', description: 'Link icons' },
];

// Example CSS snippets
const CSS_EXAMPLES = [
  {
    name: 'Rounded Windows',
    css: `.window {
  border-radius: 8px;
  overflow: hidden;
}`,
  },
  {
    name: 'Glowing Icons',
    css: `.desktopIcon:hover {
  filter: drop-shadow(0 0 8px var(--selection));
}`,
  },
  {
    name: 'Gradient Title Bars',
    css: `.titleBar {
  background: linear-gradient(180deg, #8080FF 0%, #4040CC 100%);
}
.titleText {
  color: white;
  text-shadow: 1px 1px 0 #000;
}`,
  },
  {
    name: 'Pink Folder Windows',
    css: `.window[data-content-type="folder"] .titleBar {
  background: linear-gradient(180deg, #FFB6C1 0%, #FF69B4 100%);
}
.window[data-content-type="folder"] .titleText {
  color: white;
  text-shadow: 1px 1px 0 #CC3366;
}`,
  },
  {
    name: 'CRT Scanlines',
    css: `.user-desktop::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
  z-index: 99999;
}`,
  },
  {
    name: 'Rainbow Icon Labels',
    css: `.desktopIcon[data-item-type="folder"] .iconLabel {
  color: #FF69B4;
}
.desktopIcon[data-item-type="image"] .iconLabel {
  color: #87CEEB;
}
.desktopIcon[data-item-type="text"] .iconLabel {
  color: #98FB98;
}
.desktopIcon[data-item-type="link"] .iconLabel {
  color: #DDA0DD;
}`,
  },
  {
    name: 'Custom Cursor',
    css: `/* Upload a cursor image via Assets, then paste its url() here */
.user-desktop {
  cursor: url(/api/css-assets/YOUR_UID/ASSET_ID/cursor.png) 0 0, auto;
}`,
  },
  {
    name: 'Floating Sticker',
    css: `/* Upload a sticker image via Assets, then paste its url() here */
.user-desktop::before {
  content: '';
  position: fixed;
  top: 40px;
  right: 20px;
  width: 80px;
  height: 80px;
  background-image: url(/api/css-assets/YOUR_UID/ASSET_ID/sticker.png);
  background-size: contain;
  background-repeat: no-repeat;
  pointer-events: none;
  z-index: 99998;
}`,
  },
  {
    name: '✿ Y2K Kawaii',
    css: `/* ✿ Y2K Kawaii Desktop ✿ */

/* Rounded, soft windows */
.window {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 2px 2px 10px rgba(0,0,0,0.15), 0 0 20px rgba(255,182,193,0.2);
}

/* Pink folder windows */
.window[data-content-type="folder"] .titleBar {
  background: linear-gradient(180deg, #FFB6C1 0%, #FF69B4 100%);
}
.window[data-content-type="folder"] .titleText {
  color: white;
  text-shadow: 1px 1px 0 #CC3366;
}

/* Mint green text windows */
.window[data-content-type="text"] .titleBar {
  background: linear-gradient(180deg, #98FB98 0%, #3CB371 100%);
}
.window[data-content-type="text"] .titleText {
  color: white;
  text-shadow: 1px 1px 0 #2E8B57;
}

/* Lavender image windows */
.window[data-content-type="image"] .titleBar {
  background: linear-gradient(180deg, #E6E6FA 0%, #9370DB 100%);
}
.window[data-content-type="image"] .titleText {
  color: white;
  text-shadow: 1px 1px 0 #6A5ACD;
}

/* Baby blue widget windows */
.window[data-content-type="widget"] .titleBar {
  background: linear-gradient(180deg, #87CEEB 0%, #4682B4 100%);
}
.window[data-content-type="widget"] .titleText {
  color: white;
  text-shadow: 1px 1px 0 #2C5F8A;
}

/* Rainbow icon labels */
.desktopIcon[data-item-type="folder"] .iconLabel {
  color: #FF69B4;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.desktopIcon[data-item-type="image"] .iconLabel {
  color: #87CEEB;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.desktopIcon[data-item-type="text"] .iconLabel {
  color: #98FB98;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.desktopIcon[data-item-type="link"] .iconLabel {
  color: #DDA0DD;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* Sparkle hover on icons */
.desktopIcon:hover {
  filter: drop-shadow(0 0 6px #FF69B4) drop-shadow(0 0 12px #FFB6C1);
  transform: scale(1.05);
  transition: all 0.15s ease;
}

/* Floating hearts decoration */
.user-desktop::before {
  content: '\\2661 \\2727 \\2661 \\2727 \\2661';
  position: fixed;
  top: 28px;
  right: 16px;
  font-size: 16px;
  color: rgba(255,105,180,0.5);
  letter-spacing: 8px;
  pointer-events: none;
  z-index: 99998;
  animation: floatHearts 3s ease-in-out infinite;
}

@keyframes floatHearts {
  0%, 100% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(-6px); opacity: 0.8; }
}

/* Starfield bottom corner */
.user-desktop::after {
  content: '\\2726 \\22C6 \\2727 \\22C6 \\2726';
  position: fixed;
  bottom: 36px;
  left: 16px;
  font-size: 14px;
  color: rgba(147,112,219,0.4);
  letter-spacing: 6px;
  pointer-events: none;
  z-index: 99998;
  animation: twinkle 2s ease-in-out infinite alternate;
}

@keyframes twinkle {
  0% { opacity: 0.3; transform: scale(1); }
  100% { opacity: 0.7; transform: scale(1.1); }
}

/* Soft selection rectangle */
.selectionRect {
  border: 2px solid #FF69B4 !important;
  background: rgba(255,105,180,0.1) !important;
  border-radius: 4px;
}`,
  },
];

export function CSSEditor() {
  const { appearance, setCustomCSS, saveAppearance, isLoading } = useAppearanceStore();
  const [cssInput, setCssInput] = useState(appearance.customCSS || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewStyleRef = useRef<HTMLStyleElement | null>(null);

  // Sync with appearance store
  useEffect(() => {
    setCssInput(appearance.customCSS || '');
  }, [appearance.customCSS]);

  // Cleanup preview style on unmount
  useEffect(() => {
    return () => {
      if (previewStyleRef.current) {
        previewStyleRef.current.remove();
      }
    };
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCssInput(value);
    setHasUnsavedChanges(true);

    // Validate on change
    const result = validateCSS(value);
    setValidationError(result.valid ? null : result.error || 'Invalid CSS');

    // Remove preview when editing
    if (previewActive) {
      setPreviewActive(false);
      if (previewStyleRef.current) {
        previewStyleRef.current.remove();
        previewStyleRef.current = null;
      }
    }
  }, [previewActive]);

  const handlePreview = useCallback(() => {
    const result = validateCSS(cssInput);
    if (!result.valid) {
      setValidationError(result.error || 'Invalid CSS');
      return;
    }

    const scopedCSS = scopeCSS(cssInput);

    if (previewStyleRef.current) {
      previewStyleRef.current.remove();
    }

    const style = document.createElement('style');
    style.setAttribute('data-custom-css-preview', 'true');
    style.textContent = scopedCSS;
    document.head.appendChild(style);
    previewStyleRef.current = style;
    setPreviewActive(true);
  }, [cssInput]);

  const handleApply = useCallback(async () => {
    const result = validateCSS(cssInput);
    if (!result.valid) {
      setValidationError(result.error || 'Invalid CSS');
      return;
    }

    if (previewStyleRef.current) {
      previewStyleRef.current.remove();
      previewStyleRef.current = null;
    }

    setCustomCSS(cssInput);
    await saveAppearance();
    setHasUnsavedChanges(false);
    setPreviewActive(false);
  }, [cssInput, setCustomCSS, saveAppearance]);

  const handleReset = useCallback(() => {
    setCssInput('');
    setValidationError(null);
    setHasUnsavedChanges(true);
    setPreviewActive(false);

    if (previewStyleRef.current) {
      previewStyleRef.current.remove();
      previewStyleRef.current = null;
    }
  }, []);

  const handleInsertExample = useCallback((css: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = cssInput.slice(0, start);
    const after = cssInput.slice(end);
    const newCSS = before + (before && !before.endsWith('\n') ? '\n\n' : '') + css + after;

    setCssInput(newCSS);
    setHasUnsavedChanges(true);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + css.length + (before && !before.endsWith('\n') ? 2 : 0);
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [cssInput]);

  const handleInsertAssetUrl = useCallback((urlPath: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const snippet = `url(${urlPath})`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = cssInput.slice(0, start);
    const after = cssInput.slice(end);
    const newCSS = before + snippet + after;

    setCssInput(newCSS);
    setHasUnsavedChanges(true);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + snippet.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [cssInput]);

  const charCount = cssInput.length;
  const charLimit = MAX_CSS_SIZE;
  const charPercent = Math.round((charCount / charLimit) * 100);

  return (
    <div className={styles.editor}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolButtons}>
          <button
            className={`${styles.toolButton} ${showReference ? styles.toolButtonActive : ''}`}
            onClick={() => { setShowReference(!showReference); if (!showReference) setShowAssets(false); }}
            title="CSS Reference"
          >
            Reference
          </button>
          <button
            className={`${styles.toolButton} ${showAssets ? styles.toolButtonActive : ''}`}
            onClick={() => { setShowAssets(!showAssets); if (!showAssets) setShowReference(false); }}
            title="Upload and manage CSS image assets"
          >
            Assets
          </button>
        </div>
        <div className={styles.charCount} data-warning={charPercent > 80}>
          {charCount.toLocaleString()} / {(charLimit / 1024).toFixed(0)}KB
        </div>
      </div>

      {/* Reference panel */}
      {showReference && (
        <div className={styles.referencePanel}>
          <div className={styles.referenceSection}>
            <h4>Available Selectors</h4>
            <div className={styles.selectorList}>
              {CSS_REFERENCE.map((ref) => (
                <div key={ref.selector} className={styles.selectorItem}>
                  <code>{ref.selector}</code>
                  <span>{ref.description}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.referenceSection}>
            <h4>Examples</h4>
            <div className={styles.exampleList}>
              {CSS_EXAMPLES.map((ex) => (
                <button
                  key={ex.name}
                  className={styles.exampleButton}
                  onClick={() => handleInsertExample(ex.css)}
                  title="Click to insert"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.referenceNote}>
            <strong>Note:</strong> All CSS is scoped to <code>.user-desktop</code>.
            Use <code>url()</code> with uploaded CSS assets (click &quot;Assets&quot;
            above). External URLs and @import are blocked.
          </div>
        </div>
      )}

      {/* Asset panel */}
      {showAssets && (
        <CSSAssetPanel onInsertUrl={handleInsertAssetUrl} />
      )}

      {/* Editor area */}
      <div className={styles.editorArea}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={cssInput}
          onChange={handleInputChange}
          placeholder={`/* Write your custom CSS here */

/* Target specific window types: */
.window[data-content-type="folder"] .titleBar {
  background: linear-gradient(#FFB6C1, #FF69B4);
}

/* Upload images via Assets to use in url(): */
.user-desktop::before {
  content: '';
  background-image: url(/api/css-assets/...);
}`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <div className={styles.errorBar}>
          <span className={styles.errorIcon}>⚠</span>
          {validationError}
        </div>
      )}

      {/* Preview indicator */}
      {previewActive && (
        <div className={styles.previewBar}>
          <span className={styles.previewIcon}>👁</span>
          Preview active — changes not saved yet
        </div>
      )}

      {/* Action bar */}
      <div className={styles.actionBar}>
        <button
          className={styles.resetButton}
          onClick={handleReset}
          disabled={isLoading || !cssInput}
        >
          Clear All
        </button>
        <div className={styles.actionButtons}>
          <button
            className={styles.previewButton}
            onClick={handlePreview}
            disabled={isLoading || !cssInput || !!validationError}
          >
            Preview
          </button>
          <button
            className={styles.applyButton}
            onClick={handleApply}
            disabled={isLoading || !!validationError || !hasUnsavedChanges}
          >
            {isLoading ? 'Saving...' : 'Apply & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
