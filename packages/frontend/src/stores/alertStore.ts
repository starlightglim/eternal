/**
 * Alert Store - Global alert/error dialog management
 *
 * Provides a centralized way to show alert dialogs from anywhere in the app.
 * Supports error, warning, info, and confirmation dialogs.
 */

import { create } from 'zustand';
import type { AlertType } from '../components/ui';

interface AlertState {
  type: AlertType;
  title?: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertStore {
  alert: AlertState | null;

  // Show different types of alerts
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    title?: string
  ) => void;

  // Close the current alert
  closeAlert: () => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  alert: null,

  showError: (message, title) =>
    set({
      alert: {
        type: 'error',
        message,
        title: title ?? 'Error',
      },
    }),

  showWarning: (message, title) =>
    set({
      alert: {
        type: 'warning',
        message,
        title: title ?? 'Warning',
      },
    }),

  showInfo: (message, title) =>
    set({
      alert: {
        type: 'info',
        message,
        title,
      },
    }),

  showConfirm: (message, onConfirm, onCancel, title) =>
    set({
      alert: {
        type: 'confirm',
        message,
        title,
        onConfirm,
        onCancel,
      },
    }),

  closeAlert: () => set({ alert: null }),
}));
