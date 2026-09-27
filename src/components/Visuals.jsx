import { useMemo } from "react";

const NODE_POINTS = [
  [50, 12],
  [86.1, 38.3],
  [72.3, 80.7],
  [27.7, 80.7],
  [13.9, 38.3],
];

// The signature "many validators converge on one verdict" visualization.
// `state`: "idle" | "resolving" | "resolved-yes" | "resolved-no" | "void"
export function ConsensusOrbit({ state = "idle", size = 220, label }) {
  const centerFill =
    state === "resolved-yes"
      ? "var(--yes)"
      : state === "resolved-no"
      ? "var(--no)"
      : state === "void"
      ? "var(--muted-strong)"
      : "url(#orbitCenterGrad)";

  return (
    <div className={`consensus-orbit consensus-orbit--${state}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label={label || "Validator consensus"}>
        <defs>
          <radialGradient id="orbitCenterGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#7c3aed" />
          </radialGradient>
          <linearGradient id="orbitLineGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>

        {NODE_POINTS.map(([x, y], i) => (
          <line
            key={`line-${i}`}
            x1="50"
            y1="50"
            x2={x}
            y2={y}
            className="orbit-line"
            stroke="url(#orbitLineGrad)"
            strokeWidth="0.6"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}

        <circle cx="50" cy="50" r="13" className="orbit-center" fill={centerFill} />

        {state === "resolved-yes" && (
          <path d="M43,50 L48,56 L59,43" stroke="#04140c" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {state === "resolved-no" && (
          <path d="M43,43 L59,59 M59,43 L43,59" stroke="#210608" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        )}
        {state === "void" && (
          <line x1="42" y1="50" x2="58" y2="50" stroke="#0d0e1a" strokeWidth="3.4" strokeLinecap="round" />
        )}

        {NODE_POINTS.map(([x, y], i) => (
          <circle key={`node-${i}`} cx={x} cy={y} r="5.4" className="orbit-node" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </svg>
    </div>
  );
}

export function ParticleField({ count = 42, className = "" }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.4,
        duration: 14 + Math.random() * 18,
        delay: -(Math.random() * 20),
        drift: (Math.random() - 0.5) * 60,
      })),
    [count]
  );

  return (
    <div className={`particle-field ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export function OddsBar({ yesAtto, noAtto, size = "md" }) {
  const yes = Number(BigInt(yesAtto || "0"));
  const no = Number(BigInt(noAtto || "0"));
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 50;
  const noPct = 100 - yesPct;

  return (
    <div className={`odds-bar odds-bar--${size}`}>
      <div className="odds-bar__track">
        <div className="odds-bar__fill odds-bar__fill--yes" style={{ width: `${yesPct}%` }} />
        <div className="odds-bar__fill odds-bar__fill--no" style={{ width: `${noPct}%` }} />
      </div>
      <div className="odds-bar__labels">
        <span className="odds-bar__label odds-bar__label--yes">YES {yesPct}%</span>
        <span className="odds-bar__label odds-bar__label--no">NO {noPct}%</span>
      </div>
    </div>
  );
}

export function ConfettiBurst({ active, colors = ["#a78bfa", "#67e8f9", "#facc15", "#4ade80", "#f472b6"] }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        left: 46 + Math.random() * 8,
        color: colors[i % colors.length],
        x: (Math.random() - 0.5) * 320,
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.25,
        duration: 1.1 + Math.random() * 0.9,
        size: 5 + Math.random() * 6,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  );

  if (!active) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size * 0.4,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--x": `${p.x}px`,
            "--rot": `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
