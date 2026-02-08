# RugShield Operations Runbook

## 1. Business Model

RugShield has three revenue surfaces:

1. Free tier: limited scans/day, public results.
2. Pro subscription: unlimited scans, private history, advanced reporting.
3. API metered access: pay-per-scan for partner integrations.

Target pricing model:

- Pro: `$50/month`
- API: `$0.05/scan` with volume contracts

## 1.1 Billing Operations

1. Set `API_SCAN_UNIT_PRICE_USD` in production environment.
2. Collect usage from `GET /api/v1/admin/reports/usage` for partner visibility.
3. Generate invoice-ready totals from `GET /api/v1/admin/reports/invoice` per billing period.
4. Bill only `tier=api` keys from invoice report line items.
5. Reconcile invoice totals with payment system weekly.

## 2. Required Wallets and Chain Accounts

RugShield is SUI-first but multi-chain. Operations should maintain separate wallets per function:

1. Treasury wallet (per chain): revenue custody and settlement.
2. Hot operations wallet (per chain): low-balance wallet for routine transactions.
3. Deployment wallet (per chain): used only for contract/program deployments.
4. Emergency wallet (per chain): cold storage, break-glass only.

Recommended chain coverage:

- Sui: primary operational wallet set.
- EVM/Base: secondary operational wallet set.
- Solana: secondary operational wallet set.

## 3. Access Control

1. Use multisig for treasury wallets.
2. Keep deploy keys isolated from runtime API keys.
3. Rotate chain keys quarterly or after incidents.
4. Enforce least privilege across CI/CD and infra credentials.
5. Rotate RugShield API keys monthly for production partners.

## 3.1 API Key Operations

1. Set `INTERNAL_ADMIN_TOKEN` in deployment secrets.
2. Create API keys via `POST /api/v1/admin/keys` with tier (`free`, `pro`, `api`).
3. Store only one-time token output in secure vault; RugShield stores hash only.
4. Revoke compromised keys immediately via `DELETE /api/v1/admin/keys/:id`.
5. Audit usage weekly from `ApiKey` and `ApiKeyUsage` tables.
6. Prefer partner self-service key rotation via `POST /api/v1/keys/rotate` on a regular cadence.

## 4. Service SLOs

1. API availability target: `99.5%` minimum.
2. Median analyze latency target: `< 10s` (deterministic mode).
3. p95 analyze latency target: `< 30s`.
4. Incident acknowledge SLA: `< 15 minutes` during business hours.

## 4.1 Health and Readiness Probes

1. Liveness: `GET /health` (service process alive).
2. Readiness: `GET /ready` (process + database connectivity).
3. API responses include `x-request-id`; capture this in support/incident tickets.

## 5. Incident Workflow

1. Detect (health check / alerts / customer report).
2. Triage severity (`sev1` outage, `sev2` degradation, `sev3` minor).
3. Stabilize by activating degraded deterministic mode if external providers fail.
4. Resolve and publish postmortem within `48 hours` for `sev1/sev2`.

## 6. Weekly Business Operations

1. Review conversion funnel (free -> pro, API signups).
2. Review false positive/false negative reports from support tickets.
3. Recalibrate scoring thresholds if drift appears in benchmark corpus.
4. Confirm wallet balances and sweep hot wallet excess to treasury.

## 7. Integration Policy

RugShield can integrate with:

- WalletIQ for wallet-level counterparty risk overlays.
- AgentEscrow for pre-escrow contract safety gating.

Integrations are additive and must not block RugShield standalone operation.
