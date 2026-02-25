/**
 * Mobile support adapter for StoryLine.
 *
 * Centralises all platform detection and mobile-specific helpers.
 * Desktop code paths never execute mobile logic — the guards
 * early-return so existing desktop rendering is untouched.
 */
import { Platform } from 'obsidian';

// ── Platform detection ────────────────────────────────

/** True on iOS, iPadOS, or Android (Obsidian mobile app) */
export const isMobile: boolean = Platform.isMobile;

/** True only on iOS / iPadOS */
export const isIOS: boolean = (Platform as any).isIos ?? false;

/** True only on Android */
export const isAndroid: boolean = (Platform as any).isAndroid ?? false;

/** True on tablet-sized screens (iPad, Android tablets) */
export const isTablet: boolean = (Platform as any).isTablet ?? false;

/** True on phone-sized screens */
export const isPhone: boolean = isMobile && !isTablet;

// ── Desktop-only views ────────────────────────────────

import {
    PLOTGRID_VIEW_TYPE,
} from '../constants';

/**
 * View types that should be hidden on mobile devices.
 * These use dense grids, complex SVG, or precision mouse
 * interactions that don't translate to touch screens.
 */
export const DESKTOP_ONLY_VIEWS: Set<string> = new Set([
    PLOTGRID_VIEW_TYPE,
]);

/**
 * Character sub-modes that are desktop-only.
 * Grid mode works on mobile; Map and StoryGraph don't.
 */
export const DESKTOP_ONLY_CHARACTER_MODES: Set<string> = new Set([
    'map',
    'story-graph',
]);

// ── Helpers ───────────────────────────────────────────

/**
 * Add the `sl-mobile` class to an element when running on mobile.
 * Use this on root containers so CSS can scope mobile-only styles.
 */
export function applyMobileClass(el: HTMLElement): void {
    if (isMobile) {
        el.addClass('sl-mobile');
        if (isPhone) el.addClass('sl-phone');
        if (isTablet) el.addClass('sl-tablet');
    }
}

/**
 * Minimum touch-target size (px) per Apple HIG / Material Design.
 */
export const TOUCH_TARGET_PX = 44;

/**
 * Attach touch-based drag-and-drop to a card element on mobile.
 *
 * On mobile, HTML5 DnD doesn't work. This provides a long-press
 * initiated touch-move reorder that mirrors the desktop drag.
 *
 * @param card      The draggable card element
 * @param filePath  The scene's file path (the drag data)
 * @param onDrop    Callback when the card is dropped onto a target
 */
export function enableTouchDrag(
    card: HTMLElement,
    filePath: string,
    onDrop: (targetEl: HTMLElement, insertBefore: boolean) => void,
): (() => void) | null {
    if (!isMobile) return null;

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let isDragging = false;
    let ghost: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;

    const LONG_PRESS_MS = 400;
    const MOVE_THRESHOLD = 8;

    function cleanup() {
        isDragging = false;
        if (ghost) {
            ghost.remove();
            ghost = null;
        }
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        card.removeClass('touch-dragging');
        // Remove all drop indicators
        document.querySelectorAll('.drop-above, .drop-below, .drag-over').forEach(el => {
            el.removeClass('drop-above', 'drop-below', 'drag-over');
        });
    }

    function onTouchStart(e: TouchEvent) {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;

        longPressTimer = setTimeout(() => {
            isDragging = true;
            card.addClass('touch-dragging');

            // Create ghost element
            ghost = card.cloneNode(true) as HTMLElement;
            ghost.addClass('sl-touch-ghost');
            ghost.style.position = 'fixed';
            ghost.style.zIndex = '10000';
            ghost.style.pointerEvents = 'none';
            ghost.style.opacity = '0.8';
            ghost.style.width = card.offsetWidth + 'px';
            ghost.style.transform = 'scale(1.05)';
            ghost.style.left = (startX - card.offsetWidth / 2) + 'px';
            ghost.style.top = (startY - 20) + 'px';
            document.body.appendChild(ghost);

            // Haptic feedback on supported devices
            if (navigator.vibrate) navigator.vibrate(50);
        }, LONG_PRESS_MS);
    }

    function onTouchMove(e: TouchEvent) {
        const touch = e.touches[0];

        // If we haven't started dragging yet, cancel if moved too far
        if (!isDragging) {
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
            return;
        }

        e.preventDefault();

        // Move ghost
        if (ghost) {
            ghost.style.left = (touch.clientX - card.offsetWidth / 2) + 'px';
            ghost.style.top = (touch.clientY - 20) + 'px';
        }

        // Find the card under the touch point
        if (ghost) ghost.style.display = 'none';
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (ghost) ghost.style.display = '';

        // Clear previous indicators
        document.querySelectorAll('.drop-above, .drop-below').forEach(el => {
            el.removeClass('drop-above', 'drop-below');
        });

        // Highlight drop target
        const targetCard = target?.closest('.scene-card') as HTMLElement | null;
        if (targetCard && targetCard !== card) {
            const rect = targetCard.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (touch.clientY < midY) {
                targetCard.addClass('drop-above');
            } else {
                targetCard.addClass('drop-below');
            }
        }
    }

    function onTouchEnd(e: TouchEvent) {
        if (!isDragging) {
            cleanup();
            return;
        }

        const touch = e.changedTouches[0];

        // Find drop target
        if (ghost) ghost.style.display = 'none';
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (ghost) ghost.style.display = '';

        const targetCard = target?.closest('.scene-card') as HTMLElement | null;
        if (targetCard && targetCard !== card) {
            const rect = targetCard.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const insertBefore = touch.clientY < midY;
            onDrop(targetCard, insertBefore);
        }

        cleanup();
    }

    card.addEventListener('touchstart', onTouchStart, { passive: true });
    card.addEventListener('touchmove', onTouchMove, { passive: false });
    card.addEventListener('touchend', onTouchEnd, { passive: true });
    card.addEventListener('touchcancel', cleanup, { passive: true });

    // Return cleanup function
    return () => {
        cleanup();
        card.removeEventListener('touchstart', onTouchStart);
        card.removeEventListener('touchmove', onTouchMove);
        card.removeEventListener('touchend', onTouchEnd);
        card.removeEventListener('touchcancel', cleanup);
    };
}
