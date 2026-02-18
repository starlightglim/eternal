import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDesktopStore } from '../../stores/desktopStore';
import { useWindowStore } from '../../stores/windowStore';
import { ContextMenu, type ContextMenuItem } from '../ui';
import styles from './CodeViewer.module.css';

interface CodeViewerProps {
  itemId: string;
  windowId: string;
  name: string;
  textContent?: string;
  isOwner?: boolean;
  language?: string;
}

/**
 * CodeViewer - displays code with syntax highlighting
 * Features:
 * - Line numbers
 * - Basic syntax highlighting for common languages
 * - Read-only display (use TextViewer for editing)
 * - Download button
 */
export function CodeViewer({
  itemId,
  windowId,
  name,
  textContent: initialContent = '',
  isOwner = true,
  language,
}: CodeViewerProps) {
  const [content] = useState(initialContent);
  const [fileName, setFileName] = useState(name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { updateItem } = useDesktopStore();
  const { updateWindowTitle } = useWindowStore();

  // Detect language from file extension if not provided
  const detectedLanguage = useMemo(() => {
    if (language) return language;
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      css: 'css',
      html: 'html',
      json: 'json',
      sh: 'bash',
      bash: 'bash',
      yml: 'yaml',
      yaml: 'yaml',
      go: 'go',
      rs: 'rust',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
    };
    return langMap[ext] || 'text';
  }, [name, language]);

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

  // Download the code file
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

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    return [
      {
        id: 'download',
        label: 'Download',
        shortcut: '⌘S',
        action: handleDownload,
      },
    ];
  }, [handleDownload]);

  // Highlight code
  const highlightedCode = useMemo(() => {
    return highlightCode(content, detectedLanguage);
  }, [content, detectedLanguage]);

  // Split into lines for line numbers
  const lines = content.split('\n');

  return (
    <div className={styles.codeViewer} onContextMenu={handleContextMenu}>
      {/* Toolbar */}
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
        <div className={styles.toolbarRight}>
          <span className={styles.languageBadge}>{detectedLanguage}</span>
          {!isOwner && <span className={styles.readOnly}>Read Only</span>}
        </div>
      </div>

      {/* Code content with line numbers */}
      <div className={styles.content}>
        <div className={styles.lineNumbers}>
          {lines.map((_, i) => (
            <div key={i} className={styles.lineNumber}>
              {i + 1}
            </div>
          ))}
        </div>
        <pre
          className={styles.codeContent}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.lineCount}>{lines.length} lines</span>
          <span className={styles.charCount}>{content.length} chars</span>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          items={getContextMenuItems()}
          position={contextMenu}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

/**
 * Simple syntax highlighter
 * Applies basic highlighting for keywords, strings, comments, numbers
 */
function highlightCode(code: string, language: string): string {
  if (!code) return '<span class="empty">No content</span>';

  // Escape HTML first
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Language-specific patterns
  const patterns = getPatterns(language);

  // Apply patterns in order (order matters to avoid overlapping)
  // 1. Strings (must be before comments to avoid issues)
  html = html.replace(patterns.string, '<span class="string">$&</span>');

  // 2. Comments (single-line and multi-line)
  if (patterns.comment) {
    html = html.replace(patterns.comment, '<span class="comment">$&</span>');
  }
  if (patterns.multilineComment) {
    html = html.replace(patterns.multilineComment, '<span class="comment">$&</span>');
  }

  // 3. Keywords
  if (patterns.keywords.length > 0) {
    const keywordRegex = new RegExp(`\\b(${patterns.keywords.join('|')})\\b`, 'g');
    html = html.replace(keywordRegex, '<span class="keyword">$1</span>');
  }

  // 4. Built-in types/functions
  if (patterns.builtins.length > 0) {
    const builtinRegex = new RegExp(`\\b(${patterns.builtins.join('|')})\\b`, 'g');
    html = html.replace(builtinRegex, '<span class="builtin">$1</span>');
  }

  // 5. Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

  // 6. Function calls (word followed by parenthesis)
  html = html.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="function">$1</span>');

  return html;
}

interface LanguagePatterns {
  string: RegExp;
  comment?: RegExp;
  multilineComment?: RegExp;
  keywords: string[];
  builtins: string[];
}

function getPatterns(language: string): LanguagePatterns {
  const basePatterns: LanguagePatterns = {
    string: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    keywords: [],
    builtins: [],
  };

  switch (language) {
    case 'javascript':
    case 'typescript':
      return {
        ...basePatterns,
        comment: /\/\/.*$/gm,
        multilineComment: /\/\*[\s\S]*?\*\//g,
        keywords: [
          'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
          'switch', 'case', 'break', 'continue', 'default', 'try', 'catch', 'finally',
          'throw', 'new', 'class', 'extends', 'super', 'this', 'import', 'export', 'from',
          'async', 'await', 'yield', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void',
          'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'implements',
          'public', 'private', 'protected', 'static', 'readonly', 'abstract', 'as',
        ],
        builtins: [
          'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
          'Date', 'RegExp', 'Error', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
          'Symbol', 'Proxy', 'Reflect', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
          'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch',
        ],
      };

    case 'python':
      return {
        ...basePatterns,
        comment: /#.*$/gm,
        multilineComment: /'''[\s\S]*?'''|"""[\s\S]*?"""/g,
        keywords: [
          'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break',
          'continue', 'pass', 'try', 'except', 'finally', 'raise', 'import', 'from',
          'as', 'with', 'yield', 'lambda', 'and', 'or', 'not', 'in', 'is', 'True',
          'False', 'None', 'global', 'nonlocal', 'assert', 'del', 'async', 'await',
        ],
        builtins: [
          'print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict',
          'tuple', 'set', 'open', 'input', 'type', 'isinstance', 'hasattr', 'getattr',
          'setattr', 'map', 'filter', 'zip', 'enumerate', 'sorted', 'reversed', 'sum',
          'min', 'max', 'abs', 'round', 'pow', 'all', 'any', 'super', 'property',
        ],
      };

    case 'css':
      return {
        ...basePatterns,
        comment: /\/\*[\s\S]*?\*\//g,
        keywords: [
          'important', 'inherit', 'initial', 'unset', 'auto', 'none', 'block', 'inline',
          'flex', 'grid', 'absolute', 'relative', 'fixed', 'sticky', 'static',
        ],
        builtins: [
          'px', 'em', 'rem', 'vh', 'vw', 'deg', 'rad', 'turn', 's', 'ms', 'hz', 'khz',
          'rgb', 'rgba', 'hsl', 'hsla', 'url', 'calc', 'var', 'linear-gradient',
          'radial-gradient', 'rotate', 'scale', 'translate', 'translateX', 'translateY',
        ],
      };

    case 'html':
      return {
        string: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
        comment: /&lt;!--[\s\S]*?--&gt;/g,
        keywords: [],
        builtins: [
          'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li',
          'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option',
          'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav',
          'section', 'article', 'aside', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        ],
      };

    case 'json':
      return {
        string: /"(?:[^"\\]|\\.)*"/g,
        keywords: ['true', 'false', 'null'],
        builtins: [],
      };

    case 'bash':
      return {
        ...basePatterns,
        comment: /#.*$/gm,
        keywords: [
          'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case',
          'esac', 'in', 'function', 'return', 'exit', 'export', 'local', 'readonly',
          'shift', 'break', 'continue', 'declare', 'typeset', 'source',
        ],
        builtins: [
          'echo', 'printf', 'read', 'cd', 'pwd', 'ls', 'rm', 'cp', 'mv', 'mkdir',
          'rmdir', 'touch', 'cat', 'head', 'tail', 'grep', 'sed', 'awk', 'sort',
          'uniq', 'wc', 'find', 'xargs', 'chmod', 'chown', 'curl', 'wget', 'tar',
        ],
      };

    case 'go':
      return {
        ...basePatterns,
        comment: /\/\/.*$/gm,
        multilineComment: /\/\*[\s\S]*?\*\//g,
        keywords: [
          'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
          'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
          'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
          'var', 'true', 'false', 'nil', 'iota',
        ],
        builtins: [
          'append', 'cap', 'close', 'complex', 'copy', 'delete', 'imag', 'len',
          'make', 'new', 'panic', 'print', 'println', 'real', 'recover',
          'string', 'int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8',
          'uint16', 'uint32', 'uint64', 'float32', 'float64', 'bool', 'byte', 'rune',
        ],
      };

    case 'rust':
      return {
        ...basePatterns,
        comment: /\/\/.*$/gm,
        multilineComment: /\/\*[\s\S]*?\*\//g,
        keywords: [
          'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern',
          'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod',
          'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct',
          'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while', 'async',
          'await', 'dyn',
        ],
        builtins: [
          'Option', 'Some', 'None', 'Result', 'Ok', 'Err', 'Box', 'Vec', 'String',
          'str', 'i8', 'i16', 'i32', 'i64', 'i128', 'u8', 'u16', 'u32', 'u64', 'u128',
          'f32', 'f64', 'bool', 'char', 'usize', 'isize', 'println', 'print', 'format',
        ],
      };

    default:
      return basePatterns;
  }
}
