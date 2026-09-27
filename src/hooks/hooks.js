import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachWalletClient,
  detachWalletClient,
  getNetworkLabel,
  isTargetChainId,
  readChainId,
  switchToNetwork,
} from "../lib/genlayer.js";
import {
  discoverWallets,
  getActiveProvider,
  setActiveProvider,
  subscribeToWallets,
} from "../lib/eip6963.js";

// Remembers which wallet (by EIP-6963 rdns) to auto-reconnect to.
const SELECTED_WALLET_KEY = "veritas_wallet_rdns";
// Set when the person clicks Disconnect, so we do NOT silently reconnect on
// the next page load even though the wallet still has permission.
const DISCONNECT_FLAG = "veritas_wallet_disconnected";

// localStorage can throw (private mode, blocked storage) - never let that
// take the wallet flow down.
function store(action, key, value) {
  try {
    if (typeof window === "undefined") return null;
    if (action === "get") return window.localStorage.getItem(key);
    if (action === "set") window.localStorage.setItem(key, value);
    if (action === "remove") window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
  return null;
}

function describeWalletError(err, fallback) {
  if (err?.code === 4001) return "Request cancelled in your wallet.";
  if (err?.code === -32002) {
    return "A request is already pending in your wallet — open the extension to continue.";
  }
  return err?.message || fallback;
}

// Fires `visible = true` once the element scrolls into view, then stays true
// (one-shot reveal — matches the "fade/slide up on scroll" pattern used
// throughout the marketing surface without re-triggering on scroll-up).
export function useReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px", ...options }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, visible];
}

// Animates a number from 0 (or its previous value) up to `target` using an
// eased requestAnimationFrame loop — used for the live stats bar.
export function useCountUp(target, durationMs = 1200) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(target) || 0;
    if (from === to) return undefined;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = from + (to - from) * eased;
      setDisplay(value);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return display;
}

// Re-renders every `intervalMs` so countdown strings tick down live without
// polling the chain.
export function useClockTick(intervalMs = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

let toastId = 0;
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, kind = "info", timeoutMs = 5200) => {
      const id = ++toastId;
      setToasts((current) => [...current, { id, message, kind }]);
      if (timeoutMs > 0) {
        setTimeout(() => dismiss(id), timeoutMs);
      }
      return id;
    },
    [dismiss]
  );

  return { toasts, push, dismiss };
}

/**
 * Wallet state for the whole app.
 *
 *  - EIP-6963 discovery -> `availableWallets`, so the person can pick which
 *    wallet to use instead of whichever grabbed `window.ethereum`.
 *  - The picked wallet is remembered and auto-reconnected on the next visit
 *    (unless the person disconnected on purpose).
 *  - `disconnect()` revokes this site's permission in the wallet itself, so
 *    the next connect shows a real consent prompt instead of silently
 *    re-approving the same account.
 *  - `switchAccount()` opens the wallet's own account picker.
 *  - The connect modal's open state lives here so any button in the app
 *    (navbar, an inline "connect wallet" call to action) can drive it.
 *  - The GenLayer contract write client (lib/genlayer.js) is rebuilt here
 *    whenever the connected account or active provider changes.
 */
export function useWallet() {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [selectedWalletRdns, setSelectedWalletRdns] = useState(null);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [initializing, setInitializing] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const chainOk = isTargetChainId(chainId);

  // -- live wallet discovery ---------------------------------------------
  useEffect(() => subscribeToWallets(setAvailableWallets), []);

  // -- keep the contract write client in sync with the connected wallet ---
  useEffect(() => {
    if (!address || !provider) {
      detachWalletClient();
      return;
    }
    attachWalletClient(provider, address);
  }, [address, provider]);

  // -- restore the previous session on load (no wallet popup) ------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // The person disconnected on purpose: stay disconnected.
      if (store("get", DISCONNECT_FLAG) === "true") {
        setInitializing(false);
        return;
      }

      let rdns = store("get", SELECTED_WALLET_KEY);
      if (rdns) {
        const wallets = await discoverWallets();
        const match = wallets.find((w) => w.info.rdns === rdns);
        if (match) {
          setActiveProvider(match.provider);
        } else {
          // That wallet is no longer installed - forget it.
          rdns = null;
          store("remove", SELECTED_WALLET_KEY);
        }
      }
      if (cancelled) return;

      const active = getActiveProvider();
      if (!active) {
        setInitializing(false);
        return;
      }

      try {
        // eth_accounts (not eth_requestAccounts): no popup, only returns an
        // account if the wallet already granted this site access.
        const accounts = await active.request({ method: "eth_accounts" });
        const id = await readChainId(active);
        if (cancelled) return;
        setProvider(active);
        setSelectedWalletRdns(rdns);
        setChainId(id);
        setAddress(accounts?.[0] ?? null);
      } catch {
        // Wallet not ready / locked - stay disconnected.
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // -- follow account / chain changes made inside the wallet --------------
  useEffect(() => {
    if (!provider?.on) return undefined;

    const onAccountsChanged = async (accounts) => {
      const next = accounts?.[0] ?? null;
      if (next) store("remove", DISCONNECT_FLAG);
      const id = await readChainId(provider);
      setAddress(next);
      if (id) setChainId(id);
      window.dispatchEvent(new CustomEvent("veritas:account-changed", { detail: next }));
    };
    const onChainChanged = (id) => setChainId(String(id));
    const onDisconnect = () => setAddress(null);

    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    provider.on("disconnect", onDisconnect);
    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
      provider.removeListener?.("disconnect", onDisconnect);
    };
  }, [provider]);

  // -- modal ----------------------------------------------------------------
  const openModal = useCallback(() => {
    setError(null);
    setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const clearError = useCallback(() => setError(null), []);

  // -- actions --------------------------------------------------------------
  /**
   * Pass an entry from `availableWallets` to connect to that specific
   * wallet (what the picker does). With no argument it uses whichever
   * provider is already active / `window.ethereum` (what the inline
   * "connect wallet" buttons elsewhere in the app do).
   */
  const connect = useCallback(async (walletDetail) => {
    // Guard against being wired straight to onClick (which passes an event).
    const detail = walletDetail?.info && walletDetail?.provider ? walletDetail : null;
    const target = detail ? detail.provider : getActiveProvider();

    if (!target) {
      const err = new Error(
        "No wallet extension detected. Install MetaMask (or another EIP-1193 wallet) to stake, create claims, or collect winnings."
      );
      setError(err.message);
      throw err;
    }

    setConnecting(true);
    setError(null);
    try {
      const accounts = await target.request({ method: "eth_requestAccounts" });
      if (!accounts?.[0]) throw new Error("No account returned by wallet.");

      // Only now commit the choice, so cancelling the popup leaves nothing
      // half-selected.
      if (detail) {
        setActiveProvider(detail.provider);
        store("set", SELECTED_WALLET_KEY, detail.info.rdns);
      }
      store("remove", DISCONNECT_FLAG);

      const switched = await switchToNetwork(target);
      const id = await readChainId(target);

      setProvider(target);
      if (detail) setSelectedWalletRdns(detail.info.rdns);
      setChainId(id);
      setAddress(accounts[0]);

      if (switched) {
        setModalOpen(false);
      } else {
        setError(`Connected, but your wallet is not on GenLayer ${getNetworkLabel()}. Switch network to continue.`);
      }
      return accounts[0];
    } catch (err) {
      const message = describeWalletError(err, "Failed to connect wallet.");
      setError(message);
      throw new Error(message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const active = getActiveProvider();
    if (active) {
      try {
        await active.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // Not every wallet implements revocation - local disconnect below
        // still works, it just won't force a fresh prompt on that wallet.
      }
    }

    setActiveProvider(null);
    store("remove", SELECTED_WALLET_KEY);
    store("set", DISCONNECT_FLAG, "true");

    detachWalletClient();
    setProvider(null);
    setSelectedWalletRdns(null);
    setAddress(null);
    setChainId(null);
    setError(null);
    setModalOpen(false);
  }, []);

  const switchAccount = useCallback(async () => {
    const active = getActiveProvider();
    if (!active) return null;

    setSwitching(true);
    setError(null);
    try {
      // Shows the wallet's own account picker even when already connected.
      await active.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await active.request({ method: "eth_accounts" });
      if (!accounts?.[0]) throw new Error("No account selected.");
      setAddress(accounts[0]);
      return accounts[0];
    } catch (err) {
      setError(describeWalletError(err, "Failed to switch account."));
      return null;
    } finally {
      setSwitching(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const active = getActiveProvider();
    if (!active) return;

    setSwitching(true);
    setError(null);
    try {
      const ok = await switchToNetwork(active);
      const id = await readChainId(active);
      if (id) setChainId(id);
      if (!ok) setError(`Switch your wallet to GenLayer ${getNetworkLabel()} to continue.`);
    } finally {
      setSwitching(false);
    }
  }, []);

  return {
    address,
    chainId,
    chainOk,
    connected: Boolean(address && chainOk),
    wrongNetwork: Boolean(address && !chainOk),
    // Kept for the rest of the app, which only ever cared about "is there
    // an address at all" (staking/claiming still works off-network; it's
    // the wallet UI's job to nudge toward the right chain).
    isConnected: Boolean(address),

    initializing,
    connecting,
    switching,
    error,
    clearError,

    availableWallets,
    selectedWalletRdns,
    // Either an EIP-6963 wallet announced itself, or a legacy injected one exists.
    hasWallet: availableWallets.length > 0 || Boolean(getActiveProvider()),

    modalOpen,
    openModal,
    closeModal,

    connect,
    disconnect,
    switchAccount,
    switchNetwork,
  };
}
