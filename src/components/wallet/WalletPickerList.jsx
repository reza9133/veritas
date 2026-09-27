import { ChevronRightIcon } from "./icons.jsx";

/**
 * One button per wallet discovered via EIP-6963, so connecting is an
 * explicit choice. Falls back to a single generic "Connect wallet" button
 * when nothing has announced itself (older extensions without EIP-6963)
 * and uses `window.ethereum` directly in that case.
 */
export default function WalletPickerList({ wallets, onSelect, onFallbackConnect, disabled = false }) {
  if (wallets.length === 0) {
    return (
      <button
        type="button"
        onClick={onFallbackConnect}
        disabled={disabled}
        className="btn btn--primary btn--lg"
      >
        Connect wallet
      </button>
    );
  }

  return (
    <div className="wallet-picker-list">
      {wallets.map((wallet) => (
        <button
          key={wallet.info.uuid}
          type="button"
          onClick={() => onSelect(wallet)}
          disabled={disabled}
          className="wallet-picker-item"
        >
          {wallet.info.icon && <img src={wallet.info.icon} alt="" className="wallet-picker-item__icon" />}
          <span className="wallet-picker-item__name">{wallet.info.name}</span>
          <ChevronRightIcon className="wallet-picker-item__chevron" />
        </button>
      ))}
    </div>
  );
}
