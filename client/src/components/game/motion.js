// Small, purposeful motion for the bayplan: a box travels from the buffer to
// its slot, and a box that becomes a restow blocker lifts briefly. Uses the
// Web Animations API so nothing re-renders, and does nothing when the player
// asked the OS for reduced motion.

const EASE_OUT = 'cubic-bezier(0.32, 0.72, 0, 1)';

const reducedMotion = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const slotEl = (coord) => document.querySelector(`[data-slot="${coord}"]`);

// Measure the buffer card before the box leaves it. Returns null when the
// card is not on screen (e.g. the cargo drawer is closed on a phone).
export function measureBufferCard(containerId) {
  const el = document.querySelector(`[data-pending-id="${CSS.escape(containerId)}"]`);
  const rect = el?.getBoundingClientRect();
  return rect && rect.width > 0 && rect.height > 0 ? rect : null;
}

// A placement waiting for its slot to render. Online placements come back a
// server round-trip later; anything older than a few seconds is dropped.
export const createFlight = (coord, from) => ({ coord, from, at: performance.now() });
export const flightExpired = (flight) => performance.now() - flight.at > 3000;

// Play the placement once the slot exists in the DOM.
// from: DOMRect of the buffer card, or null to lower the box into place
// like a crane would (used for drag-and-drop, where the pointer already
// carried the box to the slot).
export function animatePlacement(coord, from) {
  if (reducedMotion()) return true;
  const el = slotEl(coord);
  if (!el) return false;

  let keyframes;
  let duration;
  if (from) {
    const to = el.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const sx = Math.min(1.4, from.width / to.width);
    const sy = Math.min(1.4, from.height / to.height);
    keyframes = [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.85 },
      { transform: 'none', opacity: 1 }
    ];
    duration = 460;
  } else {
    keyframes = [
      { transform: 'translateY(-18px)', opacity: 0 },
      { transform: 'none', opacity: 1 }
    ];
    duration = 320;
  }

  // Ride above the cargo rail and neighbouring cells while moving.
  el.style.zIndex = '30';
  const anim = el.animate(keyframes, { duration, easing: EASE_OUT });
  anim.onfinish = anim.oncancel = () => { el.style.zIndex = ''; };
  return true;
}

export function liftBlocker(coord) {
  if (reducedMotion()) return;
  const el = slotEl(coord);
  if (!el) return;
  // A box placed straight into a blocking spot is still flying in; lift it
  // after it lands instead of cutting the flight short.
  const running = el.getAnimations();
  if (running.length) {
    Promise.all(running.map((a) => a.finished)).then(() => liftBlocker(coord), () => {});
    return;
  }
  el.animate(
    [
      { transform: 'none' },
      { transform: 'translateY(-7px)', offset: 0.35 },
      { transform: 'none' }
    ],
    { duration: 560, easing: 'ease-in-out' }
  );
}
