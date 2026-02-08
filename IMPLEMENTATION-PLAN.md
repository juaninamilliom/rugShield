# RugShield Full Implementation Plan (SUI-First)

This is the execution plan for building RugShield as a third standalone product while keeping it integration-ready with WalletIQ and AgentEscrow.

## 1) Delivery Principles

- SUI-first defaults in data model, APIs, UX, and scoring policy.
- Full-scope implementation (no scope reduction).
- Chain model correctness is mandatory:
  - Sui: Move VM package/model analysis
  - EVM: Solidity/Vyper bytecode/source analysis
  - Solana: SVM program analysis (not Move)
- Every epic must ship with tests, observability, and docs.

## 2) Product Boundaries

- RugShield is standalone and sellable independently.
- WalletIQ and AgentEscrow integration is optional and additive.
- Primary contract: RugShield public API and report artifacts.

## 3) Workstreams and Tasks

## A. Platform and Repository Foundation

### A1. Project bootstrap
- Initialize `projects/rugshield` app structure (Next.js + TypeScript + tRPC).
- Configure linting, formatting, strict TS, CI pipeline, test commands.
- Add environment template and secrets policy.

### A2. Persistence and schema
- Implement PostgreSQL schema for users, scans, findings, API keys, audit logs, rate limits.
- Add migration scripts and rollback notes.
- Add seed fixtures for known-safe and known-malicious contracts.

### A3. Runtime environments
- Local docker compose (app + db + redis/queue if needed).
- Staging and production environment definitions.
- Deployment scripts and health checks.

## B. Chain Intelligence Layer (SUI-first)

### B1. Common chain analyzer interface
- Define `ChainAnalyzer` contract (normalize, validate, fetch source/artifacts, deterministic checks).
- Define normalized finding schema used across chains.

### B2. SUI analyzer (priority)
- Build Sui package/source resolver.
- Implement Move-specific static checks:
  - privileged mint/metadata mutation
  - admin transfer controls
  - fee/lock semantics
  - ownership/authority exposure
- Add confidence and explainability annotations.

### B3. EVM analyzer
- Add source retrieval (verified source + fallback paths).
- Add deterministic checks:
  - owner-only drains
  - hidden tax/fee logic
  - blacklist/allowlist transfer gating
  - mintability and supply controls
  - proxy/upgrade risk
- Normalize findings to common schema.

### B4. Solana analyzer
- Implement SVM program metadata extraction.
- Add Solana-relevant risk checks:
  - authority/upgrade controls
  - freeze/mint authority behavior
  - transfer restrictions
  - suspicious instruction routing
- Ensure no Move assumptions in Solana code path.

### B5. Chain auto-detection and override
- Build chain detection from address/program patterns.
- Support explicit chain override in all APIs/UI.

## C. AI Analysis and Scoring Engine

### C1. LLM orchestration
- Implement prompt templates per chain family.
- Add deterministic pre-check output as structured context to LLM.
- Add schema-constrained output parser.

### C2. Scoring model
- Implement weighted score calculation from deterministic + AI findings.
- Define severity mapping and final 0-100 score normalization.
- Add verdict bands: safe/low/medium/high/critical.

### C3. Calibration and quality harness
- Build labeled benchmark corpus.
- Implement evaluation runs for FN/FP targets.
- Track model/version-level quality metrics.

## D. API and Access Surface

### D1. Internal tRPC surface
- Implement typed procedures for analysis, history, reports, and user/account actions.

### D2. External REST API
- Implement versioned endpoints (`/api/v1/...`) with compatibility policy.
- Add API key auth, metering, and rate limits.
- Publish OpenAPI contract for external integrators.

### D3. CLI and report APIs
- Add developer CLI for scan + export actions.
- Add report retrieval endpoints and signed download URLs.

## E. Web Product and UX

### E1. Core scan UI
- Address/code input, chain picker, progress stages, and result dashboard.
- Show score, top findings, and plain-English explanations.

### E2. Findings detail UX
- Severity filtering, source snippet context, and remediation guidance.
- Confidence and evidence attribution view.

### E3. User account surfaces
- Auth flows (email + GitHub), profile, scan history, API keys page.
- Pro/private scan controls.

### E4. PDF reporting
- Generate branded PDF with executive summary and technical findings.
- Watermark rules by tier.

## F. Commerce and Entitlements

### F1. Billing
- Stripe integration for Pro subscriptions.
- API usage billing and pay-per-scan metering.

### F2. Entitlement enforcement
- Free tier limits, Pro unlimited, API tier limits by plan.
- Usage dashboards and limit warnings.

## G. Security and Compliance

### G1. Auth/security hardening
- Secure session handling, key hashing, secret rotation policy.
- RBAC enforcement and admin action controls.

### G2. Abuse prevention
- IP/user/api-key rate limits.
- anomaly detection for scan abuse and key leakage.

### G3. Auditability
- Full audit log of scans, billing-affecting events, key actions.

## H. Reliability and Operations

### H1. Observability
- Structured logs, metrics, traces.
- SLO dashboards for success rate and latency.

### H2. Alerting + incident runbooks
- Alerts for AI provider failures, scan failure spikes, db incidents.
- Runbooks for degraded mode and provider fallback.

### H3. Queueing and resilience
- Async scan queue for heavy contracts.
- Retries/circuit breakers for provider dependencies.

## I. Testing and Release Quality

### I1. Unit tests
- Scoring engine, chain analyzers, parsers, policy rules.

### I2. Integration tests
- API/database flows, auth, billing webhooks, report generation.

### I3. E2E and load tests
- Full user journeys from scan to export.
- Concurrency and latency envelope validation.

### I4. Release gates
- Must-pass criteria: build, tests, migrations, security checks, smoke tests.

## J. Documentation and GTM Readiness

### J1. Engineering docs
- Architecture, module contracts, API docs, env setup, runbooks.

### J2. Product docs
- User guide, limitations, risk disclaimers, interpretation guide.

### J3. Business ops docs
- Pricing operations, support workflows, incident escalation matrix.

## 4) Delivery Sequencing (Full Scope)

## Phase 1: Core Platform + SUI Analyzer + Basic Scoring
- Complete A1-A3, B1-B2, C1-C2, D1, E1, I1

## Phase 2: EVM + Solana + External API + History
- Complete B3-B5, D2, E2-E3, I2

## Phase 3: Billing + PDF + Hardening + Observability
- Complete E4, F1-F2, G1-G3, H1-H3, I3-I4

## Phase 4: Calibration + Launch Readiness
- Complete C3, J1-J3 and final launch checklist

## 5) Definition of Done (Product-Level)

- SUI-first behavior verified across API/UI defaults.
- All three chain analyzers implemented with chain-correct logic.
- End-to-end scan lifecycle operational with persistent history.
- Billing and entitlement controls enforced.
- Production monitoring/alerting and runbooks in place.
- Quality harness reports acceptable FN/FP envelopes.
- Documentation complete for engineering handoff and operations.
