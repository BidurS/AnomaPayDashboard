# AnomaScan: Multi-Chain Observability & AI Reasoning Platform
## Full Execution Roadmap — From Gnoma Explorer to Ecosystem Intelligence

> **Project**: Gnoma Explorer → AnomaScan
> **Live**: https://anomapay-explorer.pages.dev
> **Author**: Bidur | **Date**: March 2026
> **Goal**: Transform a single-chain intent explorer into the **definitive multi-chain Anoma ecosystem observability platform** with AI-powered solver intelligence.

---

## Table of Contents
1. [Current State Analysis](#1-current-state-analysis)
2. [Strategic Vision](#2-strategic-vision)
3. [System Architecture](#3-system-architecture)
4. [Technical Stack](#4-technical-stack)
5. [AI Solver Agent Architecture](#5-ai-solver-agent-architecture)
6. [Multi-Chain Data Normalization](#6-multi-chain-data-normalization)
7. [Database Schema Evolution](#7-database-schema-evolution)
8. [Analytics Dashboards](#8-analytics-dashboards)
9. [Developer APIs & SDKs](#9-developer-apis--sdks)
10. [Engineering Workflow & Milestones](#10-engineering-workflow--milestones)
11. [Risks & Scaling Challenges](#11-risks--scaling-challenges)
12. [Success Metrics](#12-success-metrics)
13. [Monetization Strategy](#13-monetization-strategy)

---

## 1. Current State Analysis

### 1.1 Existing Architecture
```
┌─────────────────────────────┐
│   Cloudflare Pages (Frontend)│
│   React + Vite + TailwindCSS │
│   anomapay-explorer.pages.dev│
└──────────┬──────────────────┘
           │ API calls
┌──────────▼──────────────────┐
│   Cloudflare Worker (Backend)│
│   Hono + Drizzle ORM         │
│   Cron: every 1 minute       │
└──────────┬──────────────────┘
           │ SQL
┌──────────▼──────────────────┐
│   D1 Database (SQLite)       │
│   9 tables, multi-chain      │
└─────────────────────────────┘
```

### 1.2 Current Strengths
| Strength | Detail |
|----------|--------|
| **Multi-chain indexing** | Ethereum, Base, Optimism, Arbitrum already supported |
| **Deep payload decoding** | Classifies intents into Resource/Discovery/Application/External |
| **Privacy state tracking** | Commitment tree roots, nullifier counts, anonymity set metrics |
| **Solver analytics** | Leaderboard with tx count, gas spent, value processed |
| **Rich UI components** | 21 components: IntentMempool, SolverLeaderboard, PrivacyPulse, CrossChainTopology, RingTradeVisualizer, ZKCircuitRegistry, CoordinationTree, AnonymitySimulator |
| **Edge-deployed** | Full serverless on Cloudflare (Workers + D1 + Pages) |
| **Blockscout integration** | Secondary data source for verification |
| **Admin tools** | Backfill, manual sync, bulk import capabilities |
| **PWA ready** | Service worker, manifest, mobile-optimized |

### 1.3 Current Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| No real intent lifecycle tracking | Cannot follow intent from creation → matching → settlement | P0 |
| No solver profit/loss analytics | Can't measure solver efficiency or rank by performance | P0 |
| No AI-powered analysis | Missing predictive analytics and automated insights | P1 |
| Limited cross-chain correlation | Events tracked per-chain, not correlated across chains | P1 |
| No simulation engine | Users can't preview intent execution outcomes | P1 |
| No developer API keys/rate limiting | Missing API monetization infrastructure | P2 |
| No Namada/native Anoma chain support | Only EVM PA-EVM chains indexed | P1 |
| No real-time WebSocket feeds | Polling-only, no push notifications | P2 |
| D1 scalability limits | SQLite not suitable for high-throughput analytics | P2 |
| No mempool monitoring | Only post-settlement data, no pending intent visibility | P1 |

---

## 2. Strategic Vision

### 2.1 Product Vision
**AnomaScan** = The Etherscan of the Intent Economy

A unified observability platform that tracks every intent, solver action, and settlement across the entire Anoma ecosystem — from PA-EVM chains (Ethereum, Base, Optimism, Arbitrum) to native Anoma instances (Namada, future Chimera chains) — powered by AI that can predict, simulate, and optimize intent execution.

### 2.2 Core Product Pillars

```
┌─────────────────────────────────────────────────────┐
│                    AnomaScan Platform                 │
├─────────┬─────────┬──────────┬──────────┬───────────┤
│ Intent  │ Solver  │ AI       │ Developer│ Privacy   │
│ Explorer│ Intel   │ Engine   │ APIs     │ Analytics │
├─────────┼─────────┼──────────┼──────────┼───────────┤
│ Full    │ Profit/ │ Route    │ REST +   │ Anonymity │
│ lifecycle│ Loss   │ predict  │ GraphQL  │ set size  │
│ tracking│ ranking │ & sim    │ + SDKs   │ tracking  │
│         │         │          │          │           │
│ Cross-  │ MEV     │ Batch    │ Webhook  │ ZK proof  │
│ chain   │ detect  │ optimize │ feeds    │ verify    │
│ correlate│        │          │          │           │
└─────────┴─────────┴──────────┴──────────┴───────────┘
```

### 2.3 Target Users
1. **Solver Operators** — Performance analytics, profit tracking, strategy optimization
2. **Anoma Developers** — Intent debugging, API access, simulation testing
3. **DeFi Researchers** — Cross-chain flow analysis, MEV research, privacy metrics
4. **Protocol Teams** — Network health monitoring, adoption metrics
5. **Traders** — Intent status tracking, execution quality analysis

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
                    ┌───────────────────────────────────┐
                    │         DATA SOURCES               │
                    ├───────┬───────┬───────┬───────────┤
                    │PA-EVM │PA-EVM │PA-EVM │  Namada   │
                    │(ETH)  │(Base) │(OP/ARB)│  (IBC)   │
                    └───┬───┴───┬───┴───┬───┴─────┬─────┘
                        │       │       │         │
                    ┌───▼───────▼───────▼─────────▼─────┐
                    │      INGESTION LAYER               │
                    │  ┌──────────┐  ┌──────────────┐    │
                    │  │Blockscout│  │ RPC Polling   │    │
                    │  │ Indexer  │  │ (viem/ethers) │    │
                    │  └────┬─────┘  └──────┬───────┘    │
                    │       │               │            │
                    │  ┌────▼───────────────▼──────┐     │
                    │  │  Event Normalizer          │     │
                    │  │  (Chain-agnostic format)   │     │
                    │  └────────────┬───────────────┘     │
                    └──────────────┼─────────────────────┘
                                   │
                    ┌──────────────▼─────────────────────┐
                    │      PROCESSING LAYER              │
                    │                                    │
                    │  ┌──────────────┐ ┌─────────────┐  │
                    │  │Intent        │ │Solver        │  │
                    │  │Lifecycle     │ │Analytics     │  │
                    │  │Tracker       │ │Engine        │  │
                    │  └──────┬───────┘ └──────┬──────┘  │
                    │         │                │         │
                    │  ┌──────▼───────────────▼──────┐   │
                    │  │  AI Reasoning Engine         │   │
                    │  │  (Route sim, optimization)   │   │
                    │  └──────────────┬──────────────┘   │
                    └─────────────────┼──────────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │      STORAGE LAYER                  │
                    │  ┌─────────┐  ┌──────────────────┐  │
                    │  │D1 (core)│  │ KV (cache/state) │  │
                    │  └─────────┘  └──────────────────┘  │
                    │  ┌────────────────────────────────┐  │
                    │  │ R2 (blob storage for payloads) │  │
                    │  └────────────────────────────────┘  │
                    └─────────────────┬──────────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │      API GATEWAY                    │
                    │  REST + GraphQL + WebSocket          │
                    │  API Keys, Rate Limiting, Billing    │
                    └─────────────────┬──────────────────┘
                                      │
              ┌───────────┬───────────┼──────────┬───────────┐
              ▼           ▼           ▼          ▼           ▼
         ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
         │Explorer │ │Solver  │ │AI Dash │ │Dev     │ │External │
         │Frontend │ │Console │ │board   │ │Portal  │ │SDKs     │
         └─────────┘ └────────┘ └────────┘ └────────┘ └─────────┘
```

### 3.2 Component Breakdown

#### A. Intent Ingestion & Normalization
```typescript
// Normalized Intent Format (chain-agnostic)
interface NormalizedIntent {
  id: string;                          // Global unique: `{chainId}:{txHash}:{logIndex}`
  chainId: number;
  chainName: string;
  sourceProtocol: 'pa-evm' | 'namada' | 'chimera';

  // Lifecycle
  status: 'pending' | 'matched' | 'settling' | 'settled' | 'failed' | 'expired';
  createdAt: number;
  matchedAt?: number;
  settledAt?: number;
  expiresAt?: number;

  // Intent Content
  intentType: 'swap' | 'transfer' | 'bridge' | 'stake' | 'custom';
  creator: string;                     // Address or shielded identifier
  constraints: IntentConstraint[];     // What the user wants

  // Resources (ARM model)
  consumedResources: Resource[];       // Resources being spent
  createdResources: Resource[];        // Resources being created

  // Solver
  solver?: string;
  solutionRoute?: SolutionStep[];
  solverProfit?: bigint;

  // Execution
  txHash?: string;
  gasUsed?: number;
  gasCost?: bigint;

  // Privacy
  isShielded: boolean;
  commitmentRoot?: string;
  nullifiers?: string[];

  // Cross-chain
  isMultiChain: boolean;
  relatedIntents?: string[];           // IDs of correlated cross-chain intents

  // Raw data
  rawPayload: string;
  decodedPayload?: object;
}

interface Resource {
  label: string;
  quantity: bigint;
  denomination: string;
  logic: string;                       // Resource logic hash
  ephemeral: boolean;
}

interface IntentConstraint {
  field: string;                       // e.g., "minOutput", "maxSlippage"
  operator: 'gte' | 'lte' | 'eq' | 'neq';
  value: string;
}

interface SolutionStep {
  stepIndex: number;
  chainId: number;
  action: 'swap' | 'bridge' | 'transfer' | 'stake';
  protocol: string;                    // e.g., "Uniswap V3", "Across Bridge"
  inputToken: string;
  outputToken: string;
  inputAmount: bigint;
  outputAmount: bigint;
  estimatedGas: number;
}
```

#### B. Intent Lifecycle Tracker
```
Intent Created ──► Propagated ──► Matched ──► Settling ──► Settled
     │                │              │            │           │
     │                │              │            │           │
   [Event:           [Gossip       [Solver      [TX         [Confirm
    IntentCreated]    detected]     claimed]     submitted]   block]
     │                │              │            │           │
     └── Expired      └── Timeout   └── Failed  └── Reverted └── ✓ Done
```

State machine managed by the processing layer. Each transition emits a lifecycle event stored in the `intent_lifecycle_events` table.

#### C. Solver Analytics Engine
```typescript
interface SolverProfile {
  address: string;
  chains: number[];                    // Active chains

  // Performance
  totalIntentsSolved: number;
  successRate: number;                 // % of submitted solutions that settled
  avgSettlementTime: number;           // ms from match to settlement
  avgGasEfficiency: number;            // actual vs estimated gas ratio

  // Economics
  totalRevenue: bigint;                // Value extracted from solving
  totalGasCost: bigint;
  netProfit: bigint;
  profitPerIntent: bigint;
  roi: number;

  // Specialization
  intentTypesServed: Record<string, number>;  // swap: 450, bridge: 120, etc.
  preferredChains: number[];
  avgBatchSize: number;                // How many intents per tx

  // Reliability
  uptimePercentage: number;
  lastActiveTimestamp: number;
  avgResponseTime: number;            // ms from intent broadcast to solution

  // Rankings
  overallRank: number;
  profitRank: number;
  speedRank: number;
  reliabilityRank: number;
}
```

#### D. Simulation Engine
The simulation engine predicts outcomes before execution:

```
Input Intent ──► Market State ──► Route Generator ──► Outcome Simulator
                    │                   │                    │
                    ├── Liquidity       ├── Direct swap      ├── Slippage
                    ├── Gas prices      ├── Multi-hop        ├── Gas cost
                    ├── Bridge fees     ├── Cross-chain      ├── Net output
                    └── Token prices    ├── Internal match   ├── Solver profit
                                        └── Arbitrage        └── Risk score
```

---

## 4. Technical Stack

### 4.1 Stack by Component

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Backend API** | Cloudflare Workers + Hono | Already deployed, edge-fast, zero cold starts |
| **Primary DB** | Cloudflare D1 (SQLite) | Current DB, good for structured intent data |
| **Cache/State** | Cloudflare KV | Low-latency key-value for real-time state |
| **Blob Storage** | Cloudflare R2 | Store raw payloads, proof data, simulation results |
| **Real-time** | Cloudflare Durable Objects | WebSocket connections, live intent feeds |
| **Frontend** | React + Vite + TailwindCSS | Existing stack, proven performant |
| **Charting** | Recharts + D3.js | Already using Recharts, add D3 for topologies |
| **Blockchain** | viem + ethers.js | Multi-chain RPC interaction |
| **Event Indexing** | Blockscout API + direct RPC | Dual-source for reliability |
| **AI/ML Layer** | Cloudflare Workers AI | Edge inference for route prediction |
| **Simulation** | TypeScript engine (custom) | Deterministic simulation in Workers |
| **API Gateway** | Hono middleware | Auth, rate limiting, billing |
| **Monitoring** | Cloudflare Analytics + Discord | Already have Discord alerts |
| **CI/CD** | GitHub Actions + Wrangler | Existing deployment pipeline |

### 4.2 Infrastructure Cost Estimate (Monthly)

| Resource | Free Tier | Growth Tier | Scale Tier |
|----------|----------|-------------|------------|
| Workers requests | 100K/day free | $5/10M req | $5/10M req |
| D1 database | 5M reads free | $0.001/M reads | $0.001/M reads |
| KV reads | 100K/day free | $0.50/M reads | $0.50/M reads |
| R2 storage | 10GB free | $0.015/GB | $0.015/GB |
| Workers AI | 10K neurons/day | Pay per use | Pay per use |
| Durable Objects | Included | $0.15/M req | $0.15/M req |
| **Total estimate** | **$0** | **~$20/mo** | **~$100/mo** |

---

## 5. AI Solver Agent Architecture

### 5.1 Agent Overview

```
┌────────────────────────────────────────────────────────────┐
│                  AI SOLVER AGENT (AnomaAI)                  │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PERCEPTION   │  │  REASONING   │  │  ACTION           │  │
│  │              │  │              │  │                  │  │
│  │ Intent       │  │ Route        │  │ Transaction      │  │
│  │ Ingestion    │──▶ Generation   │──▶ Building         │  │
│  │              │  │              │  │                  │  │
│  │ Market       │  │ Outcome      │  │ Batch            │  │
│  │ State        │  │ Simulation   │  │ Optimization     │  │
│  │              │  │              │  │                  │  │
│  │ Cross-chain  │  │ Strategy     │  │ Settlement       │  │
│  │ Monitor      │  │ Selection    │  │ Submission       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LEARNING LAYER (Heuristic + ML)                     │   │
│  │  - Historical performance analysis                   │   │
│  │  - Strategy weight adjustment                        │   │
│  │  - Gas price prediction model                        │   │
│  │  - Liquidity depth estimation                        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Intent Ingestion Pipeline

```typescript
// Agent ingestion module
interface AgentIngestor {
  // Source adapters
  sources: {
    paEvm: PAEVMListener[];        // PA-EVM contract events on ETH/Base/OP/ARB
    namada: NamadaListener;        // Namada IBC intent events
    mempool: MempoolWatcher;       // Pre-settlement intent detection
  };

  // Normalization
  normalize(raw: RawEvent): NormalizedIntent;

  // Filtering
  filter(intent: NormalizedIntent): boolean;  // Can we solve this?

  // Priority queue
  queue: PriorityQueue<NormalizedIntent>;     // Scored by expected profit
}
```

### 5.3 Market State Model

```typescript
interface MarketState {
  timestamp: number;
  chains: Map<number, ChainState>;

  // Global
  gasEstimates: Map<number, bigint>;          // chainId → gas price
  bridgeFees: Map<string, BridgeFee>;         // route → fee
  crossChainLatency: Map<string, number>;     // route → avg settlement ms
}

interface ChainState {
  chainId: number;
  blockNumber: number;

  // Liquidity
  pools: Map<string, LiquidityPool>;          // pool addr → state
  reserves: Map<string, TokenReserve>;        // token → total liquidity

  // Pricing
  tokenPrices: Map<string, number>;           // token → USD price
  priceImpactCurves: Map<string, number[]>;   // pool → impact at sizes

  // Activity
  pendingIntents: number;
  avgSettlementTime: number;
  solverCompetition: number;                  // Active solvers on this chain
}
```

### 5.4 Route Generation Algorithm

```
function generateRoutes(intent, marketState):
  routes = []

  // Strategy 1: Direct Swap
  if canDirectSwap(intent):
    route = findBestDEX(intent.input, intent.output, intent.amount)
    routes.push({type: 'direct', route, score: scoreRoute(route)})

  // Strategy 2: Multi-Hop (same chain)
  intermediaries = findIntermediaries(intent.input, intent.output)
  for path in intermediaries:
    route = buildMultiHop(path, intent.amount)
    routes.push({type: 'multi-hop', route, score: scoreRoute(route)})

  // Strategy 3: Cross-Chain
  if intent.allowsCrossChain:
    for targetChain in availableChains:
      crossRoute = buildCrossChainRoute(intent, targetChain)
      routes.push({type: 'cross-chain', route: crossRoute, score: scoreRoute(crossRoute)})

  // Strategy 4: Internal Matching
  matchingIntents = findCounterparties(intent)
  if matchingIntents.length > 0:
    matchRoute = buildInternalMatch(intent, matchingIntents)
    routes.push({type: 'internal', route: matchRoute, score: scoreRoute(matchRoute)})

  // Strategy 5: Batched Arbitrage
  arbOpportunity = findArbitrage(intent, marketState)
  if arbOpportunity:
    routes.push({type: 'arbitrage', route: arbOpportunity, score: scoreRoute(arbOpportunity)})

  return routes.sortByScore().top(5)
```

### 5.5 Simulation Engine

```typescript
interface SimulationResult {
  route: SolutionStep[];
  inputAmount: bigint;
  expectedOutput: bigint;

  // Costs
  estimatedGas: number;
  gasCostUSD: number;
  bridgeFees: number;
  slippage: number;                    // Percentage

  // Profit
  solverProfit: bigint;
  profitUSD: number;
  profitMargin: number;

  // Risk
  riskScore: number;                   // 0-100
  riskFactors: string[];               // ["high slippage", "low liquidity"]
  confidenceLevel: number;             // 0-1

  // Timing
  estimatedSettlementTime: number;     // ms
  expirationRisk: boolean;
}
```

### 5.6 Learning & Optimization

The agent uses a **heuristic scoring system** that adjusts weights based on historical outcomes:

```typescript
interface StrategyWeights {
  directSwapWeight: number;            // Start: 0.3
  multiHopWeight: number;             // Start: 0.25
  crossChainWeight: number;           // Start: 0.15
  internalMatchWeight: number;        // Start: 0.2
  arbitrageWeight: number;            // Start: 0.1
}

// After each settlement, update weights:
function updateWeights(outcome: SettlementOutcome) {
  const alpha = 0.01;  // Learning rate
  if (outcome.profitable) {
    weights[outcome.strategyType] += alpha * outcome.profitMargin;
  } else {
    weights[outcome.strategyType] -= alpha * Math.abs(outcome.loss);
  }
  normalizeWeights(weights);  // Ensure sum = 1
}
```

**Future ML expansion**: When sufficient data is collected (>10K settlements), train a lightweight model using Cloudflare Workers AI for:
- Gas price prediction (next 10 blocks)
- Liquidity depth estimation
- Settlement success probability
- Optimal batch size determination

### 5.7 Explorer Integration

```
┌──────────────────┐     ┌────────────────────┐
│  AI Solver Agent  │────▶│  Explorer Backend   │
│                  │     │                    │
│  Generates:      │     │  Displays:         │
│  • Route options │     │  • AI suggestions  │
│  • Simulations   │     │  • Route visualizer│
│  • Predictions   │     │  • Profit forecasts│
│                  │     │  • Risk indicators │
│  Reports:        │     │                    │
│  • Solved intents│     │  Feeds:            │
│  • Profit data   │     │  • Solver analytics│
│  • Latency stats │     │  • Leaderboards    │
└──────────────────┘     └────────────────────┘
```

---

## 6. Multi-Chain Data Normalization

### 6.1 Chain Adapter Pattern

Each chain gets a dedicated adapter that translates native events into the normalized format:

```typescript
// Abstract base adapter
abstract class ChainAdapter {
  abstract chainId: number;
  abstract chainType: 'pa-evm' | 'namada' | 'chimera';

  abstract parseIntentCreated(log: Log): NormalizedIntent;
  abstract parseSolutionSubmitted(log: Log): SolverSolution;
  abstract parseSettlement(log: Log): SettlementRecord;

  abstract getPrivacyState(blockNumber: number): PrivacySnapshot;
  abstract getSolverActivity(address: string): SolverMetrics;
}

// PA-EVM adapter (Ethereum, Base, OP, ARB)
class PAEVMAdapter extends ChainAdapter {
  chainType = 'pa-evm' as const;
  contractAddress: string;         // PA-EVM contract on this chain
  abi: Abi;                        // AnomaProtocolAdapter ABI

  parseIntentCreated(log: Log): NormalizedIntent {
    const decoded = decodeEventLog({ abi: this.abi, ...log });
    return {
      id: `${this.chainId}:${log.transactionHash}:${log.logIndex}`,
      chainId: this.chainId,
      sourceProtocol: 'pa-evm',
      status: 'pending',
      intentType: classifyIntent(decoded),
      consumedResources: extractResources(decoded.args.consumed),
      createdResources: extractResources(decoded.args.created),
      isShielded: decoded.args.isShielded,
      rawPayload: log.data,
      // ...
    };
  }
}

// Namada adapter (IBC-based)
class NamadaAdapter extends ChainAdapter {
  chainType = 'namada' as const;
  rpcEndpoint: string;
  maspIndexer: string;

  parseIntentCreated(event: NamadaEvent): NormalizedIntent {
    return {
      id: `namada:${event.hash}:${event.index}`,
      chainId: this.chainId,
      sourceProtocol: 'namada',
      isShielded: true,  // Namada intents are always privacy-enabled
      // MASP-specific fields
      commitmentRoot: event.maspRoot,
      nullifiers: event.nullifiers,
      // ...
    };
  }
}
```

### 6.2 Privacy Handling Strategy

```
┌──────────────────────────────────────────┐
│           Privacy Data Handling           │
├──────────────────────────────────────────┤
│                                          │
│  PUBLIC DATA (always indexed):           │
│  ├── Transaction hash                    │
│  ├── Block number & timestamp            │
│  ├── Settlement status                   │
│  ├── Solver address                      │
│  ├── Gas used / cost                     │
│  └── Chain identifier                    │
│                                          │
│  DERIVED DATA (computed, not stored):    │
│  ├── Anonymity set size estimates        │
│  ├── Commitment tree growth rate         │
│  ├── Nullifier set cardinality           │
│  └── Pool TVL estimates (aggregate)      │
│                                          │
│  PRIVATE DATA (never stored):            │
│  ├── Sender/receiver identities          │
│  ├── Exact transfer amounts              │
│  ├── Token types in shielded transfers   │
│  └── Decrypted MASP notes               │
│                                          │
│  ZK PROOF DATA (verified, stored hash):  │
│  ├── Proof validity (boolean)            │
│  ├── Proof type (compliance/delta/logic) │
│  ├── Proof hash (for verification)       │
│  └── Circuit identifier                  │
└──────────────────────────────────────────┘
```

### 6.3 Cross-Chain Correlation

```typescript
// Correlation engine finds related intents across chains
interface CrossChainCorrelation {
  correlationId: string;
  intents: string[];        // IDs on different chains
  correlationType: 'bridge' | 'atomic_swap' | 'chimera_settlement';
  confidence: number;       // 0-1 correlation confidence
  totalValueUSD: number;
  chains: number[];
  startedAt: number;
  completedAt?: number;
  status: 'in_progress' | 'completed' | 'partial_failure';
}

// Correlation happens by matching:
// 1. Bridge message hashes across source/destination chains
// 2. Timestamp proximity + value matching
// 3. Solver address correlation (same solver on both sides)
// 4. Commitment root references in Chimera chain settlements
```

---

## 7. Database Schema Evolution

### 7.1 New Tables (Phase 1 — Intent Lifecycle)

```sql
-- Full intent lifecycle tracking
CREATE TABLE intent_lifecycle (
  id TEXT PRIMARY KEY,                    -- chainId:txHash:logIndex
  chain_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/matched/settling/settled/failed/expired
  intent_type TEXT NOT NULL,               -- swap/transfer/bridge/stake/custom
  creator TEXT,
  solver TEXT,

  -- Resources (ARM model)
  consumed_resources TEXT,                 -- JSON array of resources
  created_resources TEXT,                  -- JSON array of resources

  -- Financial
  input_value_usd REAL DEFAULT 0,
  output_value_usd REAL DEFAULT 0,
  solver_profit_usd REAL DEFAULT 0,
  gas_cost_usd REAL DEFAULT 0,

  -- Privacy
  is_shielded INTEGER DEFAULT 0,
  commitment_root TEXT,

  -- Cross-chain
  is_multi_chain INTEGER DEFAULT 0,
  correlation_id TEXT,

  -- Timing
  created_at INTEGER NOT NULL,
  matched_at INTEGER,
  settled_at INTEGER,
  expires_at INTEGER,

  -- Raw
  tx_hash TEXT,
  block_number INTEGER,
  raw_payload TEXT,

  FOREIGN KEY (chain_id) REFERENCES chains(id)
);

CREATE INDEX idx_lifecycle_status ON intent_lifecycle(status, created_at);
CREATE INDEX idx_lifecycle_solver ON intent_lifecycle(solver, settled_at);
CREATE INDEX idx_lifecycle_type ON intent_lifecycle(intent_type, chain_id);
CREATE INDEX idx_lifecycle_correlation ON intent_lifecycle(correlation_id);

-- Lifecycle state transitions
CREATE TABLE lifecycle_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intent_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  triggered_by TEXT,                       -- solver address or system
  metadata TEXT,                           -- JSON with transition-specific data
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (intent_id) REFERENCES intent_lifecycle(id)
);

CREATE INDEX idx_lifecycle_events_intent ON lifecycle_events(intent_id, timestamp);

-- Cross-chain correlations
CREATE TABLE cross_chain_correlations (
  correlation_id TEXT PRIMARY KEY,
  intent_ids TEXT NOT NULL,                -- JSON array
  correlation_type TEXT NOT NULL,
  confidence REAL DEFAULT 0,
  total_value_usd REAL DEFAULT 0,
  chains TEXT NOT NULL,                    -- JSON array of chain IDs
  status TEXT DEFAULT 'in_progress',
  started_at INTEGER NOT NULL,
  completed_at INTEGER
);

-- Solver economics (enhanced)
CREATE TABLE solver_economics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solver_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  period TEXT NOT NULL,                    -- YYYY-MM-DD
  intents_solved INTEGER DEFAULT 0,
  intents_failed INTEGER DEFAULT 0,
  total_revenue_usd REAL DEFAULT 0,
  total_gas_cost_usd REAL DEFAULT 0,
  net_profit_usd REAL DEFAULT 0,
  avg_settlement_time_ms INTEGER DEFAULT 0,
  avg_batch_size REAL DEFAULT 1,
  UNIQUE(solver_address, chain_id, period)
);

-- AI simulation results
CREATE TABLE simulation_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intent_id TEXT NOT NULL,
  route_json TEXT NOT NULL,
  predicted_output TEXT,
  predicted_gas INTEGER,
  predicted_slippage REAL,
  predicted_profit_usd REAL,
  risk_score INTEGER,
  confidence REAL,
  actual_output TEXT,                      -- Filled after settlement
  prediction_accuracy REAL,               -- Computed after settlement
  created_at INTEGER NOT NULL,
  FOREIGN KEY (intent_id) REFERENCES intent_lifecycle(id)
);

-- API keys for developer access
CREATE TABLE api_keys (
  key_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'free',               -- free/pro/enterprise
  rate_limit INTEGER DEFAULT 100,         -- requests per minute
  daily_limit INTEGER DEFAULT 10000,
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  response_time_ms INTEGER,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (key_hash) REFERENCES api_keys(key_hash)
);
```

---

## 8. Analytics Dashboards

### 8.1 Dashboard Specifications

#### Dashboard 1: Intent Observatory
- **Intent Volume**: Real-time chart showing intents/hour by chain and type
- **Intent Demand Heatmap**: 24x7 grid showing peak intent activity by time/day
- **Lifecycle Funnel**: pending → matched → settled percentages
- **Cross-Chain Sankey**: Flow diagram showing value moving between chains
- **Intent Type Distribution**: Pie/donut chart of swap/bridge/transfer/custom

#### Dashboard 2: Solver Intelligence
- **Leaderboard**: Ranked by composite score (profit × success rate × speed)
- **P&L Table**: Revenue, costs, net profit per solver per period
- **Gas Efficiency**: Actual vs predicted gas usage scatter plot
- **Batch Analysis**: Intent batch sizes and their correlation with profitability
- **Specialization Radar**: Spider chart showing solver strengths by intent type

#### Dashboard 3: Network Health
- **Settlement Latency**: p50/p95/p99 settlement times per chain
- **Privacy Pulse**: Anonymity set growth, commitment tree state
- **System Throughput**: Intents processed per block/hour
- **Error Rate**: Failed settlements, reverted transactions
- **Cross-Chain Bridge Status**: Active bridges, pending transfers, avg confirmation time

#### Dashboard 4: AI Insights
- **Route Predictions**: AI-suggested routes for sample intents
- **Prediction Accuracy**: Backtested accuracy of AI predictions
- **Market Opportunity**: Detected arbitrage opportunities
- **Solver Strategy Recommendations**: AI-generated strategy insights

---

## 9. Developer APIs & SDKs

### 9.1 REST API v3

```
BASE: https://anomapay-explorer.bidurandblog.workers.dev/api/v3

Authentication: X-API-Key header (free tier: 100 req/min)

# Intent Endpoints
GET    /v3/intents                         # List intents (paginated, filterable)
GET    /v3/intents/:id                     # Get intent detail + lifecycle
GET    /v3/intents/:id/lifecycle           # Full lifecycle event history
GET    /v3/intents/:id/simulation          # AI simulation results
POST   /v3/intents/simulate               # Submit intent for simulation

# Solver Endpoints
GET    /v3/solvers                         # Solver leaderboard
GET    /v3/solvers/:address                # Solver profile + economics
GET    /v3/solvers/:address/history        # Solver activity history
GET    /v3/solvers/rankings                # Multi-dimensional rankings

# Analytics Endpoints
GET    /v3/analytics/volume                # Volume over time
GET    /v3/analytics/demand-heatmap        # Intent demand by time
GET    /v3/analytics/cross-chain-flows     # Cross-chain value flows
GET    /v3/analytics/settlement-latency    # Latency percentiles
GET    /v3/analytics/privacy              # Privacy metrics

# Chain Endpoints
GET    /v3/chains                          # Supported chains
GET    /v3/chains/:id/status               # Chain health & sync status

# Streaming (WebSocket via Durable Objects)
WS     /v3/stream/intents                  # Real-time intent feed
WS     /v3/stream/settlements              # Real-time settlement feed
WS     /v3/stream/solver/:address          # Solver-specific activity

# Developer SDK helpers
GET    /v3/abi                             # PA-EVM contract ABI
GET    /v3/schemas                         # Data schemas (OpenAPI)
```

### 9.2 TypeScript SDK

```typescript
// @anomascan/sdk
import { AnomaScan } from '@anomascan/sdk';

const client = new AnomaScan({
  apiKey: 'ask_xxxxx',
  network: 'mainnet', // or 'testnet'
});

// Query intents
const intents = await client.intents.list({
  chainId: 8453,
  status: 'settled',
  intentType: 'swap',
  limit: 50,
});

// Get solver profile
const solver = await client.solvers.get('0x...');
console.log(`Net profit: $${solver.economics.netProfitUSD}`);

// Simulate an intent
const sim = await client.simulate({
  inputToken: '0x...USDC',
  outputToken: '0x...ETH',
  amount: '1000000000', // 1000 USDC
  maxSlippage: 0.5,
});
console.log(`Best route: ${sim.bestRoute.steps.map(s => s.protocol).join(' → ')}`);
console.log(`Expected output: ${sim.expectedOutput} ETH`);

// Stream real-time intents
client.stream.intents({ chainId: 8453 }, (intent) => {
  console.log(`New intent: ${intent.id}, type: ${intent.intentType}`);
});
```

---

## 10. Engineering Workflow & Milestones

### 10.1 Phase 1: Foundation (Days 1-30)

**Week 1-2: Intent Lifecycle Engine**
- [ ] Design and migrate `intent_lifecycle` table
- [ ] Build PA-EVM adapter for intent event parsing
- [ ] Implement lifecycle state machine in backend
- [ ] Update indexer to populate lifecycle data
- [ ] Add lifecycle events table and state transitions

**Week 3: Solver Economics**
- [ ] Design `solver_economics` table
- [ ] Build daily aggregation job (Cron)
- [ ] Calculate profit/loss per solver per period
- [ ] Add solver ranking algorithm (composite score)
- [ ] Update SolverLeaderboard component with P&L data

**Week 4: API v3 Foundation**
- [ ] Implement versioned API routes (`/api/v3/...`)
- [ ] Add API key management (create, verify, rate limit)
- [ ] Build paginated, filterable intent list endpoint
- [ ] Build enhanced solver endpoints
- [ ] Deploy and test

**30-Day Deliverable**: Intent lifecycle tracking live, solver economics dashboard, API v3 with key management.

### 10.2 Phase 2: Intelligence (Days 31-60)

**Week 5-6: Cross-Chain Correlation**
- [ ] Build cross-chain correlation engine
- [ ] Implement bridge message tracking
- [ ] Add Sankey diagram for cross-chain flows
- [ ] Build `cross_chain_correlations` table
- [ ] Add correlation confidence scoring

**Week 7: Simulation Engine v1**
- [ ] Build route generation algorithm
- [ ] Implement slippage/gas/output prediction
- [ ] Add `POST /v3/intents/simulate` endpoint
- [ ] Store simulation results for accuracy tracking
- [ ] Build simulation UI component

**Week 8: AI Layer v1**
- [ ] Integrate Cloudflare Workers AI for route scoring
- [ ] Build heuristic optimization for solver strategies
- [ ] Add prediction accuracy tracking
- [ ] Build AI Insights dashboard tab
- [ ] Implement learning weight adjustments

**60-Day Deliverable**: Cross-chain correlation, simulation engine, AI-powered route suggestions.

### 10.3 Phase 3: Scale & Monetize (Days 61-90)

**Week 9-10: Real-time & Streaming**
- [ ] Implement Durable Objects for WebSocket connections
- [ ] Build real-time intent/settlement streams
- [ ] Add push notifications for solver operators
- [ ] Implement mempool monitoring (pending intents)

**Week 11: Developer Portal**
- [ ] Build developer documentation page
- [ ] Create TypeScript SDK (`@anomascan/sdk`)
- [ ] Add interactive API playground
- [ ] Implement API usage analytics
- [ ] Add tiered pricing (free/pro/enterprise)

**Week 12: Namada Integration**
- [ ] Research Namada RPC/indexer APIs
- [ ] Build NamadaAdapter
- [ ] Add MASP privacy metrics
- [ ] Integrate Namada data into unified explorer
- [ ] Update cross-chain correlation for IBC bridges

**90-Day Deliverable**: Real-time WebSocket feeds, developer SDK, Namada chain support, monetization-ready API tiers.

### 10.4 Phase 4: Expansion (Days 91+)

- [ ] Multi-agent coordination protocol
- [ ] Chimera chain support (when available)
- [ ] Advanced ML models (gas prediction, liquidity estimation)
- [ ] Solver marketplace (bid for intent bundles)
- [ ] Mobile app (React Native)
- [ ] GraphQL API layer
- [ ] Governance analytics for Anoma/Namada

---

## 11. Risks & Scaling Challenges

### 11.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **D1 row limits** | Medium | Implement data archiving to R2, keep last 90 days hot |
| **Anoma protocol changes** | High | Use adapter pattern — swap out chain adapters without core changes |
| **RPC rate limits** | Medium | Multi-provider rotation (Alchemy + public RPCs + Blockscout) |
| **Workers CPU limits** | Medium | Split heavy computation into sub-workers, use queues |
| **AI prediction accuracy** | Medium | Start with heuristics, add ML gradually with sufficient data |
| **Cross-chain correlation false positives** | Low | Confidence scoring + manual verification for flagged events |
| **Namada RPC instability** | Medium | Fallback to indexer APIs, cache aggressively |
| **WebSocket connection limits** | Low | Durable Objects auto-scale, implement connection pooling |

### 11.2 Operational Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Solo developer bus factor** | High | Document everything, use modular architecture |
| **API abuse** | Medium | Rate limiting, API keys, abuse detection |
| **Cost spike from viral usage** | Medium | Cloudflare pricing is predictable; set billing alerts |
| **Competition from official tools** | Medium | Move fast, build community, offer unique AI features |

### 11.3 Scalability Strategy

```
Phase 1 (0-10K intents/day):    Current stack (D1 + Workers)
Phase 2 (10K-100K intents/day): Add KV caching, R2 archiving, worker queues
Phase 3 (100K+ intents/day):    Consider Hyperdrive (Postgres), Queues for async
```

---

## 12. Success Metrics

### 12.1 KPIs by Quarter

| Metric | Q1 Target | Q2 Target | Q3 Target |
|--------|-----------|-----------|-----------|
| **Daily Active Users** | 100 | 500 | 2,000 |
| **API Requests/Day** | 5,000 | 50,000 | 500,000 |
| **Chains Supported** | 4 (EVM) | 5 (+Namada) | 7+ |
| **Intents Indexed** | 50K total | 500K total | 5M total |
| **Solver Profiles Tracked** | 50 | 200 | 1,000+ |
| **API Key Holders** | 20 | 100 | 500 |
| **Paid Subscribers** | 0 | 5 | 25 |
| **AI Prediction Accuracy** | — | 60% | 75% |
| **Avg Latency (API)** | <200ms | <150ms | <100ms |

### 12.2 Ecosystem Impact
- **Solver Adoption**: Measured by % of active solvers using our analytics
- **Developer Integration**: Measured by SDK downloads and API integrations
- **Protocol Recognition**: Listed on Anoma ecosystem page, conference mentions
- **Data Coverage**: % of total Anoma intents indexed by AnomaScan

---

## 13. Monetization Strategy

### 13.1 Revenue Streams

```
┌─────────────────────────────────────────────────────┐
│              MONETIZATION MODEL                      │
├──────────────┬──────────────────┬───────────────────┤
│  Free Tier   │   Pro Tier       │  Enterprise       │
│  $0/mo       │   $49/mo         │  $499/mo          │
├──────────────┼──────────────────┼───────────────────┤
│ 100 req/min  │ 1000 req/min     │ 10,000 req/min   │
│ 10K req/day  │ 100K req/day     │ Unlimited         │
│ REST API only│ + WebSocket      │ + GraphQL         │
│ 7-day history│ + 90-day history │ + Full history    │
│ Basic charts │ + Export CSV     │ + Raw data access │
│              │ + AI simulations │ + Custom alerts   │
│              │ + Solver alerts  │ + Dedicated support│
│              │                  │ + White-label     │
└──────────────┴──────────────────┴───────────────────┘
```

### 13.2 Additional Revenue
1. **Solver Marketplace** — Take 1-5% fee on premium intent bundles
2. **AI Solver SaaS** — Offer managed solver agent for operators ($99-999/mo)
3. **Custom Analytics** — Bespoke dashboards for protocol teams
4. **Grants** — Apply for Anoma/Namada ecosystem grants
5. **Data Licensing** — Anonymized intent data for research institutions

### 13.3 Revenue Projection

| Quarter | Monthly Revenue | Source |
|---------|----------------|--------|
| Q1 | $0 | Building, grant applications |
| Q2 | $200-500 | Early Pro subscribers + grants |
| Q3 | $2,000-5,000 | Growing API usage + enterprise pilot |
| Q4 | $10,000-25,000 | Full monetization + solver marketplace |

---

## Appendix A: File Structure (Proposed)

```
AnomaPayDashbord/
├── src/
│   └── backend/
│       ├── index.ts                  # API routes (Hono)
│       ├── controllers/
│       │   ├── intentController.ts   # [NEW] Intent lifecycle CRUD
│       │   ├── simulationController.ts # [NEW] Simulation endpoints
│       │   ├── analyticsController.ts  # [NEW] Analytics aggregation
│       │   ├── apiKeyController.ts     # [NEW] API key management
│       │   ├── chainController.ts
│       │   ├── statsController.ts
│       │   ├── transactionController.ts
│       │   ├── solverController.ts
│       │   └── adminController.ts
│       ├── services/
│       │   ├── blockscoutIndexer.ts
│       │   ├── lifecycleEngine.ts    # [NEW] State machine
│       │   ├── correlationEngine.ts  # [NEW] Cross-chain correlation
│       │   ├── simulationEngine.ts   # [NEW] Route simulation
│       │   ├── aiEngine.ts           # [NEW] ML/heuristic scoring
│       │   └── solverEconomics.ts    # [NEW] P&L calculation
│       ├── adapters/
│       │   ├── base.ts               # [NEW] Abstract ChainAdapter
│       │   ├── paEvm.ts              # [NEW] PA-EVM adapter
│       │   └── namada.ts             # [NEW] Namada adapter
│       ├── db/
│       │   ├── schema.ts
│       │   └── migrations/           # [NEW] Migration files
│       └── utils/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── IntentLifecycle.tsx    # [NEW] Lifecycle visualization
│       │   ├── SolverEconomics.tsx    # [NEW] P&L dashboard
│       │   ├── CrossChainSankey.tsx   # [NEW] Flow diagram
│       │   ├── SimulationPanel.tsx    # [NEW] Intent simulator
│       │   ├── AIInsights.tsx         # [NEW] AI predictions
│       │   ├── DemandHeatmap.tsx      # [NEW] Activity heatmap
│       │   ├── DevPortal.tsx          # [NEW] API docs
│       │   └── ... (existing components)
│       └── pages/
│           ├── IntentDetailPage.tsx   # [NEW] Full intent lifecycle view
│           ├── AnalyticsPage.tsx      # [NEW] Analytics hub
│           ├── DevPortalPage.tsx      # [NEW] Developer documentation
│           └── ... (existing pages)
├── sdk/                              # [NEW] @anomascan/sdk package
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── stream.ts
│   └── README.md
└── docs/                             # [NEW] API documentation
    ├── api-reference.md
    ├── getting-started.md
    └── solver-guide.md
```

---

## Appendix B: Key Anoma Protocol References

| Component | Description | Relevance to AnomaScan |
|-----------|-------------|----------------------|
| **ARM** (Anoma Resource Machine) | Stateless VM, resources as atomic units | Core data model for intent normalization |
| **PA-EVM** (Protocol Adapter for EVM) | Brings Anoma to Ethereum chains | Primary data source (current) |
| **Taiga** | Privacy execution env with recursive ZK proofs | Privacy metrics, circuit tracking |
| **Namada** | First fractal instance, MASP privacy | Second major data source (Phase 3) |
| **Chimera Chains** | Heterogeneous Paxos for atomic cross-chain | Future cross-chain correlation |
| **Typhon** | P2P network, mempool, consensus engine | Mempool monitoring data source |
| **Juvix** | Functional language for Anoma apps | Developer tooling integration |
| **XAN** | Native Anoma token (mainnet Sept 2025) | Token tracking, staking analytics |
| **MASP** | Multi-Asset Shielded Pool | Anonymity set metrics |
| **Validity Predicates** | Declarative smart contracts for verification | Proof verification tracking |

---

*This roadmap is a living document. Update as Anoma protocol evolves and user feedback guides priorities.*

*Last updated: March 7, 2026*
