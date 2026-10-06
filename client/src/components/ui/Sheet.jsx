import { useEffect, useRef } from 'react';

// Open sheets, oldest first. Only the last one reacts to Esc, so stacked
// sheets (e.g. the learning report over the end-of-game screen) close one
// at a time.
const openSheets = [];

/**
 * Sheet — the one dialog primitive for the game.
 *
 * Wraps a native <dialog> opened with showModal(), so every sheet gets a
 * focus trap and an inert background without extra code.
 * Render it only while the sheet is open (callers keep their
 * `if (!isOpen) return null`); it opens itself on mount.
 *
 * - `onClose` omitted → the sheet is blocking (Esc and backdrop clicks do
 *   nothing), for flows the player must finish, like the end-of-game screen.
 * - `printable` → the sheet is the only thing printed (see index.css).
 * - `className` goes on the dialog host; the panel is `children`, which
 *   keeps its own size classes so layouts stay exactly as they were.
 */
export default function Sheet({ onClose, labelledBy, printable = false, className = '', children }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    openSheets.push(ref);

    // Esc is handled at document level: focus can sit on <body> (after a
    // stacked sheet closes), and some embedded Chromium builds never turn
    // Esc into a `cancel` event. preventDefault stops the native path so the
    // sheet never closes behind React's back.
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || openSheets[openSheets.length - 1] !== ref) return;
      e.preventDefault();
      onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openSheets.splice(openSheets.indexOf(ref), 1);
      if (dialog?.open) dialog.close();
    };
  }, []);

  const handleCancel = (e) => {
    // Other native close requests (e.g. Android back) go through onClose too.
    e.preventDefault();
    onClose?.();
  };

  const handleClick = (e) => {
    // Clicks on the dialog itself (not the panel) are backdrop clicks.
    if (onClose && e.target === e.currentTarget) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={`g-sheet ${className}`}
      aria-labelledby={labelledBy}
      data-printable={printable ? '' : undefined}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      {children}
    </dialog>
  );
}
