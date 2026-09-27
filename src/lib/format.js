export const CATEGORIES = {
  CRYPTO: { label: "Crypto", icon: "◆", color: "#a78bfa" },
  TECH: { label: "Tech", icon: "◇", color: "#67e8f9" },
  SPORTS: { label: "Sports", icon: "▲", color: "#fb923c" },
  WORLD: { label: "World", icon: "●", color: "#f472b6" },
  SCIENCE: { label: "Science", icon: "✦", color: "#4ade80" },
  CULTURE: { label: "Culture", icon: "◈", color: "#facc15" },
  OTHER: { label: "Other", icon: "○", color: "#94a3b8" },
};

export function categoryMeta(category) {
  return CATEGORIES[category] || CATEGORIES.OTHER;
}

export function formatGenFromAtto(atto, maxDecimals = 4) {
  let value;
  try {
    value = typeof atto === "bigint" ? atto : BigInt(atto || "0");
  } catch {
    value = 0n;
  }
  const negative = value < 0n;
  if (negative) value = -value;
  const base = 10n ** 18n;
  const whole = value / base;
  const frac = value % base;
  let fracStr = frac.toString().padStart(18, "0").slice(0, maxDecimals).replace(/0+$/, "");
  const wholeStr = whole.toLocaleString("en-US");
  const sign = negative ? "-" : "";
  return fracStr ? `${sign}${wholeStr}.${fracStr}` : `${sign}${wholeStr}`;
}

export function formatCompact(atto) {
  let value;
  try {
    value = typeof atto === "bigint" ? atto : BigInt(atto || "0");
  } catch {
    value = 0n;
  }
  const gen = Number(value) / 1e18;
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(2)}M`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(1)}K`;
  return gen.toFixed(gen < 10 ? 2 : 0);
}

export function formatPercent(numerator, denominator) {
  const n = Number(numerator || 0);
  const d = Number(denominator || 0);
  if (d <= 0) return 50;
  return Math.max(0, Math.min(100, (n / d) * 100));
}

export function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

export function formatCountdown(targetUnix) {
  const diff = Number(targetUnix) - nowUnix();
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  const seconds = diff % 60;
  return `${minutes}m ${seconds}s`;
}

export function formatDate(unixSeconds) {
  const value = Number(unixSeconds);
  if (!value) return "—";
  return new Date(value * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function claimPhase(claim) {
  const now = nowUnix();
  const closesAt = Number(claim.closesAtUnix);
  const resolveBy = Number(claim.resolveByUnix);
  if (claim.status === "RESOLVED_YES") return "resolved-yes";
  if (claim.status === "RESOLVED_NO") return "resolved-no";
  if (claim.status === "VOID") return "void";
  if (now < closesAt) return "open";
  if (now <= resolveBy) return "awaiting";
  return "expired";
}

export const PHASE_LABEL = {
  open: "Open for staking",
  awaiting: "Awaiting consensus",
  expired: "Resolution window elapsed",
  "resolved-yes": "Resolved — YES",
  "resolved-no": "Resolved — NO",
  void: "Void — refundable",
};

// Mirrors the contract's _derive_payout exactly, for instant UI feedback.
// The on-chain call remains the source of truth at claim time.
export function derivePayoutAtto(position, claim) {
  if (!position || !claim) return 0n;
  const myYes = BigInt(position.yes || "0");
  const myNo = BigInt(position.no || "0");

  if (claim.status === "VOID") return myYes + myNo;

  let winningPool;
  let myWinning;
  if (claim.status === "RESOLVED_YES") {
    winningPool = BigInt(claim.yesPoolAtto || "0");
    myWinning = myYes;
  } else if (claim.status === "RESOLVED_NO") {
    winningPool = BigInt(claim.noPoolAtto || "0");
    myWinning = myNo;
  } else {
    return 0n;
  }
  if (myWinning <= 0n || winningPool <= 0n) return 0n;

  const totalPool = BigInt(claim.yesPoolAtto || "0") + BigInt(claim.noPoolAtto || "0");
  const fee = (totalPool * BigInt(claim.feeBpsApplied || "0")) / 10000n;
  const distributable = totalPool - fee;
  return (myWinning * distributable) / winningPool;
}
