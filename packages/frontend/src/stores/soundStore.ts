/**
 * Sound Store - Manages desktop sound effects for EternalOS
 *
 * Classic Mac OS-style sounds for:
 * - Window open/close
 * - Folder open
 * - File drop
 * - Trash sounds (drop, empty)
 * - Alert/error beeps
 * - Click feedback
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sound types available in the system
export type SoundType =
  | 'click'
  | 'windowOpen'
  | 'windowClose'
  | 'folderOpen'
  | 'drop'
  | 'trash'
  | 'emptyTrash'
  | 'alert'
  | 'error';

interface SoundState {
  enabled: boolean;
  volume: number; // 0-1
  // Actions
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  playSound: (type: SoundType) => void;
}

// Audio context (lazy initialization)
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
}

// Generate simple synthesized sounds (no external files needed)
function generateBeep(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'square'
): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// Classic Mac-style click sound
function playClick(ctx: AudioContext, volume: number): void {
  generateBeep(ctx, 1000, 0.02, volume, 'square');
}

// Window open - ascending tone
function playWindowOpen(ctx: AudioContext, volume: number): void {
  generateBeep(ctx, 400, 0.05, volume, 'sine');
  setTimeout(() => generateBeep(ctx, 600, 0.05, volume, 'sine'), 30);
}

// Window close - descending tone
function playWindowClose(ctx: AudioContext, volume: number): void {
  generateBeep(ctx, 600, 0.05, volume, 'sine');
  setTimeout(() => generateBeep(ctx, 400, 0.05, volume, 'sine'), 30);
}

// Folder open - soft click
function playFolderOpen(ctx: AudioContext, volume: number): void {
  generateBeep(ctx, 800, 0.03, volume, 'triangle');
}

// Drop sound - thud
function playDrop(ctx: AudioContext, volume: number): void {
  generateBeep(ctx, 150, 0.08, volume, 'sine');
}

// Trash sound - crumple/swoosh
function playTrash(ctx: AudioContext, volume: number): void {
  generateBeep(ctx, 300, 0.04, volume, 'sawtooth');
  setTimeout(() => generateBeep(ctx, 200, 0.06, volume, 'sawtooth'), 40);
}

// Empty trash - longer swoosh
function playEmptyTrash(ctx: AudioContext, volume: number): void {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      generateBeep(ctx, 400 - i * 60, 0.04, volume * (1 - i * 0.15), 'sawtooth');
    }, i * 40);
  }
}

// Alert beep - classic Mac sosumi-style
function playAlert(ctx: AudioContext, volume: number): void {
  generateBeep(ctx, 880, 0.1, volume, 'sine');
  setTimeout(() => generateBeep(ctx, 880, 0.1, volume, 'sine'), 150);
}

// Error sound - low bong
function playError(ctx: AudioContext, volume: number): void {
  generateBeep(ctx, 220, 0.2, volume, 'sine');
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      enabled: true,
      volume: 0.5,

      setEnabled: (enabled) => set({ enabled }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      playSound: (type) => {
        const { enabled, volume } = get();
        if (!enabled || volume === 0) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        // Resume audio context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        switch (type) {
          case 'click':
            playClick(ctx, volume);
            break;
          case 'windowOpen':
            playWindowOpen(ctx, volume);
            break;
          case 'windowClose':
            playWindowClose(ctx, volume);
            break;
          case 'folderOpen':
            playFolderOpen(ctx, volume);
            break;
          case 'drop':
            playDrop(ctx, volume);
            break;
          case 'trash':
            playTrash(ctx, volume);
            break;
          case 'emptyTrash':
            playEmptyTrash(ctx, volume);
            break;
          case 'alert':
            playAlert(ctx, volume);
            break;
          case 'error':
            playError(ctx, volume);
            break;
        }
      },
    }),
    {
      name: 'eternalos-sound-prefs',
      partialize: (state) => ({
        enabled: state.enabled,
        volume: state.volume,
      }),
    }
  )
);

// Convenience hook for playing sounds
export function useSound() {
  const playSound = useSoundStore((state) => state.playSound);
  return playSound;
}
