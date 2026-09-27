# Deploying Veritas

Two independent deployments make up the app:

1. **The Intelligent Contract** (`contracts/veritas.py`) → GenLayer Studionet
2. **The frontend** (this Vite/React app) → Cloudflare Pages

Do them in that order — the frontend needs the deployed contract address.

---

## 1. Deploy the Intelligent Contract to Studionet

Studionet is GenLayer's hosted, zero-setup network at `studio.genlayer.com` — no Docker,
no local validators, real LLM + web execution. It has a built-in faucet.

### Option A — GenLayer CLI (recommended)

```bash
npm install -g genlayer

# Point the CLI at Studionet (this is already the default target for `genlayer deploy`
# once selected — see `genlayer network list` for every available network)
genlayer network set studionet

# Fund your CLI account from the built-in faucet if this is a fresh account
genlayer account
# → open studio.genlayer.com, use the 💧 faucet button for the printed address

# Deploy. The constructor takes one argument: the treasury address that
# accrues the (adjustable, capped at 5%) protocol fee.
genlayer deploy --contract contracts/veritas.py --args "0xYourTreasuryAddress"
```

The command prints a **Contract Address** — copy it.

### Option B — GenLayer Studio (browser, no CLI)

1. Open <https://studio.genlayer.com>.
2. **Contracts → New Contract → Add From File**, upload `contracts/veritas.py`.
3. Open it, click **Run and Debug**, fill the constructor's `treasury_address` field with
   any `0x…` address you control, and deploy.
4. Copy the contract address shown after deployment.

### Verify it deployed correctly

```bash
genlayer call <CONTRACT_ADDRESS> get_protocol_policy
```

You should get back a JSON blob with `"protocolVersion": "VERITAS_V1"`.

> Studio state can reset between sessions/releases. If your claims disappear after a
> Studio maintenance window, that's Studio's state resetting, not a contract bug — redeploy
> and update `contractAddress` in `public/config.js` again. For anything you want to persist,
> move to `testnetAsimov` or `testnetBradbury` (see [Networks](https://docs.genlayer.com/developers/networks)) — the constructor and
> ABI are identical, only `chain` in `public/config.js` needs to change.

---

## 2. Point the frontend at your contract

Edit `public/config.js`:

```js
window.VERITAS_CONFIG = {
  contractAddress: "0xPasteYourDeployedAddressHere",
  chain: "studionet",
  explorerUrl: "https://explorer-studio.genlayer.com",
  studioUrl: "https://studio.genlayer.com",
  stateStatus: "accepted",
  protocolVersion: "VERITAS_V1",
};
```

This file is loaded at runtime (`<script src="/config.js">` in `index.html`), **not** bundled
by Vite — you can edit it after every deploy without rebuilding.

---

## 3. Run it locally

```bash
npm install
npm run dev
```

Open the printed `localhost` URL, install a browser wallet (MetaMask or similar) if you don't
have one, connect, and create your first claim.

---

## 4. Deploy the frontend to Cloudflare Pages

### Option A — Git integration (recommended for ongoing development)

1. Push this repository to GitHub/GitLab.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repo. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. Cloudflare rebuilds on every push automatically.
5. To point at a new contract later, just edit `public/config.js` and push — no rebuild of
   application code required, though Cloudflare will still redeploy the static file.

`public/_redirects` and `public/_headers` are picked up automatically by Cloudflare Pages —
they configure SPA fallback routing and cache headers respectively.

### Option B — Wrangler CLI (fastest one-off deploy)

```bash
npm install
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name=veritas
```

(`npm run deploy` runs both steps in one command once you've logged in once.)

### Option C — GitHub Actions (included)

`.github/workflows/deploy.yml` deploys to Cloudflare Pages on every push to `main`. Add two
repository secrets first:

- `CLOUDFLARE_API_TOKEN` — a token with **Cloudflare Pages: Edit** permission
- `CLOUDFLARE_ACCOUNT_ID` — found in the Cloudflare dashboard sidebar

---

## Moving beyond Studionet

Studionet is perfect for building and demoing. When you want durable state and real economic
stakes, redeploy the *same, unmodified* contract to a public testnet:

```bash
genlayer network set testnet-asimov   # or testnet-bradbury
genlayer deploy --contract contracts/veritas.py --args "0xYourTreasuryAddress"
```

Then update `chain` and `explorerUrl` in `public/config.js` to match
(`testnetAsimov` / `testnetBradbury`, see `genlayer network info` for exact explorer URLs).
Nothing else changes — the frontend and contract are network-agnostic by design.
