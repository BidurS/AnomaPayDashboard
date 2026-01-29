# AnomaPay Multichain Explorer

A serverless, multichain-ready indexer and analytics dashboard for tracking intents settled via the Anoma Protocol Adapter.

## Stack

- **Backend**: Cloudflare Workers (TypeScript) + D1 Database
- **Indexer**: Cron-triggered event syncing via `eth_getLogs`
- **Frontend**: React + Vite + Tailwind CSS (coming soon)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create D1 Database
```bash
npm run db:create
```
Copy the `database_id` from the output and paste it into `wrangler.toml`.

### 3. Run Database Migration
```bash
npm run db:migrate
```

### 4. Set Admin API Key (Optional)
```bash
wrangler secret put ADMIN_API_KEY
```

### 5. Update RPC URL
Edit the Base chain entry in D1 to use your Alchemy API key:
```bash
wrangler d1 execute anomapay-db --command "UPDATE chains SET rpc_url = 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY' WHERE id = 8453"
```

### 6. Deploy
```bash
npm run deploy
```

## API Endpoints

### Public
- `GET /api/chains` - List enabled chains
- `GET /api/stats?chainId=8453` - Get chain stats
- `GET /api/latest-transactions?chainId=8453` - Recent transactions

### Admin (requires `X-Admin-Key` header)
- `GET /api/admin/chains` - List all chains
- `POST /api/admin/chains` - Add new chain
- `PUT /api/admin/chains/:id` - Update chain
- `DELETE /api/admin/chains/:id` - Delete chain

## Adding a New Chain

```bash
curl -X POST https://your-worker.workers.dev/api/admin/chains \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-secret" \
  -d '{
    "id": 1,
    "name": "Ethereum",
    "rpc_url": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
    "contract_address": "0x...",
    "start_block": 19000000,
    "explorer_url": "https://etherscan.io",
    "icon": "Ξ"
  }'
```

## License

MIT
