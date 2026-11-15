import test from "node:test";
import assert from "node:assert/strict";
import { motionSpeed, motionDurations, stageDuration, motionCssVariables } from "../src/motion.js";
import { createSaveState } from "../src/save.js";

test("relaxed swap/pop/fall phases remain clearly visible", () => {
  assert.equal(stageDuration({ type: "swap" }, "relaxed"), 470);
  assert.equal(stageDuration({ type: "pop", combo: 1 }, "relaxed"), 640);
  assert.equal(stageDuration({ type: "pop", combo: 3 }, "relaxed"), 790);
  assert.equal(stageDuration({ type: "fall" }, "relaxed"), 760);
  assert.equal(stageDuration({ type: "shuffle" }, "relaxed"), 360);
});

test("classic pace remains optional and every phase uses identical CSS and timer settings", () => {
  const css = motionCssVariables("classic");
  const durations = motionDurations("classic");
  for (const phase of ["swap", "pop", "fall", "shuffle"]) {
    assert.equal(css["--meeklee-" + phase + "-ms"], stageDuration({ type: phase }, "classic") + "ms");
    assert(durations[phase] > 0);
    assert(stageDuration({ type: phase }, "relaxed") > stageDuration({ type: phase }, "classic"));
  }
  assert.equal(motionSpeed("unknown"), "relaxed");
});

test("existing phone saves gain relaxed pace without losing current progress", () => {
  const previous = {
    mode: "harvest",
    settings: { easy: true, highContrast: true, motion: true },
    easyProgress: { harvest: 29 },
    progress: { harvest: 17 }
  };
  const saved = createSaveState(previous, true);
  assert.equal(saved.settings.motionSpeed, "relaxed");
  assert.equal(saved.settings.motion, true);
  assert.equal(saved.easyProgress.harvest, 29);
  assert.equal(saved.progress.harvest, 17);
});

test("users can preserve preferred classic pace on phone and vice versa", () => {
  const prior = { settings: { easy: true, highContrast: true, motion: true, motionSpeed: "classic" } };
  assert.equal(createSaveState(prior, true).settings.motionSpeed, "classic");
  assert.equal(createSaveState({}, false).settings.motionSpeed, "classic");
  assert.equal(createSaveState({settings:{motionSpeed:"bogus"}}, true).settings.motionSpeed, "relaxed");
});

test("timings don't speed up mid-cascade just because a higher combo started", () => {
  const first = stageDuration({type:"pop",combo:1}, "relaxed");
  const second = stageDuration({type:"pop",combo:2}, "relaxed");
  const third = stageDuration({type:"pop",combo:3}, "relaxed");
  assert(second >= first);
  assert.equal(second, third);
});
