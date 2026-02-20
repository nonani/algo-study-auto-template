const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function toHyphenatedNotionId(id) {
  if (!id) return id;
  const raw = id.replace(/-/g, "").trim();
  if (raw.length !== 32) return id;
  return [
    raw.slice(0, 8),
    raw.slice(8, 12),
    raw.slice(12, 16),
    raw.slice(16, 20),
    raw.slice(20)
  ].join("-");
}

export function getUpcomingSundayInKst(baseDate = new Date()) {
  const shifted = new Date(baseDate.getTime() + KST_OFFSET_MS);
  const day = shifted.getUTCDay(); // 0 = Sunday
  const daysToSunday = (7 - day) % 7;
  shifted.setUTCDate(shifted.getUTCDate() + daysToSunday);

  const year = shifted.getUTCFullYear();
  const month = pad2(shifted.getUTCMonth() + 1);
  const dayOfMonth = pad2(shifted.getUTCDate());
  return `${year}-${month}-${dayOfMonth}`;
}

export function tierLabelFromSolvedLevel(level) {
  const numeric = Number(level);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Unrated";
  }

  const tiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ruby"];
  const romans = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

  const tierIndex = Math.floor((numeric - 1) / 5);
  const clampedTierIndex = Math.max(0, Math.min(tierIndex, tiers.length - 1));
  const rank = 5 - ((numeric - 1) % 5);
  return `${tiers[clampedTierIndex]} ${romans[rank]}`;
}

export function extractBaekjoonProblemId(value) {
  if (!value) return null;
  const match = String(value).match(/(?:acmicpc\.net\/problem\/|^)(\d{3,6})(?:\D|$)/i);
  return match?.[1] ?? null;
}

export function isTruthyEnv(value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

