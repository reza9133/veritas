import { useCallback, useEffect, useRef, useState } from "react";
import { connectWallet, disconnectWallet, getConnectedAddress, hasInjectedWallet } from "../lib/genlayer.js";

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

export function useWallet() {
  const [address, setAddress] = useState(getConnectedAddress());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    function onChanged(event) {
      setAddress(event.detail || null);
    }
    window.addEventListener("veritas:account-changed", onChanged);
    return () => window.removeEventListener("veritas:account-changed", onChanged);
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      return addr;
    } catch (err) {
      setError(err?.message || String(err));
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setAddress(null);
  }, []);

  return {
    address,
    connecting,
    error,
    connect,
    disconnect,
    hasWallet: hasInjectedWallet(),
    isConnected: Boolean(address),
  };
}
