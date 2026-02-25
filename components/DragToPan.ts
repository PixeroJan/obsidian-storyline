/**
 * DragToPan — middle-click (or modifier+left-click) drag-to-pan for scrollable containers.
 *
 * Usage:
 *   const cleanup = enableDragToPan(scrollableEl);
 *   // later, to remove listeners:
 *   cleanup();
 *
 * Behaviour:
 *  • Middle-mouse-button drag always pans.
 *  • Left-mouse-button drag pans only when no interactive element (button, input, a, select, textarea)
 *    is under the pointer, so normal clicks / text selection / drag-and-drop still work.
 *  • While panning the cursor changes to "grabbing".
 *  • A small dead-zone (4 px) prevents accidental pans on plain clicks.
 */

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [contenteditable], .clickable-icon, .is-clickable, [draggable="true"]';

export function enableDragToPan(el: HTMLElement): () => void {
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft0 = 0;
    let scrollTop0 = 0;
    let hasMoved = false;
    let pendingPointerId = -1;
    let isMiddleBtn = false;

    const onPointerDown = (e: PointerEvent) => {
        // On touch devices, let native scroll handle panning
        if (e.pointerType === 'touch') return;

        // Middle button always pans
        isMiddleBtn = e.button === 1;
        // Left button pans only when target is not interactive
        const isLeft = e.button === 0;

        if (!isMiddleBtn && !isLeft) return;

        if (isLeft) {
            // Don't intercept clicks on interactive elements or their children
            const target = e.target as HTMLElement;
            if (target.closest(INTERACTIVE_SELECTOR)) return;
        }

        isPanning = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeft0 = el.scrollLeft;
        scrollTop0 = el.scrollTop;
        pendingPointerId = e.pointerId;

        // For middle-button, capture immediately (no click/dblclick to preserve)
        if (isMiddleBtn) {
            el.setPointerCapture(e.pointerId);
            e.preventDefault();
        }
        // For left-button, do NOT capture or preventDefault yet —
        // this preserves click/dblclick on cells. We capture later
        // only if the pointer moves past the dead zone.
    };

    const DEAD_ZONE = 4;

    const onPointerMove = (e: PointerEvent) => {
        if (!isPanning) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Dead-zone: don't start visual panning until the pointer moves enough
        if (!hasMoved) {
            if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) return;
            hasMoved = true;
            el.classList.add('sl-panning');
            // NOW capture the pointer so we keep getting events even outside el
            if (pendingPointerId >= 0) {
                el.setPointerCapture(pendingPointerId);
            }
        }

        el.scrollLeft = scrollLeft0 - dx;
        el.scrollTop = scrollTop0 - dy;
    };

    const onPointerUp = (e: PointerEvent) => {
        if (!isPanning) return;
        const didMove = hasMoved;
        isPanning = false;
        hasMoved = false;
        pendingPointerId = -1;
        el.classList.remove('sl-panning');
        try { el.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
        // If we actually panned, suppress the click that follows so the cell
        // doesn't get selected/edited at the end of a drag.
        if (didMove) {
            const suppress = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
            el.addEventListener('click', suppress, { capture: true, once: true });
        }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    // Return cleanup function
    return () => {
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerup', onPointerUp);
        el.removeEventListener('pointercancel', onPointerUp);
        el.classList.remove('sl-panning');
    };
}
