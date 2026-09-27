import { useEffect, useRef, useState } from "react";
import { shortenAddress } from "../../lib/genlayer.js";
import { CheckIcon, CopyIcon } from "./icons.jsx";

/**
 * Address with optional copy-to-clipboard. `full` shows the whole address
 * (wrapping) instead of the shortened form.
 */
export default function AddressDisplay({ address, full = false, showCopy = false, className = "" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!address) return <span className={className}>—</span>;

  async function handleCopy(event) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked - the full address is selectable in the modal anyway.
    }
  }

  return (
    <span className={`wallet-address ${className}`} title={address}>
      <code className={`mono ${full ? "wallet-address__full" : ""}`}>
        {full ? address : shortenAddress(address)}
      </code>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="wallet-address__copy"
          aria-label={copied ? "Address copied" : "Copy address"}
        >
          {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
        </button>
      )}
    </span>
  );
}
