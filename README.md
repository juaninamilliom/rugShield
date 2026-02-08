# RugShield

SUI-first, multi-chain smart contract risk analyzer for Sui, EVM (Base/Ethereum), and Solana.

## Why RugShield

RugShield helps traders and integrators quickly assess contract risk by combining deterministic security checks with explainable findings and a normalized 0-100 risk score.

- `SUI-first`: default chain and first-class analyzer is Sui/Move.
- `Multi-chain`: unified service contract for `sui`, `evm`, and `solana`.
- `Production-oriented`: PostgreSQL persistence, API rate limits, Docker runtime, test suite.

## Product Positioning

RugShield is a standalone product in the same company portfolio as WalletIQ and AgentEscrow.

- RugShield: contract/program risk analysis.
- WalletIQ: wallet reputation and behavioral scoring.
- AgentEscrow: transaction escrow and dispute lifecycle.

Products can be sold independently and integrated together.

## Architecture

- API: Express + TypeScript
- Data: PostgreSQL + Prisma
- Chain analyzers:
  - Sui analyzer (Move model)
  - EVM analyzer (Solidity/Vyper model)
  - Solana analyzer (SVM model)
- Scoring: deterministic rule engine with severity-weighted scoring

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
```

Required `DATABASE_URL`:

```env
DATABASE_URL=postgresql://rugshield:rugshield@localhost:5434/rugshield?schema=public
RATE_LIMIT_PER_MINUTE=60
LOG_LEVEL=info
PROVIDER_TIMEOUT_MS=4000
PROVIDER_RETRY_ATTEMPTS=3
PROVIDER_RETRY_DELAY_MS=200
PORT=3400
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
ETHERSCAN_API_KEY=
```

### 2. Start Postgres

```bash
docker compose up -d db
```

### 3. Install + migrate + run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run start:api
```

### 4. Verify

```bash
curl -sS http://localhost:3400/health
curl -sS http://localhost:3400/ready
```

## API

### Analyze contract/program

`POST /api/v1/analyze`

```json
{
  "chain": "sui",
  "targetType": "address",
  "targetValue": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

Response includes persisted scan:

- `id`
- `score`
- `riskLevel`
- `findings[]`
- `summary`
- `analysisTimeMs`

### Fetch single scan

`GET /api/v1/scans/:id`

### List recent scans

`GET /api/v1/scans?chain=sui&limit=20`

### Service metadata

`GET /api/v1/meta`

### Admin API key management

Protected by `x-admin-token: $INTERNAL_ADMIN_TOKEN`.

- `POST /api/v1/admin/keys` body: `{ "name": "ops-key", "tier": "api" }`
- `GET /api/v1/admin/keys`
- `DELETE /api/v1/admin/keys/:id`
- `GET /api/v1/admin/reports/usage?start=<iso>&end=<iso>&tier=api`
- `GET /api/v1/admin/reports/invoice?start=<iso>&end=<iso>`

`POST /api/v1/analyze` accepts API keys through `x-api-key` or `Authorization: Bearer <token>`.
If an API key is provided, RugShield enforces tier daily quotas and returns `429` on quota exhaustion.

Self-service API key operations:

- `GET /api/v1/keys/me` (returns tier, usage today, remaining quota)
- `POST /api/v1/keys/rotate` body: `{ "name": "new-key-name" }`

## Testing

```bash
npm test
npm run test:coverage
```

Current suite covers:

- scoring engine
- chain parsing
- service orchestration
- API endpoints

Optional integration modes:

```bash
# Real Postgres integration test (requires docker db + migrations)
npm run test:db

# Full HTTP integration tests (disabled in restricted sandboxes)
ALLOW_HTTP_TESTS=1 npm test
```

DB integration requires:

1. `docker compose up -d db`
2. `DATABASE_URL=postgresql://rugshield:rugshield@127.0.0.1:5434/rugshield?schema=public npm run prisma:migrate:deploy`
3. `DATABASE_URL=postgresql://rugshield:rugshield@127.0.0.1:5434/rugshield?schema=public npm run test:db`

## Docker (App + DB)

```bash
docker compose up --build
```

- App: `http://localhost:3400`
- DB: `localhost:5434`

## Production Readiness Notes

Implemented now:

- SUI-first chain defaults
- persisted scan history in Postgres
- deterministic chain-specific risk checks
- API request throttling
- API key issuance, rotation, and revocation
- tier quotas + usage metering + invoice-ready reporting
- containerized runtime
- structured request logging + request-id propagation + readiness probe
- provider resilience via retries/timeouts with degraded-mode fallback metadata
- unit + integration tests

Next production layers (tracked in `IMPLEMENTATION-PLAN.md`):

- background queues and retries
- richer explorer/indexer source retrieval
- observability dashboards and alert routing
- external payment rail integration for invoice settlement

## License

MIT
