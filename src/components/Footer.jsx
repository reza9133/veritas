import { VeritasWordmark, GenLayerBadge } from "./Logo.jsx";
import { getExplorerContractUrl, isContractConfigured } from "../lib/genlayer.js";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <VeritasWordmark size="sm" />
          <p className="footer__tagline">
            Truth, settled by consensus. No admins. No human oracle. Every outcome is verified by
            independent AI validators reading the public web — and only accepted when they agree.
          </p>
          <GenLayerBadge className="footer__genlayer" />
        </div>

        <div className="footer__cols">
          <div className="footer__col">
            <h4>Product</h4>
            <a href="#/">Markets</a>
            <a href="#/create">Create a claim</a>
            <a href="#/portfolio">Portfolio</a>
            <a href="#/how-it-works">How it works</a>
          </div>
          <div className="footer__col">
            <h4>GenLayer</h4>
            <a href="https://www.genlayer.com" target="_blank" rel="noreferrer">genlayer.com</a>
            <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">Documentation</a>
            <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer">GenLayer Studio</a>
            {isContractConfigured() && (
              <a href={getExplorerContractUrl()} target="_blank" rel="noreferrer">
                Contract on explorer
              </a>
            )}
          </div>
          <div className="footer__col">
            <h4>Protocol</h4>
            <span className="footer__meta">Pari-mutuel settlement</span>
            <span className="footer__meta">Optimistic Democracy consensus</span>
            <span className="footer__meta">Non-custodial by design</span>
          </div>
        </div>
      </div>
      <div className="container footer__legal">
        <span>© {new Date().getFullYear()} Veritas Protocol. Built on GenLayer.</span>
        <span>This is experimental software on a public testnet. Stake only what you can afford to lose.</span>
      </div>
    </footer>
  );
}
