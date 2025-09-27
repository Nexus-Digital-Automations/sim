/**
 * Toast Hook for User Notifications
 *
 * Simple toast notification system using React state and DOM manipulation.
 * Provides success, error, warning, and info toast variants.
 */

"use client";

import { useCallback, useRef } from "react";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  duration?: number;
}

export interface Toast extends ToastOptions {
  id: string;
  timestamp: number;
}

let toastIdCounter = 0;

export function toast(options: ToastOptions): string {
  const id = `toast-${++toastIdCounter}`;
  const toastElement = createToastElement(id, options);

  // Add to DOM
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = createToastContainer();
    document.body.appendChild(toastContainer);
  }

  toastContainer.appendChild(toastElement);

  // Auto-remove after duration
  const duration = options.duration || 5000;
  setTimeout(() => {
    removeToast(id);
  }, duration);

  return id;
}

function createToastContainer(): HTMLElement {
  const container = document.createElement("div");
  container.id = "toast-container";
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 420px;
    pointer-events: none;
  `;
  return container;
}

function createToastElement(id: string, options: ToastOptions): HTMLElement {
  const toast = document.createElement("div");
  toast.id = id;
  toast.style.cssText = `
    pointer-events: auto;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    background: white;
    border: 1px solid #e2e8f0;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    max-width: 100%;
    word-wrap: break-word;
  `;

  // Apply variant styles
  const variantStyles = getVariantStyles(options.variant || "default");
  Object.assign(toast.style, variantStyles);

  // Create content
  const content = document.createElement("div");
  content.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px; color: inherit;">
      ${options.title}
    </div>
    ${
      options.description
        ? `
      <div style="font-size: 14px; opacity: 0.9; color: inherit;">
        ${options.description}
      </div>
    `
        : ""
    }
  `;
  toast.appendChild(content);

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "×";
  closeButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  `;
  closeButton.addEventListener("click", () => removeToast(id));
  toast.appendChild(closeButton);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  });

  return toast;
}

function getVariantStyles(variant: string): Record<string, string> {
  switch (variant) {
    case "destructive":
      return {
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#dc2626",
      };
    case "success":
      return {
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        color: "#16a34a",
      };
    case "warning":
      return {
        background: "#fffbeb",
        border: "1px solid #fed7aa",
        color: "#d97706",
      };
    case "info":
      return {
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#2563eb",
      };
    default:
      return {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        color: "#374151",
      };
  }
}

function removeToast(id: string): void {
  const toastElement = document.getElementById(id);
  if (toastElement) {
    toastElement.style.opacity = "0";
    toastElement.style.transform = "translateX(100%)";
    setTimeout(() => {
      toastElement.remove();

      // Remove container if empty
      const container = document.getElementById("toast-container");
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }
}

export function useToast() {
  const toastRef = useRef<(options: ToastOptions) => string>(toast);

  const showToast = useCallback((options: ToastOptions) => {
    return toastRef.current(options);
  }, []);

  return {
    toast: showToast,
    dismiss: useCallback((id: string) => removeToast(id), []),
  };
}

// Default export for compatibility
export default useToast;
