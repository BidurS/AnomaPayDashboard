# Gnoma Multichain Explorer

## 🚀 Gnoma Explorer

**Live Frontend:** [https://anomapay-explorer.pages.dev](https://anomapay-explorer.pages.dev)
**Live API:** [https://anomapay-explorer.bidurandblog.workers.dev](https://anomapay-explorer.bidurandblog.workers.dev)

A Swiss-design inspired analytics dashboard for the **Anoma Protocol** on Base. This explorer goes beyond simple transaction counting by indexing the cryptographic state of the protocol.

## 🌟 Key Features

### 🛡️ State-Aware Privacy Pulse
Tracks the **Commitment Tree** state roots (`0x...`) directly from the protocol. Instead of estimating volume, we visualize the actual growth of the anonymity set, providing a true heartbeat of the privacy layer.

### 🧠 Intent Intelligence
Deeply indexes protocol payloads to classify user actions:
- **Resource**: Creation of new shielded resources (notes).
- **Discovery**: Intent discovery and solving operations.
- **Application**: Direct interactions with privacy-preserving dApps.
- **External**: Bridging and cross-chain operations.

### ⚡ Smart Indexing (v2.3)
- **High Precision**: Stores raw `BigInt` values to prevent data overflow on 18-decimal tokens.
- **Deep Blobs**: Fully indexes intent payloads including raw hex data for offline analysis.
- **Multi-Asset**: Track flows for any ERC20 entering the shielded pool.
- **Self-Healing**: Automatically picks up from the last synced block.

## Stack

- **Backend**: Cloudflare Workers (TypeScript) + D1 Database
- **Decoding**: `viem` for reliable event parsing
- **Frontend**: React + Vite + Tailwind CSS (Swiss Style)
- **Infrastructure**: Fully serverless, edge-deployed

## Quick Start

### 1. Develop Locally
```bash
# Start Backend (Worker)
npm run dev

# Start Frontend (Vite)
cd frontend
npm run dev
```

### 2. Database Migration (Critical)
If you are updating from an older version, you must apply the new schema (v2.3 uses TEXT for monetary values):

```bash
# Local
npm run db:migrate:local

# Production
npm run db:migrate
```

### 3. Deploy Everything
We have an automated script to deploy both the Cloudflare Worker and Pages frontend:

```bash
./deploy_all.sh
```

## API Endpoints (v2.3)

### Public
- `GET /api/chains` - List enabled chains
- `GET /api/stats` - Network-wide stats (Volume, Solvers, Intents)
- `GET /api/latest-transactions` - Recent intents with **Payload Types** and Blobs
- `GET /api/privacy-stats` - Commitment tree roots and pool size history
- `GET /api/solvers` - Solver leaderboard (TX Count & Volume)
- `GET /api/network-health` - Pool TVL (Raw Units) and Activity

### Admin (requires `X-Admin-Key`)
- `POST /api/admin/backfill` - Sync historical blocks
- `POST /api/admin/sync` - Trigger manual sync
- `POST /api/admin/import` - Bulk upload JSON batches from local indexer

## License

MIT