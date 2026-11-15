// One source of truth for React frame scheduling and CSS visual duration.
// Relaxed is the default on touch devices. Classic retains a brisker pace.
export const ANIMATION_SPEEDS = Object.freeze({
  relaxed: Object.freeze({ swap: 470, pop: 640, fall: 760, shuffle: 360, comboBonus: 150 }),
  classic: Object.freeze({ swap: 290, pop: 410, fall: 530, shuffle: 260, comboBonus: 90 })
});

export function motionSpeed(value) {
  return Object.hasOwn(ANIMATION_SPEEDS, value) ? value : "relaxed";
}

export function motionDurations(value) {
  return ANIMATION_SPEEDS[motionSpeed(value)];
}

export function stageDuration(stage, speed) {
  const profile = motionDurations(speed);
  if (stage?.type === "pop") {
    return profile.pop + ((stage.combo || 0) >= 2 ? profile.comboBonus : 0);
  }
  return profile[stage?.type] || profile.shuffle;
}

export function motionCssVariables(speed) {
  const p = motionDurations(speed);
  return {
    "--meeklee-swap-ms": p.swap + "ms",
    "--meeklee-pop-ms": p.pop + "ms",
    "--meeklee-fall-ms": p.fall + "ms",
    "--meeklee-shuffle-ms": p.shuffle + "ms",
    "--meeklee-combo-bonus-ms": p.comboBonus + "ms"
  };
}
