import { useReveal } from "../hooks/hooks.js";
import { OddsBar } from "./Visuals.jsx";
import { categoryMeta, claimPhase, PHASE_LABEL, formatCountdown, formatGenFromAtto } from "../lib/format.js";

export function ClaimCard({ claim, index = 0 }) {
  const [ref, visible] = useReveal();
  const phase = claimPhase(claim);
  const meta = categoryMeta(claim.category);
  const totalAtto = BigInt(claim.yesPoolAtto || "0") + BigInt(claim.noPoolAtto || "0");

  return (
    <a
      href={`#/claim/${claim.id}`}
      ref={ref}
      className={`claim-card reveal ${visible ? "reveal--visible" : ""} claim-card--${phase}`}
      style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="claim-card__top">
        <span className="chip" style={{ "--chip-color": meta.color }}>
          <span className="chip__icon">{meta.icon}</span>
          {meta.label}
        </span>
        <span className={`status-pill status-pill--${phase}`}>{PHASE_LABEL[phase]}</span>
      </div>

      <h3 className="claim-card__title">{claim.title}</h3>

      <OddsBar yesAtto={claim.yesPoolAtto} noAtto={claim.noPoolAtto} />

      <div className="claim-card__meta">
        <span>{formatGenFromAtto(totalAtto, 2)} GEN staked</span>
        <span className="claim-card__dot">•</span>
        <span>{claim.stakerCount} participant{claim.stakerCount === "1" ? "" : "s"}</span>
      </div>

      <div className="claim-card__footer">
        {phase === "open" ? (
          <span className="claim-card__countdown">Closes in {formatCountdown(claim.closesAtUnix)}</span>
        ) : phase === "awaiting" ? (
          <span className="claim-card__countdown claim-card__countdown--live">
            <span className="pulse-dot" /> Consensus window open
          </span>
        ) : (
          <span className="claim-card__countdown">{PHASE_LABEL[phase]}</span>
        )}
        <span className="claim-card__arrow">View market →</span>
      </div>
    </a>
  );
}
