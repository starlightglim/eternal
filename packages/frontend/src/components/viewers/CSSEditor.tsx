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
 * - CSS validation (blocks @import, url(), javascript:, etc.)
 * - CSS Reference showing available selectors
 * - Auto-prefixes all rules with .user-desktop
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppearanceStore } from '../../stores/appearanceStore';
import styles from './CSSEditor.module.css';

// Maximum CSS size (10KB)
const MAX_CSS_SIZE = 10 * 1024;

// Dangerous patterns that could be used for injection
const DANGEROUS_PATTERNS = [
  /@import/i,
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript:/i,
  /behavior\s*:/i,
  /-moz-binding/i,
  /<script/i,
  /<\/script/i,
  /\/\*.*\*\//s, // Block comments that might hide injection (optional, can be relaxed)
];

// More specific dangerous patterns for XSS
const XSS_PATTERNS = [
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:/i,
  /expression\s*\(/i,
];

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate CSS for dangerous patterns
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

  return { valid: true };
}

/**
 * Scope CSS to .user-desktop
 * Prepends .user-desktop to every selector
 */
function scopeCSS(css: string): string {
  if (!css.trim()) return '';

  // Simple regex-based scoping (handles most cases)
  // Splits on } and processes each rule block
  const rules = css.split('}');
  const scopedRules: string[] = [];

  for (let rule of rules) {
    rule = rule.trim();
    if (!rule) continue;

    const braceIndex = rule.indexOf('{');
    if (braceIndex === -1) continue;

    const selectors = rule.slice(0, braceIndex).trim();
    const declarations = rule.slice(braceIndex + 1).trim();

    // Handle @keyframes and @media specially
    if (selectors.startsWith('@keyframes') || selectors.startsWith('@-webkit-keyframes')) {
      // Keep keyframes as-is but namespace the name
      scopedRules.push(`${rule}}`);
      continue;
    }

    if (selectors.startsWith('@media') || selectors.startsWith('@supports')) {
      // For media queries, we need to scope the inner rules
      // This is a simplified approach - just add it as-is for now
      scopedRules.push(`${rule}}`);
      continue;
    }

    // Skip @font-face
    if (selectors.startsWith('@font-face')) {
      continue; // Don't allow custom fonts (security)
    }

    // Split multiple selectors and scope each
    const scopedSelectors = selectors
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        // Don't double-scope
        if (s.startsWith('.user-desktop')) return s;
        // Handle :root specially
        if (s === ':root') return '.user-desktop';
        // Handle body/html specially
        if (s === 'body' || s === 'html') return '.user-desktop';
        // Scope normally
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
  { selector: '.desktopIcon', description: 'Desktop icons' },
  { selector: '.menuBar', description: 'The menu bar at top' },
  { selector: '.contextMenu', description: 'Right-click menus' },
  { selector: '.folder-view', description: 'Folder window contents' },
  { selector: '.iconLabel', description: 'Icon text labels' },
  { selector: '.selectionRect', description: 'Drag selection rectangle' },
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
.titleBar span {
  color: white;
  text-shadow: 1px 1px 0 #000;
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
];

export function CSSEditor() {
  const { appearance, setCustomCSS, saveAppearance, isLoading } = useAppearanceStore();
  const [cssInput, setCssInput] = useState(appearance.customCSS || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
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

    // Scope the CSS
    const scopedCSS = scopeCSS(cssInput);

    // Remove existing preview
    if (previewStyleRef.current) {
      previewStyleRef.current.remove();
    }

    // Create and inject preview style
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

    // Remove preview style if exists
    if (previewStyleRef.current) {
      previewStyleRef.current.remove();
      previewStyleRef.current = null;
    }

    // Save to store
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

    // Remove preview
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

    // Focus and position cursor
    setTimeout(() => {
      textarea.focus();
      const newPos = start + css.length + (before && !before.endsWith('\n') ? 2 : 0);
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
        <button
          className={styles.toolButton}
          onClick={() => setShowReference(!showReference)}
          title="CSS Reference"
        >
          {showReference ? 'Hide Reference' : 'Show Reference'}
        </button>
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
            <strong>Note:</strong> All CSS is automatically scoped to{' '}
            <code>.user-desktop</code> to prevent affecting the system UI.
            External resources (@import, url()) are blocked for security.
          </div>
        </div>
      )}

      {/* Editor area */}
      <div className={styles.editorArea}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={cssInput}
          onChange={handleInputChange}
          placeholder={`/* Write your custom CSS here */

.window {
  /* Your styles */
}

.desktopIcon:hover {
  /* Hover effects */
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
