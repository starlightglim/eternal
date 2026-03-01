/**
 * CSSElementPicker - Visual element picker for CSS targeting
 *
 * When activated via the CSS Editor, renders a full-viewport overlay with
 * crosshair cursor. Supports two-tier targeting:
 *
 *   1. **Inner elements** — recognizable UI parts like .titleBar, .titleText,
 *      .iconLabel, .windowContent, buttons, links, images, etc.
 *   2. **eos- items** — the parent item container with eos-name/type/folder.
 *
 * Hovering highlights the most specific targetable element. Clicking opens
 * a popover with selector options: specific inner element, combined selectors
 * (e.g. [eos-name="photo"] .titleText), all-of-type, all-in-folder.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCSSPickerStore } from '../../stores/cssPickerStore';
import styles from './CSSElementPicker.module.css';

// ─── Known plain CSS classes that users can target ───────────────────────
const KNOWN_CLASSES = new Set([
  'window', 'titleBar', 'titleText', 'windowContent',
  'closeBox', 'zoomBox', 'collapseBox', 'resizeHandle',
  'desktopIcon', 'iconLabel', 'menuBar', 'sticker',
  'folder-view', 'selectionRect',
]);

// Friendly display names for known classes
const CLASS_LABELS: Record<string, string> = {
  'window': 'Window',
  'titleBar': 'Title bar',
  'titleText': 'Title text',
  'windowContent': 'Window content',
  'closeBox': 'Close button',
  'zoomBox': 'Zoom button',
  'collapseBox': 'Collapse button',
  'resizeHandle': 'Resize handle',
  'desktopIcon': 'Desktop icon',
  'iconLabel': 'Icon label',
  'menuBar': 'Menu bar',
  'sticker': 'Sticker',
  'folder-view': 'Folder view',
  'selectionRect': 'Selection rectangle',
};

// Interactive/semantic HTML tags we recognize as targetable
const TARGETABLE_TAGS = new Set([
  'button', 'a', 'input', 'select', 'textarea',
  'img', 'video', 'audio', 'canvas',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label',
]);

/** What we know about the element under the cursor */
interface TargetInfo {
  /** The most specific targetable element (inner) */
  directEl: Element;
  directRect: DOMRect;
  /** Known plain class on the direct element, if any */
  knownClass: string | null;
  /** Tag-based selector for the direct element, if recognizable */
  tagSelector: string | null;
  /** The eos- ancestor (may be the same as directEl) */
  eosEl: Element | null;
  eosName: string | null;
  eosType: string | null;
  eosFolder: string | null;
  /** Whether direct element IS the eos element (same node) */
  isSameAsEos: boolean;
}

interface PopoverState {
  x: number;
  y: number;
  target: TargetInfo;
}

/** Type-to-emoji map for tooltip display */
const TYPE_ICONS: Record<string, string> = {
  folder: '\uD83D\uDCC1',
  text: '\uD83D\uDCC4',
  image: '\uD83D\uDDBC\uFE0F',
  link: '\uD83D\uDD17',
  audio: '\uD83C\uDFB5',
  video: '\uD83C\uDFAC',
  pdf: '\uD83D\uDCD5',
  widget: '\uD83E\uDDF0',
  sticker: '\u2B50',
  'css-editor': '\uD83C\uDFA8',
  preferences: '\u2699\uFE0F',
  calculator: '\uD83E\uDDEE',
  clock: '\u23F0',
};

/**
 * Check if an element is inside the CSS editor window (skip it).
 */
function isInsideCSSEditor(el: Element | null): boolean {
  while (el && el !== document.body) {
    if (el.getAttribute('data-content-type') === 'css-editor') return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Get the first known plain class from an element's classList.
 */
function getKnownClass(el: Element): string | null {
  for (const cls of el.classList) {
    if (KNOWN_CLASSES.has(cls)) return cls;
  }
  return null;
}

/**
 * Analyze an element under the cursor. Returns info about both the
 * most specific targetable element AND its eos- ancestor.
 */
function analyzeElement(rawEl: Element): TargetInfo | null {
  if (isInsideCSSEditor(rawEl)) return null;

  // Walk up to find:
  //   - directEl: the first "interesting" element (known class, targetable tag, or eos-name)
  //   - eosEl: the first element with eos-name
  let directEl: Element | null = null;
  let directKnownClass: string | null = null;
  let directTagSelector: string | null = null;
  let eosEl: Element | null = null;

  let current: Element | null = rawEl;

  while (current && current !== document.body) {
    // Check for eos-name
    if (!eosEl && current.hasAttribute('eos-name')) {
      eosEl = current;
      // If we haven't found a directEl yet, this IS the direct element
      if (!directEl) {
        directEl = current;
      }
      break; // eos-name is the highest we go
    }

    // Check for known class
    if (!directEl) {
      const knownCls = getKnownClass(current);
      if (knownCls) {
        directEl = current;
        directKnownClass = knownCls;
      }
    }

    // Check for targetable tag
    if (!directEl) {
      const tag = current.tagName.toLowerCase();
      if (TARGETABLE_TAGS.has(tag)) {
        directEl = current;
        directTagSelector = tag;
      }
    }

    current = current.parentElement;
  }

  // If we still don't have eosEl, keep walking from where we left off
  if (!eosEl && current) {
    current = current.parentElement;
    while (current && current !== document.body) {
      if (current.hasAttribute('eos-name')) {
        eosEl = current;
        break;
      }
      current = current.parentElement;
    }
  }

  // Must have at least SOMETHING to target
  if (!directEl && !eosEl) return null;

  // Default directEl to the raw element if nothing better was found
  // but only if we have an eos ancestor for context
  if (!directEl) {
    if (eosEl) {
      directEl = eosEl;
    } else {
      return null;
    }
  }

  const isSameAsEos = directEl === eosEl;

  return {
    directEl,
    directRect: directEl.getBoundingClientRect(),
    knownClass: directKnownClass,
    tagSelector: directTagSelector,
    eosEl,
    eosName: eosEl?.getAttribute('eos-name') || null,
    eosType: eosEl?.getAttribute('eos-type') || null,
    eosFolder: eosEl?.getAttribute('eos-folder') || null,
    isSameAsEos,
  };
}

export function CSSElementPicker() {
  const { isActive, onSelectorChosen, deactivate } = useCSSPickerStore();
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle mouse move — find element under cursor
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    // Skip if popover is showing
    if (popover) return;

    // Throttle via requestAnimationFrame
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      // Temporarily hide the overlay to allow elementFromPoint to see through
      const overlay = overlayRef.current;
      if (overlay) overlay.style.pointerEvents = 'none';

      const el = document.elementFromPoint(e.clientX, e.clientY);

      if (overlay) overlay.style.pointerEvents = '';

      if (!el) {
        setTarget(null);
        return;
      }

      const info = analyzeElement(el);
      setTarget(info);
    });
  }, [popover]);

  // Handle click — show popover with selector options
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (popover) {
      // If popover is open, clicking overlay closes it
      setPopover(null);
      return;
    }

    if (!target) return;

    setPopover({
      x: e.clientX,
      y: e.clientY,
      target,
    });
  }, [target, popover]);

  // Handle ESC to deactivate
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (popover) {
          setPopover(null);
        } else {
          deactivate();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isActive, deactivate, popover]);

  // Attach mousemove listener
  useEffect(() => {
    if (!isActive) return;

    window.addEventListener('mousemove', handleMouseMove, true);
    return () => window.removeEventListener('mousemove', handleMouseMove, true);
  }, [isActive, handleMouseMove]);

  // Choose a selector option
  const handleChooseSelector = useCallback((selector: string) => {
    if (onSelectorChosen) {
      onSelectorChosen(selector);
    }
    setPopover(null);
    setTarget(null);
    deactivate();
  }, [onSelectorChosen, deactivate]);

  // Cancel popover
  const handleCancel = useCallback(() => {
    setPopover(null);
  }, []);

  if (!isActive) return null;

  // Calculate popover position (avoid going off-screen)
  const getPopoverStyle = (px: number, py: number): React.CSSProperties => {
    const popWidth = 300;
    const popHeight = 260;
    let x = px + 8;
    let y = py + 8;

    if (x + popWidth > window.innerWidth) {
      x = px - popWidth - 8;
    }
    if (y + popHeight > window.innerHeight) {
      y = py - popHeight - 8;
    }
    x = Math.max(4, x);
    y = Math.max(24, y);

    return { left: x, top: y };
  };

  // Tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    let x = mousePos.x + 16;
    let y = mousePos.y + 20;

    if (x + 300 > window.innerWidth) {
      x = mousePos.x - 300;
    }
    if (y + 40 > window.innerHeight) {
      y = mousePos.y - 40;
    }
    x = Math.max(4, x);
    y = Math.max(24, y);

    return { left: x, top: y };
  };

  // Build popover options
  const buildOptions = (t: TargetInfo) => {
    const options: { label: string; selector: string }[] = [];
    const innerSelector = t.knownClass ? `.${t.knownClass}` : t.tagSelector;
    const innerLabel = t.knownClass ? CLASS_LABELS[t.knownClass] || t.knownClass : t.tagSelector;

    // ── Inner element + specific item (combined) ──
    // e.g. [eos-name="my-photo"] .titleText
    if (innerSelector && !t.isSameAsEos && t.eosName) {
      options.push({
        label: `${innerLabel} of "${t.eosName}"`,
        selector: `[eos-name="${t.eosName}"] ${innerSelector}`,
      });
    }

    // ── All inner elements of this kind ──
    // e.g. .titleText (all title texts everywhere)
    if (innerSelector && !t.isSameAsEos) {
      options.push({
        label: `All ${innerLabel?.toLowerCase()}s`,
        selector: innerSelector,
      });
    }

    // ── Only this specific eos item ──
    if (t.eosName) {
      options.push({
        label: `Only "${t.eosName}"`,
        selector: `[eos-name="${t.eosName}"]`,
      });
    }

    // ── All items of this type ──
    if (t.eosType) {
      options.push({
        label: `All ${t.eosType}s`,
        selector: `[eos-type="${t.eosType}"]`,
      });
    }

    // ── Everything in this folder ──
    if (t.eosFolder) {
      options.push({
        label: `Everything in "${t.eosFolder}"`,
        selector: `[eos-folder="${t.eosFolder}"]`,
      });
    }

    return options;
  };

  // Tooltip display text
  const getTooltipText = (t: TargetInfo) => {
    const innerLabel = t.knownClass
      ? (CLASS_LABELS[t.knownClass] || t.knownClass)
      : t.tagSelector
        ? `<${t.tagSelector}>`
        : null;

    const typeIcon = t.eosType ? TYPE_ICONS[t.eosType] || '' : '';

    const parts: string[] = [];
    if (typeIcon) parts.push(typeIcon);
    if (innerLabel && !t.isSameAsEos) parts.push(innerLabel);
    if (t.eosName) parts.push(t.isSameAsEos ? t.eosName : `in "${t.eosName}"`);

    return parts.join(' ');
  };

  const popoverTarget = popover?.target;
  const popoverTitle = popoverTarget
    ? popoverTarget.knownClass && !popoverTarget.isSameAsEos
      ? `${CLASS_LABELS[popoverTarget.knownClass] || popoverTarget.knownClass} → ${popoverTarget.eosName || 'element'}`
      : popoverTarget.eosName || 'Element'
    : '';

  return (
    <>
      {/* Status bar */}
      <div className={styles.statusBar}>
        Pick an element · Click to choose · ESC to cancel
      </div>

      {/* Full-screen overlay */}
      <div
        ref={overlayRef}
        className={styles.overlay}
        onClick={handleClick}
      />

      {/* Highlight box */}
      {target && !popover && (
        <div
          className={styles.highlight}
          style={{
            left: target.directRect.left,
            top: target.directRect.top,
            width: target.directRect.width,
            height: target.directRect.height,
          }}
        />
      )}

      {/* Tooltip */}
      {target && !popover && (
        <div className={styles.tooltip} style={getTooltipStyle()}>
          {getTooltipText(target)}
        </div>
      )}

      {/* Popover with selector options */}
      {popover && popoverTarget && (
        <div className={styles.popover} style={getPopoverStyle(popover.x, popover.y)}>
          <div className={styles.popoverHeader}>
            {popoverTitle}
          </div>
          {buildOptions(popoverTarget).map((opt) => (
            <button
              key={opt.selector}
              className={styles.popoverOption}
              onClick={(e) => {
                e.stopPropagation();
                handleChooseSelector(opt.selector);
              }}
            >
              <span className={styles.popoverOptionLabel}>{opt.label}</span>
              <code className={styles.popoverOptionSelector}>{opt.selector}</code>
            </button>
          ))}
          <button
            className={styles.popoverCancel}
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
