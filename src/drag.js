import { adjacent } from "./core.js";

/**
 * Translate a touch/mouse gesture into a preview for exactly one neighboring
 * puzzle piece. The board never changes until a valid gesture is released.
 *
 * Cell distance includes the visual gap between neighboring tile buttons.
 * Ambiguous diagonals, weak gestures and edge exits cannot select a target.
 */
export function dragPreview({ index, dx, dy, size, cellWidth, cellHeight }) {
  if (!Number.isInteger(index) || !Number.isInteger(size) ||
      size < 2 || index < 0 || index >= size * size ||
      !Number.isFinite(dx) || !Number.isFinite(dy) ||
      !(cellWidth > 0) || !(cellHeight > 0)) {
    return { active: false, target: null, ready: false, x: 0, y: 0 };
  }
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const active = Math.max(absX, absY) >= 7;
  if (!active) return { active, target: null, ready: false, x: 0, y: 0 };

  const horizontal = absX >= absY * 1.2;
  const vertical = absY >= absX * 1.2;
  const step = horizontal ? Math.sign(dx) :
    vertical ? Math.sign(dy) * size : 0;
  const candidate = index + step;
  const target = step !== 0 && adjacent(index, candidate, size) ? candidate : null;
  if (target === null) {
    // Deliberately give a little resistance for diagonals or board edges.
    return {
      active, target: null, ready: false,
      x: Math.max(-12, Math.min(12, dx * 0.2)),
      y: Math.max(-12, Math.min(12, dy * 0.2))
    };
  }

  const extent = horizontal ? cellWidth : cellHeight;
  const distance = horizontal ? absX : absY;
  const threshold = Math.max(14, Math.min(28, extent * 0.3));
  const advance = Math.min(distance, extent);
  return {
    active, target, ready: distance >= threshold,
    x: horizontal ? Math.sign(dx) * advance : 0,
    y: vertical ? Math.sign(dy) * advance : 0
  };
}
