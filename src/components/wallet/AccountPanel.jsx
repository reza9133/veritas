import { getNetworkLabel } from "../../lib/genlayer.js";
import Modal from "./Modal.jsx";
import AddressDisplay from "./AddressDisplay.jsx";
import WalletPickerList from "./WalletPickerList.jsx";
import {
  AlertIcon,
  ChevronDownIcon,
  ExternalIcon,
  LogOutIcon,
  UserIcon,
  WalletIcon,
} from "./icons.jsx";

const METAMASK_INSTALL_URL = "https://metamask.io/download/";
const NETWORK_LABEL = getNetworkLabel();

function Notice({ tone = "info", title, children }) {
  return (
    <div className={`wallet-notice wallet-notice--${tone}`}>
      {tone !== "info" && <AlertIcon className="wallet-notice__icon" />}
      <div className="wallet-notice__body">
        {title && <p className="wallet-notice__title">{title}</p>}
        <div className="wallet-notice__content">{children}</div>
      </div>
    </div>
  );
}

function InfoCard({ label, children }) {
  return (
    <div className="wallet-info-card">
      <p className="wallet-info-card__label">{label}</p>
      <div className="wallet-info-card__value">{children}</div>
    </div>
  );
}

/**
 * Navbar wallet control + the modal behind it.
 *  - disconnected: "Connect Wallet" button -> modal with the wallet picker
 *  - connected: address chip -> modal with wallet details, network status,
 *    switch account and disconnect
 */
export function AccountPanel({ wallet }) {
  const {
    address,
    chainOk,
    initializing,
    connecting,
    switching,
    error,
    hasWallet,
    availableWallets,
    selectedWalletRdns,
    modalOpen,
    openModal,
    closeModal,
    connect,
    disconnect,
    switchAccount,
    switchNetwork,
  } = wallet;

  const walletName =
    availableWallets.find((w) => w.info.rdns === selectedWalletRdns)?.info.name ?? "your wallet";

  const handlePick = (picked) => connect(picked).catch(() => {});
  const handleFallback = () => connect().catch(() => {});

  // -- not connected --------------------------------------------------------
  if (!address) {
    return (
      <>
        <button className="btn btn--primary btn--sm" onClick={openModal} disabled={initializing || connecting}>
          <WalletIcon />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>

        <Modal
          open={modalOpen}
          onClose={closeModal}
          title="Connect to GenLayer"
          description="Connect a wallet to create claims, stake, and collect winnings."
        >
          <div className="wallet-modal-stack">
            {!hasWallet ? (
              <>
                <Notice tone="warn" title="No wallet detected">
                  Install a wallet extension to continue — MetaMask is a good default if you
                  don&apos;t already have one.
                </Notice>
                <a href={METAMASK_INSTALL_URL} target="_blank" rel="noreferrer" className="btn btn--primary btn--lg">
                  <ExternalIcon />
                  Install MetaMask
                </a>
                <Notice>
                  After installing a wallet, refresh this page and click &quot;Connect Wallet&quot;
                  again.
                </Notice>
              </>
            ) : (
              <>
                <WalletPickerList
                  wallets={availableWallets}
                  onSelect={handlePick}
                  onFallbackConnect={handleFallback}
                  disabled={connecting}
                />

                {connecting && <p className="wallet-modal-waiting">Waiting for your wallet…</p>}

                {error && (
                  <Notice tone="error" title="Connection error">
                    {error}
                  </Notice>
                )}

                <Notice>
                  <p>Choosing a wallet will prompt it to:</p>
                  <ol className="wallet-notice__list">
                    <li>Connect your wallet to this app</li>
                    <li>Add the GenLayer {NETWORK_LABEL} network to your wallet</li>
                    <li>Switch to the {NETWORK_LABEL} network</li>
                  </ol>
                  <p>
                    Disconnecting always forgets this choice, so you can pick a different wallet
                    next time.
                  </p>
                </Notice>
              </>
            )}
          </div>
        </Modal>
      </>
    );
  }

  // -- connected --------------------------------------------------------------
  return (
    <>
      <button
        onClick={openModal}
        title="Wallet details"
        className={`wallet-chip ${chainOk ? "" : "wallet-chip--warn"}`}
      >
        <span
          className={`wallet-chip__dot ${chainOk ? "wallet-chip__dot--ok" : "wallet-chip__dot--warn"}`}
          aria-label={chainOk ? "Connected" : "Wrong network"}
        />
        <span className="mono">{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""}</span>
        <ChevronDownIcon width={14} height={14} />
      </button>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Wallet details"
        description={`Connected with ${walletName}`}
      >
        <div className="wallet-modal-stack">
          <InfoCard label="Your address">
            <AddressDisplay address={address} full showCopy />
          </InfoCard>

          <InfoCard label="Network status">
            <div className="wallet-network-status">
              <span className={`wallet-chip__dot ${chainOk ? "wallet-chip__dot--ok" : "wallet-chip__dot--warn"}`} />
              <span>{chainOk ? `Connected to GenLayer ${NETWORK_LABEL}` : "Wrong network"}</span>
            </div>
          </InfoCard>

          {!chainOk && (
            <Notice tone="warn" title="Network warning">
              <p>
                You&apos;re not on GenLayer {NETWORK_LABEL}. Sending a transaction from the wrong
                network would use that network&apos;s own currency instead of GEN.
              </p>
              <button className="btn btn--primary btn--sm" onClick={switchNetwork} disabled={switching}>
                {switching ? "Switching…" : "Switch network"}
              </button>
            </Notice>
          )}

          {error && (
            <Notice tone="error" title="Error">
              {error}
            </Notice>
          )}

          <div className="wallet-modal-actions">
            <button className="btn btn--outline btn--lg" onClick={switchAccount} disabled={switching}>
              <UserIcon />
              {switching ? "Switching…" : "Switch account"}
            </button>
            <button
              className="btn btn--outline btn--lg wallet-disconnect-btn"
              onClick={disconnect}
              disabled={switching}
            >
              <LogOutIcon />
              Disconnect wallet
            </button>
          </div>

          <Notice>
            Use &quot;Switch account&quot; to select a different account in {walletName}. Use
            &quot;Disconnect&quot; to remove this site from your wallet.
          </Notice>
        </div>
      </Modal>
    </>
  );
}
