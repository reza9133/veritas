import { useState } from "react";
import { formatBps, formatGenFromAtto } from "../lib/format.js";
import { isContractConfigured, shortenAddress, submitTransaction } from "../lib/genlayer.js";

// Owner-gated actions only — never a user's stake or a claim's outcome.
// Both calls below mirror exactly what `contracts/veritas.py` guards with
// `gl.message.sender_address == self.owner`; the contract re-checks this
// itself on every call, so this page is a convenience, not the boundary.
export function AdminPage({ wallet, policy, stats, loading, refresh, toast, isOwner }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [feeInput, setFeeInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  if (!isContractConfigured()) {
    return (
      <section className="section page-narrow">
        <div className="container notice notice--warning">Contract not configured — see DEPLOY.md.</div>
      </section>
    );
  }

  // Still loading the first get_protocol_policy read — don't flash a
  // "restricted" message at the real owner while that's in flight.
  if (loading && !policy) {
    return (
      <section className="section page-narrow">
        <div className="container">
          <div className="skeleton skeleton--title" style={{ maxWidth: 360 }} />
          <div className="skeleton skeleton--bar" style={{ marginTop: 24 }} />
        </div>
      </section>
    );
  }

  if (!wallet.isConnected) {
    return (
      <section className="section page-narrow">
        <div className="container empty-state">
          <h3>Connect your wallet</h3>
          <p>Only the contract owner can open the admin panel.</p>
          <button className="btn btn--primary" onClick={() => wallet.connect()}>
            Connect wallet
          </button>
        </div>
      </section>
    );
  }

  if (!isOwner) {
    return (
      <section className="section page-narrow">
        <div className="container empty-state">
          <h3>Restricted</h3>
          <p>
            This wallet isn't the contract owner
            {policy?.owner ? <> — only <span className="mono">{shortenAddress(policy.owner)}</span> can manage protocol settings</> : null}.
          </p>
          <a className="btn btn--outline" href="#/">
            Back to markets
          </a>
        </div>
      </section>
    );
  }

  const currentFeeBps = Number(policy.protocolFeeBps || 0);
  const maxFeeBps = Number(policy.maxFeeBps || 0);
  const treasuryAccruedAtto = stats?.treasuryAccruedAtto || "0";
  const hasAccrued = BigInt(treasuryAccruedAtto || "0") > 0n;

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      await submitTransaction("withdraw_treasury_fees", []);
      toast("Accrued fees swept to the treasury address.", "success");
      await refresh();
    } catch (err) {
      toast(err?.message || "Withdrawal failed.", "error");
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleSetFee(e) {
    e.preventDefault();
    const percent = Number(feeInput);
    if (!Number.isFinite(percent) || feeInput.trim() === "" || percent < 0) {
      toast("Enter a fee percentage of zero or more.", "error");
      return;
    }
    const bps = Math.round(percent * 100);
    if (bps > maxFeeBps) {
      toast(`Fee cannot exceed ${formatBps(maxFeeBps)} — the contract's governance ceiling.`, "error");
      return;
    }
    setSavingFee(true);
    try {
      await submitTransaction("set_protocol_fee_bps", [BigInt(bps)]);
      toast(`Protocol fee updated to ${formatBps(bps)}.`, "success");
      setFeeInput("");
      await refresh();
    } catch (err) {
      toast(err?.message || "Failed to update the fee.", "error");
    } finally {
      setSavingFee(false);
    }
  }

  return (
    <section className="section page-narrow">
      <div className="container">
        <a href="#/" className="back-link">
          ← All markets
        </a>
        <span className="eyebrow">Owner only</span>
        <h1 className="page-title">Protocol admin</h1>
        <p className="page-subtitle">
          Connected as the contract owner. These two actions are the only owner-gated paths
          in Veritas — staking, resolution, and payouts all run on contract logic alone, with
          no admin involvement.
        </p>

        <div className="card side-meta" style={{ marginBottom: 24 }}>
          <div className="side-meta__row">
            <span>Owner</span>
            <span className="mono">{shortenAddress(policy.owner)}</span>
          </div>
          <div className="side-meta__row">
            <span>Treasury address</span>
            <span className="mono">{shortenAddress(policy.treasury)}</span>
          </div>
          <div className="side-meta__row">
            <span>Current protocol fee</span>
            <span>{formatBps(currentFeeBps)}</span>
          </div>
          <div className="side-meta__row">
            <span>Governance ceiling</span>
            <span>{formatBps(maxFeeBps)}</span>
          </div>
          <div className="side-meta__row">
            <span>Minimum stake</span>
            <span>{formatGenFromAtto(policy.minStakeAtto)} GEN</span>
          </div>
          <div className="side-meta__row">
            <span>Treasury accrued (unswept)</span>
            <span>{formatGenFromAtto(treasuryAccruedAtto, 6)} GEN</span>
          </div>
        </div>

        <div className="field-grid">
          <div className="card">
            <h3 className="card__heading">Withdraw treasury fees</h3>
            <p className="action-panel__note">
              Sweeps every accrued protocol fee to the treasury address above, in one on-chain
              transfer. Never touches a staker's own funds — only fees the protocol has already
              collected from resolved claims.
            </p>
            <button
              className="btn btn--primary btn--lg form__submit"
              onClick={handleWithdraw}
              disabled={withdrawing || !hasAccrued}
            >
              {withdrawing
                ? "Withdrawing…"
                : hasAccrued
                ? `Withdraw ${formatGenFromAtto(treasuryAccruedAtto, 4)} GEN`
                : "Nothing accrued yet"}
            </button>
          </div>

          <div className="card">
            <h3 className="card__heading">Update protocol fee</h3>
            <p className="action-panel__note">
              Current fee is {formatBps(currentFeeBps)}, capped at {formatBps(maxFeeBps)} by the
              contract itself. A change applies to claims resolved from now on — never
              retroactively to claims already settled.
            </p>
            <form className="form" onSubmit={handleSetFee}>
              <label className="field">
                <span className="field__label">New fee (%)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max={(maxFeeBps / 100).toString()}
                  step="0.01"
                  placeholder={(currentFeeBps / 100).toFixed(2)}
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                />
              </label>
              <button className="btn btn--outline btn--lg form__submit" type="submit" disabled={savingFee}>
                {savingFee ? "Updating…" : "Update fee"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
