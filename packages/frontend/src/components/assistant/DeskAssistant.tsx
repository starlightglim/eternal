import { useState, useRef, useEffect, useCallback } from 'react';
import { sendAssistantMessage, isApiConfigured, fetchDesktop } from '../../services/api';
import type { AssistantMessage, ToolResult } from '../../services/api';
import { useDesktopStore } from '../../stores/desktopStore';
import { useAppearanceStore, applyAppearance } from '../../stores/appearanceStore';
import styles from './DeskAssistant.module.css';

interface DeskAssistantProps {
  isOwner?: boolean;
}

/**
 * DeskAssistant - Retro terminal window for AI chat
 * Features:
 * - Black background with green/white monospaced text
 * - Input field at bottom with blinking cursor
 * - Chat history scrolls up
 * - "Thinking..." indicator while waiting
 */
export function DeskAssistant({ isOwner = true }: DeskAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle sending a message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message to history
    const newUserMessage: AssistantMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    // In demo mode, provide a mock response
    if (!isApiConfigured) {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockResponse: AssistantMessage = {
        role: 'assistant',
        content: "Welcome to EternalOS! I'm your Desk Assistant. In demo mode, I can't access your actual desktop items, but I'm here to help you get started. Try uploading some images or creating folders to build your digital sanctuary!",
      };
      setMessages(prev => [...prev, mockResponse]);
      setIsLoading(false);
      return;
    }

    // Send to API
    setIsLoading(true);
    try {
      const response = await sendAssistantMessage(userMessage, messages);

      // Build the assistant message content
      let content = response.response;

      // If there were tool results, append a summary
      if (response.toolResults && response.toolResults.length > 0) {
        const successfulTools = response.toolResults.filter((r: ToolResult) => r.success);
        const failedTools = response.toolResults.filter((r: ToolResult) => !r.success);

        if (successfulTools.length > 0 || failedTools.length > 0) {
          content += '\n\n---';
          if (successfulTools.length > 0) {
            content += '\n✓ ' + successfulTools.map((r: ToolResult) => r.message).join('\n✓ ');
          }
          if (failedTools.length > 0) {
            content += '\n✗ ' + failedTools.map((r: ToolResult) => r.message).join('\n✗ ');
          }
        }

        // Refresh state after tool execution
        if (successfulTools.length > 0) {
          try {
            // Refresh desktop data (includes both items and profile)
            const desktopData = await fetchDesktop();

            // Refresh items if item-related tools were used
            const itemTools = ['setItemIcon', 'addWidget'];
            const needsItemRefresh = response.toolCalls?.some(tc => itemTools.includes(tc.tool));
            if (needsItemRefresh) {
              useDesktopStore.getState().setItems(desktopData.items);
            }

            // Refresh appearance if appearance-related tools were used
            const appearanceTools = ['setAccentColor', 'setDesktopColor', 'setWindowBgColor', 'setWallpaper', 'applyCustomCSS'];
            const needsAppearanceRefresh = response.toolCalls?.some(tc => appearanceTools.includes(tc.tool));
            if (needsAppearanceRefresh && desktopData.profile) {
              const appearance = {
                accentColor: desktopData.profile.accentColor,
                desktopColor: desktopData.profile.desktopColor,
                windowBgColor: desktopData.profile.windowBgColor,
                fontSmoothing: desktopData.profile.fontSmoothing,
                customCSS: desktopData.profile.customCSS,
              };
              applyAppearance(appearance);
              useAppearanceStore.getState().loadAppearance(appearance);
            }
          } catch {
            // Silent fail - state will refresh on next page load
          }
        }
      }

      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Render welcome message if no messages
  const showWelcome = messages.length === 0 && !isLoading;

  return (
    <div className={styles.terminal}>
      {/* Terminal output area */}
      <div className={styles.output}>
        {showWelcome && (
          <div className={styles.welcome}>
            <div className={styles.asciiArt}>
{`╔═══════════════════════════════════════╗
║     EternalOS Desk Assistant v2.0     ║
╚═══════════════════════════════════════╝`}
            </div>
            <p>Welcome! I'm your personal desk assistant.</p>
            <p>I can help you:</p>
            <ul>
              <li>Find files on your desktop</li>
              <li>Customize your colors and appearance</li>
              <li>Add widgets like sticky notes and guestbooks</li>
              <li>Change folder icons to personalize your space</li>
            </ul>
            <p className={styles.exampleHeader}>Try asking:</p>
            <ul className={styles.examples}>
              <li>"Make my accent color purple"</li>
              <li>"Give my desktop a cozy vibe"</li>
              <li>"Add a sticky note widget"</li>
              <li>"Change my folders to blue icons"</li>
              <li>"What's on my desktop?"</li>
            </ul>
            <p className={styles.prompt}>Type a message below to get started...</p>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
          >
            <span className={styles.prefix}>
              {msg.role === 'user' ? '>' : '●'}
            </span>
            <span className={styles.content}>{msg.content}</span>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <span className={styles.prefix}>●</span>
            <span className={styles.thinking}>Thinking<span className={styles.dots}>...</span></span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className={styles.error}>
            Error: {error}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <span className={styles.inputPrefix}>&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isOwner ? "Type a message..." : "Read-only mode"}
          disabled={!isOwner || isLoading}
          maxLength={2000}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!isOwner || isLoading || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
