import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons.jsx";

/**
 * Minimal accessible dialog: Esc / overlay click to close, locks page
 * scroll while open, restores focus on close.
 *
 * Rendered through a portal into <body> on purpose - the sticky navbar
 * uses backdrop-filter, which turns it into the containing block for any
 * `position: fixed` child, so a modal rendered inside it would be clipped
 * to the navbar instead of covering the screen.
 *
 * No animation library here (Veritas doesn't ship framer-motion) - open /
 * close are driven by a plain CSS class + transition, with the panel kept
 * mounted for one extra tick on close so the exit transition can play.
 */
export default function Modal({ open, onClose, title, description, children }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 180);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !mounted) return null;

  return createPortal(
    <div className={`wallet-modal ${visible ? "wallet-modal--visible" : ""}`}>
      <div className="wallet-modal__overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="wallet-modal__panel"
      >
        <button className="wallet-modal__close" onClick={onClose} aria-label="Close">
          <XIcon />
        </button>

        <h2 id={titleId} className="wallet-modal__title">
          {title}
        </h2>
        {description && <p className="wallet-modal__description">{description}</p>}

        <div className="wallet-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
