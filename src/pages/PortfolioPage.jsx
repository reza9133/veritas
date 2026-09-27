import { useEffect, useMemo, useState } from "react";
import { categoryMeta, claimPhase, PHASE_LABEL, formatGenFromAtto, derivePayoutAtto } from "../lib/format.js";
import { isContractConfigured, readJson } from "../lib/genlayer.js";

export function PortfolioPage({ claims, wallet }) {
  const [positions, setPositions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!wallet.address || !isContractConfigured()) {
        setPositions(null);
        return;
      }
      setLoading(true);
      try {
        const result = await readJson("get_positions_for_address", [wallet.address]);
        if (!cancelled) setPositions(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("[veritas] failed to load portfolio:", err);
        if (!cancelled) setPositions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [wallet.address]);

  const claimsById = useMemo(() => {
    const map = new Map();
    claims.forEach((c) => map.set(c.id, c));
    return map;
  }, [claims]);

  const rows = useMemo(() => {
    if (!positions) return [];
    return positions
      .map((p) => ({ position: p, claim: claimsById.get(p.claimId) }))
      .filter((r) => r.claim);
  }, [positions, claimsById]);

  const totals = useMemo(() => {
    let staked = 0n;
    let claimable = 0n;
    let openCount = 0;
    rows.forEach(({ position, claim }) => {
      staked += BigInt(position.yes || "0") + BigInt(position.no || "0");
      if (position.claimed !== "true") {
        claimable += derivePayoutAtto(position, claim);
      }
      if (claimPhase(claim) === "open") openCount += 1;
    });
    return { staked, claimable, openCount };
  }, [rows]);

  if (!isContractConfigured()) {
    return (
      <section className="section page-narrow">
        <div className="container notice notice--warning">Contract not configured — see DEPLOY.md.</div>
      </section>
    );
  }

  if (!wallet.isConnected) {
    return (
      <section className="section page-narrow">
        <div className="container empty-state">
          <h3>Connect a wallet to view your portfolio</h3>
          <p>Your positions, live P&amp;L, and claimable winnings will show up here.</p>
          <button className="btn btn--primary" onClick={wallet.connect}>
            Connect wallet
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-narrow">
      <div className="container">
        <span className="eyebrow">Your wallet</span>
        <h1 className="page-title">Portfolio</h1>

        <div className="stat-bar stat-bar--tight">
          <div className="stat-block">
            <div className="stat-block__value">{formatGenFromAtto(totals.staked, 3)}</div>
            <div className="stat-block__label">GEN staked (lifetime)</div>
          </div>
          <div className="stat-block">
            <div className="stat-block__value">{formatGenFromAtto(totals.claimable, 3)}</div>
            <div className="stat-block__label">GEN claimable now</div>
          </div>
          <div className="stat-block">
            <div className="stat-block__value">{totals.openCount}</div>
            <div className="stat-block__label">Open positions</div>
          </div>
        </div>

        {loading ? (
          <div className="claim-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="claim-card claim-card--skeleton">
                <div className="skeleton skeleton--chip" />
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--bar" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <h3>No positions yet</h3>
            <p>Stake on a market to see it here.</p>
            <a className="btn btn--primary" href="#/">
              Browse markets
            </a>
          </div>
        ) : (
          <div className="position-list">
            {rows.map(({ position, claim }) => {
              const phase = claimPhase(claim);
              const meta = categoryMeta(claim.category);
              const payout = derivePayoutAtto(position, claim);
              return (
                <a key={claim.id} href={`#/claim/${claim.id}`} className="position-row">
                  <span className="chip" style={{ "--chip-color": meta.color }}>
                    {meta.icon}
                  </span>
                  <div className="position-row__main">
                    <span className="position-row__title">{claim.title}</span>
                    <span className={`status-pill status-pill--${phase}`}>{PHASE_LABEL[phase]}</span>
                  </div>
                  <div className="position-row__stakes">
                    <span className="position-row__yes">Y {formatGenFromAtto(position.yes, 2)}</span>
                    <span className="position-row__no">N {formatGenFromAtto(position.no, 2)}</span>
                  </div>
                  <div className="position-row__payout">
                    {position.claimed === "true" ? (
                      <span className="tag tag--muted">Claimed</span>
                    ) : payout > 0n ? (
                      <span className="tag tag--positive">Claim {formatGenFromAtto(payout, 3)} GEN</span>
                    ) : (
                      <span className="tag">—</span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
