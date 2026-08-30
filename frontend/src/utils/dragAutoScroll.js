/**
 * High-performance Auto-scroll utility for HTML5 drag-and-drop operations.
 * Smoothly scrolls the window or board scrollables without overhead.
 */

let scrollAnimationId = null;
let currentX = 0;
let currentY = 0;
let isDragging = false;
let isInitialized = false;

const THRESHOLD = 80; // Distance in px from edge to start auto-scrolling
const MAX_SPEED = 24; // Max pixels to scroll per frame

function getScrollSpeed(distance, maxDistance) {
  const ratio = Math.max(0, Math.min(1, (maxDistance - distance) / maxDistance));
  return Math.max(3, Math.round(ratio * ratio * MAX_SPEED));
}

function autoScrollLoop() {
  if (!isDragging) {
    stopAutoScroll();
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 1. Window vertical scroll
  if (currentY > 0 && currentY < THRESHOLD) {
    window.scrollBy({ top: -getScrollSpeed(currentY, THRESHOLD), behavior: 'instant' });
  } else if (currentY > 0 && currentY > vh - THRESHOLD) {
    window.scrollBy({ top: getScrollSpeed(vh - currentY, THRESHOLD), behavior: 'instant' });
  }

  // 2. Window horizontal scroll
  if (currentX > 0 && currentX < THRESHOLD) {
    window.scrollBy({ left: -getScrollSpeed(currentX, THRESHOLD), behavior: 'instant' });
  } else if (currentX > 0 && currentX > vw - THRESHOLD) {
    window.scrollBy({ left: getScrollSpeed(vw - currentX, THRESHOLD), behavior: 'instant' });
  }

  // 3. Horizontal Board containers (Kanban / Week grid)
  const boardEl = document.querySelector('.kanban-board-scroll, .week-board-scroll, .day-sessions-grid, .animations-planning-board, .week-matrix-wrapper');
  if (boardEl) {
    const rect = boardEl.getBoundingClientRect();
    if (currentX >= rect.left && currentX <= rect.left + THRESHOLD && boardEl.scrollLeft > 0) {
      boardEl.scrollLeft -= getScrollSpeed(currentX - rect.left, THRESHOLD);
    } else if (currentX <= rect.right && currentX >= rect.right - THRESHOLD && boardEl.scrollLeft + boardEl.clientWidth < boardEl.scrollWidth - 1) {
      boardEl.scrollLeft += getScrollSpeed(rect.right - currentX, THRESHOLD);
    }

    if (currentY >= rect.top && currentY <= rect.top + THRESHOLD && boardEl.scrollTop > 0) {
      boardEl.scrollTop -= getScrollSpeed(currentY - rect.top, THRESHOLD);
    } else if (currentY <= rect.bottom && currentY >= rect.bottom - THRESHOLD && boardEl.scrollTop + boardEl.clientHeight < boardEl.scrollHeight - 1) {
      boardEl.scrollTop += getScrollSpeed(rect.bottom - currentY, THRESHOLD);
    }
  }

  if (isDragging) {
    scrollAnimationId = requestAnimationFrame(autoScrollLoop);
  }
}

export function startAutoScroll(event) {
  isDragging = true;
  if (event) {
    currentX = event.clientX || currentX;
    currentY = event.clientY || currentY;
  }
  if (!scrollAnimationId) {
    scrollAnimationId = requestAnimationFrame(autoScrollLoop);
  }
}

export function updateAutoScrollPosition(event) {
  if (event) {
    currentX = event.clientX || 0;
    currentY = event.clientY || 0;
    if (!isDragging && (event.buttons > 0 || event.type === 'dragover')) {
      isDragging = true;
    }
  }
  if (isDragging && !scrollAnimationId) {
    scrollAnimationId = requestAnimationFrame(autoScrollLoop);
  }
}

export function stopAutoScroll() {
  isDragging = false;
  if (scrollAnimationId) {
    cancelAnimationFrame(scrollAnimationId);
    scrollAnimationId = null;
  }
}

export function initGlobalDragAutoScroll() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  window.addEventListener('dragstart', (e) => {
    isDragging = true;
    currentX = e.clientX || 0;
    currentY = e.clientY || 0;
    if (!scrollAnimationId) {
      scrollAnimationId = requestAnimationFrame(autoScrollLoop);
    }
  }, { passive: true });

  window.addEventListener('dragover', (e) => {
    isDragging = true;
    currentX = e.clientX || 0;
    currentY = e.clientY || 0;
    if (!scrollAnimationId) {
      scrollAnimationId = requestAnimationFrame(autoScrollLoop);
    }
  }, { passive: true });

  window.addEventListener('dragend', stopAutoScroll, { passive: true });
  window.addEventListener('drop', stopAutoScroll, { passive: true });
  window.addEventListener('mouseleave', stopAutoScroll, { passive: true });
}
