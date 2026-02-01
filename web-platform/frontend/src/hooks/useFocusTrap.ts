import { useEffect, useRef } from 'react';

interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
}

/**
 * Hook for trapping focus within a container element.
 * Implements WCAG 2.1 dialog accessibility requirements:
 * - Traps Tab/Shift+Tab within the container
 * - Restores focus to previously focused element on close
 * - Optionally handles Escape key
 */
export function useFocusTrap<T extends HTMLElement>(options: UseFocusTrapOptions) {
  const { isActive, onEscape } = options;
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management: store previous focus and focus first element
  useEffect(() => {
    if (!isActive) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus first focusable element
    const focusFirst = () => {
      if (!containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        containerRef.current.focus();
      }
    };

    requestAnimationFrame(focusFirst);

    // Restore focus on cleanup
    return () => {
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  // Focus trap: Tab key cycling and Escape handling
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      // Handle Tab
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);

  return containerRef;
}
