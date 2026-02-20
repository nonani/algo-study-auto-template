import test from "node:test";
import assert from "node:assert/strict";

import {
  extractBaekjoonProblemId,
  getUpcomingSundayInKst,
  tierLabelFromSolvedLevel,
  toHyphenatedNotionId
} from "../src/utils.mjs";

test("toHyphenatedNotionId normalizes 32-char id", () => {
  const normalized = toHyphenatedNotionId("2bbcb40b762481078853cce65ff82887");
  assert.equal(normalized, "2bbcb40b-7624-8107-8853-cce65ff82887");
});

test("getUpcomingSundayInKst returns upcoming Sunday for non-Sunday KST", () => {
  // 2026-02-20T12:00:00Z => 2026-02-20 21:00 KST (Friday)
  const sunday = getUpcomingSundayInKst(new Date("2026-02-20T12:00:00Z"));
  assert.equal(sunday, "2026-02-22");
});

test("getUpcomingSundayInKst returns same day when already Sunday in KST", () => {
  // 2026-02-21T15:30:00Z => 2026-02-22 00:30 KST (Sunday)
  const sunday = getUpcomingSundayInKst(new Date("2026-02-21T15:30:00Z"));
  assert.equal(sunday, "2026-02-22");
});

test("tierLabelFromSolvedLevel maps solved.ac level to tier label", () => {
  assert.equal(tierLabelFromSolvedLevel(1), "Bronze V");
  assert.equal(tierLabelFromSolvedLevel(5), "Bronze I");
  assert.equal(tierLabelFromSolvedLevel(10), "Silver I");
  assert.equal(tierLabelFromSolvedLevel(15), "Gold I");
});

test("extractBaekjoonProblemId reads problem id from URL", () => {
  const id = extractBaekjoonProblemId("https://www.acmicpc.net/problem/1000");
  assert.equal(id, "1000");
});

