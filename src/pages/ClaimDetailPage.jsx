import { useCallback, useEffect, useState } from "react";
import { ConsensusOrbit, OddsBar, ConfettiBurst } from "../components/Visuals.jsx";
import { useClockTick } from "../hooks/hooks.js";
import {
  categoryMeta,
  claimPhase,
  PHASE_LABEL,
  formatCountdown,
  formatDate,
  formatGenFromAtto,
  formatBps,
  derivePayoutAtto,
  isOneSidedStake,
} from "../lib/format.js";
import {
  isContractConfigured,
  readJson,
  submitTransaction,
  toAtto,
  getExplorerTxUrl,
  shortenAddress,
} from "../lib/genlayer.js";

function orbitStateFor(phase) {
  if (phase === "resolved-yes") return "resolved-yes";
  if (phase === "resolved-no") return "resolved-no";
  if (phase === "void") return "void";
  return "idle";
}

export function ClaimDetailPage({ claims, wallet, toast, claimId, policy }) {
  useClockTick(1000);

  const [claim, setClaim] = useState(() => claims.find((c) => c.id === claimId) || null);
  const [position, setPosition] = useState(null);
  const [stakers, setStakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stakeSide, setStakeSide] = useState("YES");
  const [stakeAmount, setStakeAmount] = useState("1");
  const [staking, setStaking] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const load = useCallback(async () => {
    if (!isContractConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const fresh = await readJson("get_claim", [claimId]);
      setClaim(fresh);
      try {
        const stakerList = await readJson("get_claim_stakers", [claimId]);
        setStakers(Array.isArray(stakerList) ? stakerList : []);
      } catch (err) {
        console.error("[veritas] failed to load stakers:", err);
        setStakers([]);
      }
      if (wallet.address) {
        const pos = await readJson("get_position", [claimId, wallet.address]);
        setPosition(pos);
      } else {
        setPosition(null);
      }
    } catch (err) {
      console.error("[veritas] failed to load claim:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId, wallet.address]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, wallet.address]);

  if (!isContractConfigured()) {
    return (
      <section className="section page-narrow">
        <div className="container notice notice--warning">Contract not configured — see DEPLOY.md.</div>
      </section>
    );
  }

  if (loading && !claim) {
    return (
      <section className="section page-narrow">
        <div className="container">
          <div className="skeleton skeleton--title" style={{ maxWidth: 480 }} />
          <div className="skeleton skeleton--bar" style={{ marginTop: 24 }} />
        </div>
      </section>
    );
  }

  if (!claim) {
    return (
      <section className="section page-narrow">
        <div className="container empty-state">
          <h3>Claim not found</h3>
          <p>It may not exist yet, or the contract address in config.js points elsewhere.</p>
          <a className="btn btn--primary" href="#/">Back to markets</a>
        </div>
      </section>
    );
  }

  const phase = claimPhase(claim);
  const meta = categoryMeta(claim.category);
  const totalAtto = BigInt(claim.yesPoolAtto || "0") + BigInt(claim.noPoolAtto || "0");
  const myPayout = position ? derivePayoutAtto(position, claim) : 0n;
  const alreadyClaimed = position?.claimed === "true";
  const canClaim = ["resolved-yes", "resolved-no", "void"].includes(phase) && myPayout > 0n && !alreadyClaimed;

  async function guardWallet() {
    if (wallet.isConnected) return true;
    try {
      await wallet.connect();
      return true;
    } catch (err) {
      toast(err?.message || "Wallet connection failed.", "error");
      return false;
    }
  }

  async function handleStake() {
    if (!(await guardWallet())) return;
    const amount = Number(stakeAmount);
    if (!amount || amount <= 0) {
      toast("Enter a stake amount greater than zero.", "error");
      return;
    }
    const attoAmount = toAtto(stakeAmount);
    // Mirrors the contract's own MIN_STAKE_ATTO check — read live from
    // get_protocol_policy so this never drifts from the deployed value.
    const minStakeAtto = BigInt(policy?.minStakeAtto || "0");
    if (minStakeAtto > 0n && attoAmount < minStakeAtto) {
      toast(`Minimum stake is ${formatGenFromAtto(minStakeAtto)} GEN.`, "error");
      return;
    }
    setStaking(true);
    try {
      await submitTransaction("stake", [claimId, stakeSide], attoAmount);
      toast(`Staked ${stakeAmount} GEN on ${stakeSide}.`, "success");
      await load();
    } catch (err) {
      toast(err?.message || "Stake failed.", "error");
    } finally {
      setStaking(false);
    }
  }

  async function handleResolve() {
    if (!(await guardWallet())) return;
    setResolving(true);
    try {
      const { txId } = await submitTransaction("resolve_claim", [claimId]);
      toast("Validators reached consensus — market resolved.", "success");
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2200);
      await load();
      console.info("[veritas] resolve_claim tx:", getExplorerTxUrl(txId));
    } catch (err) {
      toast(err?.message || "Resolution failed. If this claim never received stake on both sides, void it instead.", "error");
    } finally {
      setResolving(false);
    }
  }

  async function handleVoid() {
    if (!(await guardWallet())) return;
    setResolving(true);
    try {
      await submitTransaction("void_stale_claim", [claimId]);
      toast("Claim voided — stakers can now claim a full refund.", "success");
      await load();
    } catch (err) {
      toast(err?.message || "Void failed.", "error");
    } finally {
      setResolving(false);
    }
  }

  async function handleClaimWinnings() {
    if (!(await guardWallet())) return;
    setClaiming(true);
    try {
      await submitTransaction("claim_winnings", [claimId]);
      toast("Payout scheduled — it lands once the transaction finalizes.", "success");
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2200);
      await load();
    } catch (err) {
      toast(err?.message || "Claim failed.", "error");
    } finally {
      setClaiming(false);
    }
  }

  let sourceAssessments = [];
  let keyFindings = [];
  try {
    sourceAssessments = JSON.parse(claim.sourceAssessments || "[]");
  } catch {
    sourceAssessments = [];
  }
  try {
    keyFindings = JSON.parse(claim.keyFindings || "[]");
  } catch {
    keyFindings = [];
  }

  return (
    <section className="section page-narrow claim-detail">
      <ConfettiBurst active={confetti} />
      <div className="container">
        <a href="#/" className="back-link">← All markets</a>

        <div className="claim-detail__head">
          <div>
            <span className="chip" style={{ "--chip-color": meta.color }}>
              <span className="chip__icon">{meta.icon}</span>
              {meta.label}
            </span>
            <h1 className="page-title">{claim.title}</h1>
            <p className="claim-detail__statement">{claim.statement}</p>
          </div>
          <span className={`status-pill status-pill--${phase} status-pill--lg`}>{PHASE_LABEL[phase]}</span>
        </div>

        <div className="claim-detail__grid">
          <div className="claim-detail__main">
            <div className="card">
              <OddsBar yesAtto={claim.yesPoolAtto} noAtto={claim.noPoolAtto} size="lg" />
              <div className="claim-detail__stats">
                <div>
                  <span className="claim-detail__stat-value">{formatGenFromAtto(totalAtto, 3)} GEN</span>
                  <span className="claim-detail__stat-label">Total staked</span>
                </div>
                <div>
                  <span className="claim-detail__stat-value">{claim.stakerCount}</span>
                  <span className="claim-detail__stat-label">Participants</span>
                </div>
                <div>
                  <span className="claim-detail__stat-value">
                    {phase === "open" ? formatCountdown(claim.closesAtUnix) : formatDate(claim.closesAtUnix)}
                  </span>
                  <span className="claim-detail__stat-label">{phase === "open" ? "Closes in" : "Closed"}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card__heading">Evidence sources</h3>
              <ul className="source-list">
                {claim.sources.map((src) => {
                  const assessment = sourceAssessments.find((s) => s.url === src);
                  return (
                    <li key={src} className="source-list__item">
                      <a href={src} target="_blank" rel="noreferrer">{src}</a>
                      {assessment && (
                        <span className={`source-list__badge ${assessment.supportsOutcome ? "is-supporting" : "is-neutral"}`}>
                          {assessment.accessible ? (assessment.supportsOutcome ? "Supported outcome" : "Reviewed") : "Inaccessible"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="card">
              <h3 className="card__heading">Stakers ({stakers.length})</h3>
              {stakers.length > 0 ? (
                <ul className="staker-list">
                  {stakers.map((address) => (
                    <li key={address} className="staker-list__item mono" title={address}>
                      {shortenAddress(address)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="action-panel__note">No stakes yet — be the first to back YES or NO.</p>
              )}
            </div>

            {(phase === "resolved-yes" || phase === "resolved-no" || phase === "void") && (
              <div className="card resolution-report">
                <div className="resolution-report__head">
                  <ConsensusOrbit state={orbitStateFor(phase)} size={80} />
                  <div>
                    <h3 className="card__heading">Consensus report</h3>
                    <span className="resolution-report__meta">
                      Resolved {formatDate(claim.resolvedAtUnix || claim.closesAtUnix)}
                      {claim.rationale ? ` · confidence ${claim.confidence}%` : ""}
                    </span>
                  </div>
                </div>
                {claim.voidReason && <p className="resolution-report__void">{claim.voidReason}</p>}
                {claim.rationale && <p className="resolution-report__rationale">{claim.rationale}</p>}
                {keyFindings.length > 0 && (
                  <ul className="resolution-report__findings">
                    {keyFindings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <aside className="claim-detail__side">
            <div className="card action-panel">
              <ConsensusOrbit state={orbitStateFor(phase)} size={120} />

              {phase === "open" && (
                <>
                  <div className="side-select">
                    <button
                      className={`side-btn side-btn--yes ${stakeSide === "YES" ? "is-active" : ""}`}
                      onClick={() => setStakeSide("YES")}
                    >
                      YES
                    </button>
                    <button
                      className={`side-btn side-btn--no ${stakeSide === "NO" ? "is-active" : ""}`}
                      onClick={() => setStakeSide("NO")}
                    >
                      NO
                    </button>
                  </div>
                  <label className="field">
                    <span className="field__label">Amount (GEN)</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                    />
                  </label>
                  <button className="btn btn--primary btn--lg form__submit" onClick={handleStake} disabled={staking}>
                    {staking ? "Staking…" : `Stake ${stakeAmount || 0} GEN on ${stakeSide}`}
                  </button>
                  {policy && (
                    <p className="action-panel__note">
                      Min stake {formatGenFromAtto(policy.minStakeAtto)} GEN · protocol fee{" "}
                      {formatBps(policy.protocolFeeBps)}, taken only from the winning side if this
                      claim resolves.
                    </p>
                  )}
                </>
              )}

              {phase === "awaiting" && isOneSidedStake(claim) && (
                <>
                  <p className="action-panel__note">
                    Staking closed with stake on only one side, so there's nothing for validators
                    to adjudicate. This claim can be voided right away — no need to wait out the
                    full resolution window.
                  </p>
                  <button className="btn btn--outline btn--lg form__submit" onClick={handleVoid} disabled={resolving}>
                    {resolving ? "Voiding…" : "Void & enable refunds"}
                  </button>
                </>
              )}

              {phase === "awaiting" && !isOneSidedStake(claim) && (
                <>
                  <p className="action-panel__note">
                    Staking is closed. Any wallet can now trigger validator consensus — the leader
                    and independent validators each fetch the evidence themselves.
                  </p>
                  <button className="btn btn--primary btn--lg form__submit" onClick={handleResolve} disabled={resolving}>
                    {resolving ? "Awaiting validator consensus…" : "Trigger resolution"}
                  </button>
                </>
              )}

              {phase === "expired" && (
                <>
                  <p className="action-panel__note">
                    The resolution window elapsed before consensus was triggered. Void this claim
                    to unlock full refunds for every staker.
                  </p>
                  <button className="btn btn--outline btn--lg form__submit" onClick={handleVoid} disabled={resolving}>
                    {resolving ? "Voiding…" : "Void & enable refunds"}
                  </button>
                </>
              )}

              {["resolved-yes", "resolved-no", "void"].includes(phase) && (
                <div className="action-panel__position">
                  {wallet.isConnected ? (
                    position && (BigInt(position.yes) > 0n || BigInt(position.no) > 0n) ? (
                      <>
                        <div className="action-panel__row">
                          <span>Your YES stake</span>
                          <span>{formatGenFromAtto(position.yes)} GEN</span>
                        </div>
                        <div className="action-panel__row">
                          <span>Your NO stake</span>
                          <span>{formatGenFromAtto(position.no)} GEN</span>
                        </div>
                        {alreadyClaimed ? (
                          <div className="notice notice--success">Already claimed.</div>
                        ) : canClaim ? (
                          <button className="btn btn--primary btn--lg form__submit" onClick={handleClaimWinnings} disabled={claiming}>
                            {claiming ? "Claiming…" : `Claim ${formatGenFromAtto(myPayout, 3)} GEN`}
                          </button>
                        ) : (
                          <div className="notice">Nothing to claim on this position.</div>
                        )}
                      </>
                    ) : (
                      <div className="notice">You had no stake on this claim.</div>
                    )
                  ) : (
                    <button className="btn btn--outline btn--lg form__submit" onClick={() => wallet.connect()}>
                      Connect wallet to check your position
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card side-meta">
              <div className="side-meta__row">
                <span>Creator</span>
                <span className="mono">{claim.creator.slice(0, 8)}…{claim.creator.slice(-6)}</span>
              </div>
              <div className="side-meta__row">
                <span>Created</span>
                <span>{formatDate(claim.createdAtUnix)}</span>
              </div>
              <div className="side-meta__row">
                <span>Resolution deadline</span>
                <span>{formatDate(claim.resolveByUnix)}</span>
              </div>
              <div className="side-meta__row">
                <span>Protocol fee applied</span>
                <span>{formatBps(claim.feeBpsApplied)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
