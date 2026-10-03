import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onToggleGlossary,
  onToggleTariff,
  onToggleISO,
  onCancelSelection,
  onUndo
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if active element is an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        onToggleGlossary?.();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onToggleTariff?.();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        onToggleISO?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancelSelection?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        onUndo?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleGlossary, onToggleTariff, onToggleISO, onCancelSelection, onUndo]);
}
