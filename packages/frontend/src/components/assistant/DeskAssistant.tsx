import { useState, useRef, useEffect, useCallback } from 'react';
import { sendAssistantMessage, isApiConfigured } from '../../services/api';
import type { AssistantMessage } from '../../services/api';
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
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: response.response,
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
║     EternalOS Desk Assistant v1.0     ║
╚═══════════════════════════════════════╝`}
            </div>
            <p>Welcome! I'm your personal desk assistant.</p>
            <p>I can help you:</p>
            <ul>
              <li>Find files on your desktop</li>
              <li>Suggest folder organization</li>
              <li>Describe your desktop contents</li>
              <li>Answer questions about your files</li>
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
