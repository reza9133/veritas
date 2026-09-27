export function VeritasMark({ size = 36, animated = false, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`veritas-mark ${animated ? "veritas-mark--animated" : ""} ${className}`}
      role="img"
      aria-label="Veritas"
    >
      <defs>
        <linearGradient id="vMarkViolet" x1="32" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="vMarkCyan" x1="32" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="vMarkGold" x1="32" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="vMarkGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g style={{ mixBlendMode: "screen" }}>
        <path className="veritas-petal veritas-petal--1" d="M32,32 C20,26 16,12 32,4 C48,12 44,26 32,32 Z" fill="url(#vMarkViolet)" fillOpacity="0.92" />
        <path className="veritas-petal veritas-petal--2" d="M32,32 C20,26 16,12 32,4 C48,12 44,26 32,32 Z" fill="url(#vMarkCyan)" fillOpacity="0.92" transform="rotate(120 32 32)" />
        <path className="veritas-petal veritas-petal--3" d="M32,32 C20,26 16,12 32,4 C48,12 44,26 32,32 Z" fill="url(#vMarkGold)" fillOpacity="0.92" transform="rotate(240 32 32)" />
      </g>
      <circle cx="32" cy="32" r="9" fill="url(#vMarkGlow)" />
      <circle cx="32" cy="32" r="3.1" fill="#0a0b14" />
      <circle cx="32" cy="32" r="1.5" fill="#ffffff" />
    </svg>
  );
}

export function VeritasWordmark({ size = "md", withMark = true, className = "" }) {
  return (
    <span className={`wordmark wordmark--${size} ${className}`}>
      {withMark && <VeritasMark size={size === "lg" ? 44 : size === "sm" ? 26 : 34} />}
      <span className="wordmark__text">VERITAS</span>
    </span>
  );
}

// The official GenLayer mark, embedded verbatim and set to currentColor so it
// can be tinted to match light or dark surfaces via CSS `color`.
export function GenLayerMark({ height = 18, className = "" }) {
  const width = (385.32 / 91.93) * height;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 385.32 91.93"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="GenLayer"
    >
      <path d="M296.72,79.83v-6.28h7.17l2.69-6.54-13.82-31.49h8.28l9.49,22.42h.26l9.18-22.42h7.96l-13.55,31.65-5.31,12.66h-12.36Z" />
      <path d="M106.14,46.33c0-13.83,8.72-22.96,22.42-22.96,11.51,0,19.01,6.2,19.76,15.19h-7.36c-1.29-5.38-5.31-8.45-9.2-8.45h-6.2c-6.34,0-11.99,7.15-11.99,16.08s5.79,15.94,12.54,15.94h4.57c5.04,0,8.99-3,10.63-6.2v-5.66h-10.97v-6.06h17.78v13.9c-2.73,5.31-8.86,10.77-19.62,10.77-13.56,0-22.35-8.31-22.35-22.55Z" />
      <path d="M153.44,51.78c0-10.42,6.95-17.17,17.1-17.17,9.61,0,16.01,5.86,16.01,17.51v1.64h-25.96c.68,4.97,3.82,8.86,8.52,8.86h2.93c3.68,0,6.06-2.25,6.81-5.11h7.09c-.89,6.54-6.27,11.38-15.6,11.38-10.77,0-16.9-7.22-16.9-17.1ZM179.33,48.31c-.34-4.57-3.54-7.43-7.02-7.43h-3.75c-3.75,0-6.75,2.93-7.7,7.43h18.46Z" />
      <path d="M191.68,34.61h17.85c8.04,0,12.74,4.57,12.74,12.95v20.37h-7.15v-19.15c0-4.7-2.38-7.49-5.79-7.49h-10.49v26.64h-7.15v-33.32Z" />
      <path d="M228.29,24.32h7.36v36.86h16.26v6.75h-23.62V24.32Z" />
      <path d="M253.95,51.71c0-10.08,6.54-17.1,15.88-17.1,4.84,0,8.79,2.25,10.9,4.84v-3.88h7.02v32.36h-7.02v-4.57c-2.45,3.13-6,5.52-11.11,5.52-9.4,0-15.67-7.02-15.67-17.17ZM269.15,62.48h4.29c4.02,0,7.09-3.41,7.09-7.84v-5.66c0-4.29-2.86-7.97-7.09-7.97h-4.29c-4.43,0-8.04,4.77-8.04,10.7s3.61,10.77,8.04,10.77Z" />
      <path d="M327.94,51.78c0-10.42,6.95-17.17,17.1-17.17,9.61,0,16.01,5.86,16.01,17.51v1.64h-25.96c.68,4.97,3.82,8.86,8.52,8.86h2.93c3.68,0,6.06-2.25,6.81-5.11h7.09c-.89,6.54-6.27,11.38-15.6,11.38-10.77,0-16.9-7.22-16.9-17.1ZM353.83,48.31c-.34-4.57-3.54-7.43-7.02-7.43h-3.75c-3.75,0-6.75,2.93-7.7,7.43h18.46Z" />
      <path d="M366.18,35.57h19.15v6.88h-11.99v25.48h-7.15v-32.36Z" />
      <polygon points="44.26 32.35 27.72 67.12 43.29 74.9 0 91.93 44.26 0 44.26 32.35" />
      <polygon points="53.5 32.35 70.04 67.12 54.47 74.9 97.76 91.93 53.5 0 53.5 32.35" />
      <polygon points="48.64 43.78 58.33 62.94 48.64 67.69 39.47 62.92 48.64 43.78" />
    </svg>
  );
}

export function GenLayerBadge({ className = "" }) {
  return (
    <a
      className={`genlayer-badge ${className}`}
      href="https://www.genlayer.com"
      target="_blank"
      rel="noreferrer"
    >
      <span className="genlayer-badge__label">Adjudicated on</span>
      <GenLayerMark height={15} className="genlayer-badge__mark" />
    </a>
  );
}
