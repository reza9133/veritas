// Veritas runtime configuration.
// Edit this file after you deploy the Intelligent Contract — no rebuild required,
// Cloudflare Pages serves it as a static file straight from /public.
window.VERITAS_CONFIG = {
  // Fill in the address printed by `genlayer deploy` (see DEPLOY.md).
  contractAddress: "0x912A70aE17b8747f393F6B1CDdb8ea2888f05806",

  // "studionet" (default, hosted at studio.genlayer.com, zero setup) or
  // "testnetAsimov" / "testnetBradbury" if you move to a public testnet later.
  chain: "studionet",

  explorerUrl: "https://explorer-studio.genlayer.com",
  studioUrl: "https://studio.genlayer.com",

  // Read state that has at least reached consensus acceptance (fast).
  // Set to "finalized" for stricter, appeal-safe reads once your market has real value at stake.
  stateStatus: "accepted",

  protocolVersion: "VERITAS_V1"
};
