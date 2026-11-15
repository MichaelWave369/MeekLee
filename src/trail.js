export const PAGE_SIZE = 10;
export function pageForLevel(level) {
  return Math.floor((Math.max(1, level) - 1) / PAGE_SIZE);
}
export function levelStatus(level, unlocked) {
  if (!Number.isSafeInteger(level) || level < 1 || !Number.isSafeInteger(unlocked) || unlocked < 1)
    return "locked";
  return level < unlocked ? "completed" : level === unlocked ? "current" : "locked";
}
export function maxPage(unlocked) { return pageForLevel(unlocked); }
export function levelsForPage(page) {
  if (!Number.isSafeInteger(page) || page < 0) return [];
  return Array.from({ length: PAGE_SIZE }, (_, i) => page * PAGE_SIZE + i + 1);
}
