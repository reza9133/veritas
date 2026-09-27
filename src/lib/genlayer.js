import { createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";

const CHAINS = { localnet, studionet, testnetAsimov, testnetBradbury };

function getConfig() {
  const cfg = typeof window !== "undefined" ? window.VERITAS_CONFIG : null;
  if (!cfg) {
    throw new Error("Veritas config missing — public/config.js did not load.");
  }
  return cfg;
}

function getChain() {
  const cfg = getConfig();
  const chain = CHAINS[cfg.chain];
  if (!chain) {
    throw new Error(`Unknown chain "${cfg.chain}" in config.js. Use one of: ${Object.keys(CHAINS).join(", ")}`);
  }
  return chain;
}

export function getContractAddress() {
  return getConfig().contractAddress;
}

export function isContractConfigured() {
  const addr = getContractAddress();
  return typeof addr === "string" && /^0x[0-9a-fA-F]{40}$/.test(addr) && addr !== "0x0000000000000000000000000000000000000000";
}

export function getStateStatus() {
  return getConfig().stateStatus === "finalized" ? "finalized" : "accepted";
}

export function getExplorerTxUrl(txId) {
  const cfg = getConfig();
  return `${cfg.explorerUrl.replace(/\/$/, "")}/tx/${txId}`;
}

export function getExplorerContractUrl() {
  const cfg = getConfig();
  return `${cfg.explorerUrl.replace(/\/$/, "")}/address/${getContractAddress()}`;
}

// ---------------------------------------------------------------------------
// Wallet discovery (EIP-1193, with basic multi-provider support)
// ---------------------------------------------------------------------------

function discoverProviders() {
  if (typeof window === "undefined" || !window.ethereum) return [];
  const injected = window.ethereum;
  if (Array.isArray(injected.providers) && injected.providers.length > 0) {
    return injected.providers;
  }
  return [injected];
}

export function hasInjectedWallet() {
  return discoverProviders().length > 0;
}

function pickProvider() {
  const providers = discoverProviders();
  if (providers.length === 0) return null;
  const metamask = providers.find((p) => p.isMetaMask);
  return metamask || providers[0];
}

function walletErrorCode(err) {
  if (!err || typeof err !== "object") return undefined;
  if (typeof err.code === "number") return err.code;
  return walletErrorCode(err.cause);
}

// Mirrors the network the wallet is on with the target GenLayer chain,
// adding it first if the wallet has never seen it (studionet / testnets are
// rarely pre-installed in a fresh MetaMask).
async function ensureWalletNetwork(provider, chain) {
  const chainIdHex = `0x${chain.id.toString(16)}`;
  const current = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (current === chainIdHex) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
    return;
  } catch (err) {
    const missing = walletErrorCode(err) === 4902 || /unrecognized|unknown chain|not added/i.test(String(err?.message || ""));
    if (!missing) throw err;
  }
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: chainIdHex,
        chainName: chain.name,
        rpcUrls: [...(chain.rpcUrls?.default?.http || [])],
        nativeCurrency: chain.nativeCurrency,
        blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : [],
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Client management
// ---------------------------------------------------------------------------

let readClient = null;
let writeClient = null;
let connectedAddress = null;
let activeProvider = null;

export function getReadClient() {
  if (!readClient) {
    readClient = createClient({ chain: getChain() });
  }
  return readClient;
}

export function getConnectedAddress() {
  return connectedAddress;
}

export async function connectWallet() {
  const provider = pickProvider();
  if (!provider) {
    throw new Error("No wallet extension detected. Install MetaMask (or another EIP-1193 wallet) to stake, create claims, or collect winnings.");
  }
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("Wallet connection was rejected.");
  }
  const address = accounts[0];
  const chain = getChain();
  const cfg = getConfig();

  await ensureWalletNetwork(provider, chain);

  const client = createClient({ chain, account: address, provider });
  if (cfg.chain === "studionet") {
    try {
      await client.connect("studionet");
    } catch (err) {
      console.warn("[veritas] client.connect warning:", err);
    }
  }

  writeClient = client;
  connectedAddress = address;
  activeProvider = provider;

  provider.on?.("accountsChanged", (next) => {
    connectedAddress = next && next.length > 0 ? next[0] : null;
    window.dispatchEvent(new CustomEvent("veritas:account-changed", { detail: connectedAddress }));
  });
  provider.on?.("chainChanged", () => {
    window.dispatchEvent(new CustomEvent("veritas:chain-changed"));
  });

  return address;
}

export function disconnectWallet() {
  if (activeProvider?.removeAllListeners) {
    try {
      activeProvider.removeAllListeners("accountsChanged");
      activeProvider.removeAllListeners("chainChanged");
    } catch {
      /* best effort */
    }
  }
  writeClient = null;
  connectedAddress = null;
  activeProvider = null;
}

function requireWriteClient() {
  if (!writeClient || !connectedAddress) {
    throw new Error("Connect a wallet first.");
  }
  return writeClient;
}

// ---------------------------------------------------------------------------
// Contract reads
// ---------------------------------------------------------------------------

export async function readContract(functionName, args = []) {
  const client = getReadClient();
  return client.readContract({
    address: getContractAddress(),
    functionName,
    args,
    transactionHashVariant:
      getStateStatus() === "finalized" ? TransactionHashVariant.LATEST_FINAL : TransactionHashVariant.LATEST_NONFINAL,
  });
}

export async function readJson(functionName, args = []) {
  const raw = await readContract(functionName, args);
  if (raw === null || raw === undefined || raw === "null") return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Contract writes + transaction lifecycle
//
// Studionet's live consensus contracts predate the "resolutionAction: Finalize"
// lifecycle API described for the newer Consensus v0.6 line, so this polls the
// plain transaction status the way a real, deployed GenLayer dApp does today
// rather than assuming SDK helpers (waitForDecision/isSuccessful) that may not
// exist yet on this network's client build.
// ---------------------------------------------------------------------------

const TERMINAL_FAILURE_STATUSES = new Set(["UNDETERMINED", "CANCELED"]);
const ACCEPTABLE_DECIDED_STATUSES = new Set(["ACCEPTED", "READY_TO_FINALIZE", "FINALIZED"]);
const GOOD_CONSENSUS_RESULTS = new Set(["AGREE", "MAJORITY_AGREE"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntilDecided(client, hash, { attempts = 200, intervalMs = 4000 } = {}) {
  let transientFailures = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let tx;
    try {
      tx = await client.getTransaction({ hash });
      transientFailures = 0;
    } catch (err) {
      transientFailures += 1;
      if (transientFailures > 8) throw err;
      await sleep(intervalMs);
      continue;
    }
    const status = tx.statusName || String(tx.status || "UNINITIALIZED");
    const execution = tx.txExecutionResultName || "NOT_VOTED";
    if (TERMINAL_FAILURE_STATUSES.has(status)) {
      const error = new Error(`${status}: transaction ended before successful execution (${execution}).`);
      error.txId = hash;
      throw error;
    }
    if (ACCEPTABLE_DECIDED_STATUSES.has(status) && execution !== "NOT_VOTED") {
      return tx;
    }
    await sleep(intervalMs);
  }
  const timeout = new Error("Transaction did not reach consensus in time. It may still resolve — check the explorer.");
  timeout.txId = hash;
  throw timeout;
}

// The single entry point every write flow in the UI should use: submit,
// poll for a decided status, and translate a failed or disagreeing
// execution into one friendly error that still carries the tx id so the
// caller can link to the explorer.
export async function submitTransaction(functionName, args = [], value = 0n) {
  const client = requireWriteClient();
  const params = {
    address: getContractAddress(),
    functionName,
    args,
    value,
    consensusMaxRotations: 5,
  };

  const txId = await client.writeContract(params);
  const tx = await pollUntilDecided(client, txId);

  const executionResult = tx.txExecutionResultName || "NOT_VOTED";
  if (executionResult !== "FINISHED_WITH_RETURN") {
    const error = new Error(`${executionResult}: contract execution did not succeed. Open it in the explorer for the full trace.`);
    error.txId = txId;
    throw error;
  }

  const consensusResult = tx.resultName;
  if (consensusResult && !GOOD_CONSENSUS_RESULTS.has(consensusResult)) {
    const error = new Error(`CONSENSUS_${consensusResult}: validators did not reach agreement. Try again.`);
    error.txId = txId;
    throw error;
  }

  return { txId, tx };
}

// ---------------------------------------------------------------------------
// Formatting helpers shared across the wallet layer
// ---------------------------------------------------------------------------

export function shortenAddress(address, size = 4) {
  if (!address) return "";
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`;
}

export function toAtto(genAmount) {
  const [whole, frac = ""] = String(genAmount).trim().split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  const cleanWhole = whole.replace(/[^0-9]/g, "") || "0";
  return BigInt(cleanWhole) * 10n ** 18n + BigInt(fracPadded || "0");
}
