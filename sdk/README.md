# @anomascan/sdk

TypeScript SDK for the [AnomaScan](https://anomapay-explorer.pages.dev) multichain intent explorer API.

## Install

```bash
npm install @anomascan/sdk
```

## Quick Start

```typescript
import { AnomaScanClient } from '@anomascan/sdk';

const client = new AnomaScanClient({
  apiKey: 'ask_your_api_key', // optional for anonymous tier
});

// List recent intents
const intents = await client.intents.list({ chainId: 8453, limit: 10 });

// Get solver economics leaderboard
const economics = await client.solvers.economics({ chainId: 8453, days: 30 });

// AI-powered intent simulation
const sim = await client.intents.simulate({
  inputToken: '0xA0b8...', outputToken: '0x833...', amount: '1000000', chainId: 8453
});
```

## Agent Autonomy

Register and run autonomous solver agents:

```typescript
// Register an agent
const agent = await client.agents.register({
  name: 'ArbitrageBot',
  strategy: 'arbitrage',
  allowedChains: [8453, 1],
  maxDailySpend: 50,
});

// Execute an intent autonomously
const result = await client.agents.execute({
  agentId: agent.data!.id,
  chainId: 8453,
  intentType: 'swap',
  params: { inputToken: '0xA0b8...', outputToken: '0x833...', amount: '500000' },
  simulate: true, // dry-run first
});

// Check execution history
const history = await client.agents.history(agent.data!.id, 50);
console.log(`${history.data?.summary.succeeded}/${history.data?.summary.total} succeeded`);

// Lifecycle management
await client.agents.pause(agent.data!.id);
await client.agents.resume(agent.data!.id);
```

## Solver Economics

```typescript
// P&L leaderboard
const econ = await client.solvers.economics({ chainId: 8453 });
econ.data?.forEach(s => console.log(`${s.address}: ROI ${s.roiPercent}%`));

// Individual solver history
const history = await client.solvers.economicHistory('0x990c...c871', 8453);
```

## Real-time Streaming (Browser)

```typescript
const unsubscribe = client.stream.subscribe(
  (event) => console.log(`[${event.eventType}]`, event.payload),
  { types: ['intent_created', 'intent_settled'] }
);

// Stop listening
unsubscribe();
```

## Polling (Node.js)

```typescript
const events = await client.stream.getEvents(Date.now() / 1000 - 300);
```

## Rate Limits

| Tier | Req/min | Req/day | Price |
|------|---------|---------|-------|
| Anonymous | 30 | 1,000 | Free |
| Free (key) | 100 | 10,000 | Free |
| Pro | 500 | 100,000 | $29/mo |
| Enterprise | 2,000 | 1,000,000 | Contact |

Auto-retries on 429 with exponential backoff.

## API Reference

### `client.intents`
- `.list(params?)` — List intents with filtering
- `.get(id, chainId?)` — Intent detail with lifecycle
- `.lifecycle(id)` — Lifecycle events only
- `.simulation(id)` — AI simulation results
- `.simulate(params)` — Simulate a hypothetical intent

### `client.solvers`
- `.list(params?)` — Solver leaderboard
- `.get(address, chainId?)` — Solver profile
- `.economics(params?)` — P&L leaderboard
- `.economicHistory(address, chainId?)` — Daily economic data

### `client.analytics`
- `.volume(params?)` — Volume metrics over time
- `.crossChainFlows(params?)` — Cross-chain Sankey data
- `.aiInsights(params?)` — AI prediction analytics
- `.intentTypes(params?)` — Intent type distribution
- `.demandHeatmap(params?)` — Hot token pairs
- `.lifecycleFunnel(params?)` — Conversion funnel

### `client.agents`
- `.register(config)` — Register autonomous agent
- `.execute(params)` — Execute intent through agent
- `.status(agentId)` — Agent health data
- `.history(agentId, limit?)` — Execution log
- `.pause(agentId)` — Pause execution
- `.resume(agentId)` — Resume execution

### `client.developer`
- `.createKey(userId, name)` — Create API key
- `.listKeys(userId)` — List keys
- `.revokeKey(keyHash, userId)` — Revoke key
- `.getUsage(keyHash, days?)` — Usage analytics
- `.getCatalog()` — API reference data

### `client.stream`
- `.getEvents(since?, type?)` — Poll events
- `.subscribe(callback, options?)` — SSE (Browser)

## License

MIT
