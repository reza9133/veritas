import { useState } from "react";
import { VeritasWordmark } from "./Logo.jsx";
import { AccountPanel } from "./wallet/AccountPanel.jsx";

const LINKS = [
  { href: "#/", label: "Markets" },
  { href: "#/create", label: "Create" },
  { href: "#/portfolio", label: "Portfolio" },
  { href: "#/how-it-works", label: "How it works" },
];

export function Navbar({ route, wallet }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <a href="#/" className="navbar__brand" onClick={() => setOpen(false)}>
          <VeritasWordmark size="sm" />
        </a>

        <nav className={`navbar__links ${open ? "navbar__links--open" : ""}`}>
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`navbar__link ${route === link.href ? "navbar__link--active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <AccountPanel wallet={wallet} />
          <button
            className="navbar__burger"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
