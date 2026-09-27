import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "./components/Navbar.jsx";
import { Footer } from "./components/Footer.jsx";
import { Toasts } from "./components/Toasts.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ClaimDetailPage } from "./pages/ClaimDetailPage.jsx";
import { CreatePage } from "./pages/CreatePage.jsx";
import { PortfolioPage } from "./pages/PortfolioPage.jsx";
import { HowItWorksPage } from "./pages/HowItWorksPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { useToasts, useWallet } from "./hooks/hooks.js";
import { isContractConfigured, readJson } from "./lib/genlayer.js";
import { sameAddress } from "./lib/format.js";

function parseRoute(hash) {
  const clean = (hash || "#/").replace(/^#/, "") || "/";
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "claim" && parts[1]) return { name: "claim", id: parts[1] };
  if (parts[0] === "create") return { name: "create" };
  if (parts[0] === "portfolio") return { name: "portfolio" };
  if (parts[0] === "how-it-works") return { name: "how-it-works" };
  if (parts[0] === "admin") return { name: "admin" };
  return { name: "home" };
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const wallet = useWallet();
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    function onHashChange() {
      setHash(window.location.hash || "#/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const refresh = useCallback(async () => {
    if (!isContractConfigured()) {
      setLoading(false);
      return;
    }
    setLoadError(null);
    try {
      const [claimsResult, statsResult, policyResult] = await Promise.all([
        readJson("get_all_claims"),
        readJson("get_dashboard_stats"),
        readJson("get_protocol_policy"),
      ]);
      setClaims(Array.isArray(claimsResult) ? [...claimsResult].reverse() : []);
      setStats(statsResult);
      setPolicy(policyResult);
    } catch (err) {
      console.error("[veritas] failed to load contract state:", err);
      setLoadError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const route = useMemo(() => parseRoute(hash), [hash]);
  const navRoute = route.name === "home" ? "#/" : `#/${route.name === "claim" ? "" : route.name}`;

  // The contract owner is whoever `get_protocol_policy` reports as `owner` —
  // never assumed, always read live off-chain state, so this tracks a
  // transferred ownership (were that ever added) without a redeploy.
  const isOwner = sameAddress(wallet.address, policy?.owner);

  const shared = { claims, stats, policy, loading, loadError, refresh, wallet, toast: push };

  return (
    <div className="app-shell">
      <Navbar route={navRoute} wallet={wallet} isOwner={isOwner} />
      <main className="app-main">
        {route.name === "home" && <HomePage {...shared} />}
        {route.name === "claim" && <ClaimDetailPage {...shared} claimId={route.id} />}
        {route.name === "create" && <CreatePage {...shared} />}
        {route.name === "portfolio" && <PortfolioPage {...shared} />}
        {route.name === "how-it-works" && <HowItWorksPage {...shared} />}
        {route.name === "admin" && <AdminPage {...shared} isOwner={isOwner} />}
      </main>
      <Footer />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
