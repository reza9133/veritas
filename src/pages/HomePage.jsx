import { useMemo, useState } from "react";
import { ConsensusOrbit, ParticleField } from "../components/Visuals.jsx";
import { ClaimCard } from "../components/ClaimCard.jsx";
import { useCountUp, useReveal } from "../hooks/hooks.js";
import { CATEGORIES, claimPhase, formatCompact } from "../lib/format.js";
import { isContractConfigured } from "../lib/genlayer.js";

const FILTERS = [
  { key: "all", label: "All markets" },
  { key: "open", label: "Open" },
  { key: "awaiting", label: "Awaiting consensus" },
  { key: "resolved", label: "Resolved" },
];

function StatBlock({ value, suffix = "", label, compact = false }) {
  const display = useCountUp(value);
  const rounded = Math.max(0, Math.floor(display));
  return (
    <div className="stat-block">
      <div className="stat-block__value">
        {compact && rounded >= 1000 ? formatCompact(BigInt(rounded) * 10n ** 18n) : rounded.toLocaleString()}
        <span className="stat-block__suffix">{suffix}</span>
      </div>
      <div className="stat-block__label">{label}</div>
    </div>
  );
}

export function HomePage({ claims, stats, loading, loadError, refresh }) {
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("ALL");
  const [howRef, howVisible] = useReveal();

  const filtered = useMemo(() => {
    return claims.filter((claim) => {
      if (category !== "ALL" && claim.category !== category) return false;
      if (filter === "all") return true;
      const phase = claimPhase(claim);
      if (filter === "resolved") return phase.startsWith("resolved") || phase === "void";
      return phase === filter;
    });
  }, [claims, filter, category]);

  return (
    <>
      <section className="hero">
        <ParticleField count={54} className="hero__particles" />
        <div className="container hero__inner">
          <div className="hero__copy">
            <span className="eyebrow">Live on GenLayer · Optimistic Democracy consensus</span>
            <h1 className="hero__title">
              Truth, <span className="text-gradient">settled by consensus.</span>
            </h1>
            <p className="hero__subtitle">
              Veritas is a prediction market with no admins and no human oracle. Every claim is
              resolved by independent GenLayer validators — each reading the public web and
              reaching consensus on their own, in the open.
            </p>
            <div className="hero__actions">
              <a href="#markets" className="btn btn--primary btn--lg">
                Explore markets
              </a>
              <a href="#/create" className="btn btn--outline btn--lg">
                Create a claim
              </a>
            </div>
            <div className="hero__trust">
              <span>No admins</span>
              <span className="hero__trust-dot">·</span>
              <span>No human oracle</span>
              <span className="hero__trust-dot">·</span>
              <span>Non-custodial settlement</span>
            </div>
          </div>
          <div className="hero__visual">
            <ConsensusOrbit state="idle" size={300} label="Validators converging on a verdict" />
          </div>
        </div>

        <div className="container">
          <div className="stat-bar">
            <StatBlock value={stats ? Number(stats.totalClaims) : 0} label="Claims created" />
            <StatBlock
              value={stats ? Number(BigInt(stats.totalVolumeAtto || "0") / 10n ** 18n) : 0}
              suffix=" GEN"
              label="Total volume"
              compact
            />
            <StatBlock value={stats ? Number(stats.resolvedClaims) : 0} label="Resolved by consensus" />
            <StatBlock value={stats ? Number(stats.openClaims) : 0} label="Open right now" />
          </div>
        </div>
      </section>

      <section id="markets" className="section">
        <div className="container">
          <div className="section__head">
            <h2>Markets</h2>
            <button className="btn btn--ghost btn--sm" onClick={refresh}>
              Refresh
            </button>
          </div>

          <div className="filters">
            <div className="filters__row">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`pill ${filter === f.key ? "pill--active" : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="filters__row filters__row--categories">
              <button className={`pill pill--sm ${category === "ALL" ? "pill--active" : ""}`} onClick={() => setCategory("ALL")}>
                All
              </button>
              {Object.entries(CATEGORIES).map(([key, meta]) => (
                <button
                  key={key}
                  className={`pill pill--sm ${category === key ? "pill--active" : ""}`}
                  style={{ "--chip-color": meta.color }}
                  onClick={() => setCategory(key)}
                >
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>
          </div>

          {!isContractConfigured() && (
            <div className="notice notice--warning">
              <strong>Contract not configured.</strong> Deploy <code>contracts/veritas.py</code> to
              Studionet, then set <code>contractAddress</code> in <code>public/config.js</code>.
              See <code>DEPLOY.md</code>.
            </div>
          )}

          {isContractConfigured() && loadError && (
            <div className="notice notice--error">Couldn't reach the contract: {loadError}</div>
          )}

          {loading ? (
            <div className="claim-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="claim-card claim-card--skeleton">
                  <div className="skeleton skeleton--chip" />
                  <div className="skeleton skeleton--title" />
                  <div className="skeleton skeleton--bar" />
                  <div className="skeleton skeleton--line" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <ConsensusOrbit state="idle" size={140} />
              <h3>{claims.length === 0 ? "No claims yet" : "No markets match this filter"}</h3>
              <p>
                {claims.length === 0
                  ? "Be the first to put a claim to the network — anyone can create one."
                  : "Try a different category or status filter."}
              </p>
              {claims.length === 0 && (
                <a href="#/create" className="btn btn--primary">
                  Create the first claim
                </a>
              )}
            </div>
          ) : (
            <div className="claim-grid">
              {filtered.map((claim, i) => (
                <ClaimCard key={claim.id} claim={claim} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section ref={howRef} className={`section how-teaser reveal ${howVisible ? "reveal--visible" : ""}`}>
        <div className="container how-teaser__inner">
          <div>
            <span className="eyebrow">No admins. No oracle.</span>
            <h2>How a claim actually gets resolved</h2>
            <ol className="how-steps">
              <li>
                <strong>Create.</strong> Anyone states a precise, falsifiable claim and points to
                public evidence sources.
              </li>
              <li>
                <strong>Stake.</strong> The crowd puts GEN behind YES or NO before the deadline.
              </li>
              <li>
                <strong>Adjudicate.</strong> Independent GenLayer validators fetch the evidence
                themselves, form a verdict, and only accept it when their independent conclusions
                agree.
              </li>
            </ol>
            <a href="#/how-it-works" className="btn btn--outline">
              See the full mechanism
            </a>
          </div>
          <ConsensusOrbit state="resolved-yes" size={240} label="A resolved market" />
        </div>
      </section>
    </>
  );
}
