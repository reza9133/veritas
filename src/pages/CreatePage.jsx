import { useState } from "react";
import { CATEGORIES } from "../lib/format.js";
import { isContractConfigured, submitTransaction, getExplorerTxUrl } from "../lib/genlayer.js";

const DURATION_PRESETS = [
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
  { label: "30 days", hours: 720 },
];

// Mirrors the contract's MIN/MAX_RESOLUTION_WINDOW_HOURS range (1 to 720
// hours / 30 days) — keep the top end in sync if that constant ever changes.
const WINDOW_PRESETS = [
  { label: "6 hours", hours: 6 },
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
  { label: "2 weeks", hours: 336 },
  { label: "30 days", hours: 720 },
];

export function CreatePage({ wallet, refresh, toast, policy }) {
  // Read live from get_protocol_policy so this never drifts from the
  // deployed contract's MAX_SOURCES constant; 5 is only the fallback while
  // the first policy read is still in flight.
  const maxSources = Number(policy?.maxSources || 5);
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [category, setCategory] = useState("CRYPTO");
  const [sources, setSources] = useState([""]);
  const [closeHours, setCloseHours] = useState(72);
  const [windowHours, setWindowHours] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function updateSource(index, value) {
    setSources((current) => current.map((s, i) => (i === index ? value : s)));
  }

  function addSource() {
    setSources((current) => (current.length >= maxSources ? current : [...current, ""]));
  }

  function removeSource(index) {
    setSources((current) => current.filter((_, i) => i !== index));
  }

  function validate() {
    const next = {};
    if (title.trim().length < 8) next.title = "At least 8 characters.";
    if (title.trim().length > 140) next.title = "140 characters max.";
    if (statement.trim().length < 20) next.statement = "At least 20 characters — be precise and falsifiable.";
    if (statement.trim().length > 600) next.statement = "600 characters max.";
    const cleanSources = sources.map((s) => s.trim()).filter(Boolean);
    if (cleanSources.length === 0) next.sources = "Add at least one https:// evidence source.";
    if (cleanSources.some((s) => !/^https:\/\/.+/i.test(s))) next.sources = "Every source must start with https://";
    if (new Set(cleanSources).size !== cleanSources.length) next.sources = "Sources must be unique.";
    setErrors(next);
    return { valid: Object.keys(next).length === 0, cleanSources };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isContractConfigured()) {
      toast("Contract not configured yet — see DEPLOY.md.", "error");
      return;
    }
    const { valid, cleanSources } = validate();
    if (!valid) return;

    if (!wallet.isConnected) {
      try {
        await wallet.connect();
      } catch (err) {
        toast(err?.message || "Wallet connection failed.", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const { txId } = await submitTransaction("create_claim", [
        title.trim(),
        statement.trim(),
        category,
        JSON.stringify(cleanSources),
        BigInt(closeHours),
        BigInt(windowHours),
      ]);
      toast("Claim created — validators can adjudicate it once staking closes.", "success");
      await refresh();
      setTitle("");
      setStatement("");
      setSources([""]);
      window.location.hash = "#/";
      console.info("[veritas] create_claim tx:", getExplorerTxUrl(txId));
    } catch (err) {
      toast(err?.message || "Failed to create claim.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section page-narrow">
      <div className="container">
        <span className="eyebrow">New claim</span>
        <h1 className="page-title">Put a claim to the network</h1>
        <p className="page-subtitle">
          Write a precise, falsifiable yes/no statement and point to the public evidence a
          validator should check. Vague or unresolvable claims will simply come back
          <strong> UNRESOLVED</strong> and refund everyone — precision is in your interest.
        </p>

        <form className="card form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Title</span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ETH above $5,000 by Jan 1"
              maxLength={140}
            />
            {errors.title && <span className="field__error">{errors.title}</span>}
          </label>

          <label className="field">
            <span className="field__label">Resolution statement</span>
            <textarea
              className="input textarea"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Write the exact question a validator must answer YES or NO. Be specific about the metric, source, and deadline."
              rows={4}
              maxLength={600}
            />
            <span className="field__hint">{statement.length}/600</span>
            {errors.statement && <span className="field__error">{errors.statement}</span>}
          </label>

          <div className="field">
            <span className="field__label">Category</span>
            <div className="chip-select">
              {Object.entries(CATEGORIES).map(([key, meta]) => (
                <button
                  type="button"
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

          <div className="field">
            <span className="field__label">Evidence sources (1–{maxSources}, public https:// URLs)</span>
            {sources.map((src, i) => (
              <div className="source-row" key={i}>
                <input
                  className="input"
                  value={src}
                  onChange={(e) => updateSource(i, e.target.value)}
                  placeholder="https://…"
                />
                {sources.length > 1 && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeSource(i)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            {sources.length < maxSources && (
              <button type="button" className="btn btn--outline btn--sm" onClick={addSource}>
                + Add source
              </button>
            )}
            {errors.sources && <span className="field__error">{errors.sources}</span>}
          </div>

          <div className="field-grid">
            <div className="field">
              <span className="field__label">Staking closes in</span>
              <div className="chip-select">
                {DURATION_PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.hours}
                    className={`pill pill--sm ${closeHours === p.hours ? "pill--active" : ""}`}
                    onClick={() => setCloseHours(p.hours)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field__label">Resolution window after close</span>
              <div className="chip-select">
                {WINDOW_PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.hours}
                    className={`pill pill--sm ${windowHours === p.hours ? "pill--active" : ""}`}
                    onClick={() => setWindowHours(p.hours)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="btn btn--primary btn--lg form__submit" type="submit" disabled={submitting}>
            {submitting ? "Submitting to GenLayer…" : wallet.isConnected ? "Create claim" : "Connect wallet & create"}
          </button>
        </form>
      </div>
    </section>
  );
}
