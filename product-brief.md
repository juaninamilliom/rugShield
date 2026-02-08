# Production-Ready Product Blueprint — RugShield

---

## 0. Authoritative Product Direction Update (2026-02-08)

This section supersedes any conflicting earlier wording in this brief.

- RugShield is **SUI-first** at product and engineering levels.
- Chain rollout priority is:
1. `sui` (primary/default)
2. `evm` (Base + Ethereum)
3. `solana`
- Chain model correction:
1. **Sui uses Move** (Sui Move packages/modules).
2. **Solana does not use Move** (Solana programs/SVM model).
3. EVM chains use Solidity/Vyper-compatible bytecode/source.
- Scope directive: execute **full implementation scope** (do not reduce scope).

## 1. PRODUCT DEFINITION

**Product Name:** RugShield

**Tagline:** AI-powered smart contract security auditing for the masses

**Elevator Pitch:** RugShield analyzes Solidity and Move smart contracts using AI to detect rug pulls, security vulnerabilities, and suspicious patterns before you invest. Upload a contract address or source code, get an instant security score with detailed explanations. Built for crypto traders who want to avoid scams without paying $10K+ for manual audits.

---

## 2. USERS & MARKET

**Primary Users:** Crypto traders and investors (DeFi users, meme coin hunters, NFT buyers) who want to verify contract safety before investing. Technical proficiency: semi-technical (can read basic code but not security experts).

**Secondary Users:** 
- Smart contract developers wanting quick security checks during development
- Crypto project teams needing affordable pre-launch audits
- API consumers (other tools integrating contract security checks)

**User Technical Proficiency:** Semi-technical - can understand "reentrancy vulnerability" with explanation, may not understand assembly-level exploits.

**Market Context:**
Competitors/Alternatives:
1. **Manual audits (CertiK, Trail of Bits)** - $10K-$50K per audit, 2-4 week turnaround. Too expensive and slow for retail traders.
2. **Token sniffer tools (Honeypot.is, RugDoc)** - Basic automated checks, often miss sophisticated attacks. Free but limited.
3. **Doing nothing / YOLO investing** - Most common approach, results in frequent rug pulls and losses.

**Opening:** Manual audits are unaffordable for retail; existing free tools miss advanced exploits. AI can provide instant, affordable analysis that's better than "doing nothing" but cheaper than manual audits.

---

## 3. PROBLEM & VALUE PROPOSITION

**Core Problem:** Crypto traders lose money to rug pulls and malicious contracts because they can't afford $10K audits and free tools miss sophisticated attacks. Every meme coin investment is a gamble on contract security.

**Current Workaround:** 
- Check if contract is verified on blockchain explorer (only proves source matches, not that it's safe)
- Run through free honeypot detectors (miss many attack vectors)
- Ask in Discord/Telegram "is this safe?" (unreliable, often from paid shills)
- Check if contract is renounced (doesn't prevent all attacks)
- Just hope for the best (most common)

**Success Metric:** False negative rate <5% (missed rug pulls), false positive rate <20% (flagged safe contracts). User trusts the tool enough to skip investments it flags as risky.

**Why Now:** 
- GPT-4/Claude can understand smart contract logic at expert level
- Rug pulls and scams have reached epidemic levels in 2024-2025 (Solana meme coins especially)
- Retail investors are tired of losing money but still want to invest in new projects
- AI-powered code analysis has proven effective in traditional security (GitHub Copilot, Snyk)

---

## 4. FEATURE SPECIFICATION

### 4a. MVP Features (Launch With These — No More, No Less)

| # | Feature Name | User Story | Acceptance Criteria | Priority |
|---|---|---|---|---|
| 1 | Contract Analysis | As a trader, I want to paste a contract address or source code so that I get a security analysis in 60 seconds | Analysis completes in <60s, returns score 0-100, lists specific vulnerabilities found, explains in plain English | P0 |
| 2 | Security Score | As a trader, I want a simple score (0-100) so that I can quickly decide if this is safe to invest in | Score calculated from 10+ security checks, color-coded (red/yellow/green), displays prominently | P0 |
| 3 | Vulnerability Details | As a trader, I want to see specific issues found so that I understand WHY it's risky | Each vulnerability has: name, severity (critical/high/medium/low), explanation, code snippet showing the issue, recommended action | P0 |
| 4 | Common Rug Pull Patterns | As a trader, I want to detect known rug pull patterns (mint functions, blacklist, hidden fees) so that I avoid obvious scams | Detects: unlimited minting, owner-only functions, transfer restrictions, hidden taxes >10%, honeypot mechanisms. Shows which patterns found. | P0 |
| 5 | Multi-Chain Support | As a trader, I want to check contracts across SUI, EVM, and Solana so that I can verify investments across chains | Supports SUI (Move, default), Base/Ethereum (EVM), and Solana (SVM program model). Auto-detects chain from address format and explorer metadata. | P0 |
| 6 | API Access | As a developer, I want API access so that I can integrate contract checks into my own tools | REST API with authentication, rate limiting (10 req/min free, 100 req/min paid), documented endpoints, example code | P1 |
| 7 | Scan History | As a user, I want to see my past scans so that I can re-check contracts I analyzed before | Dashboard shows last 50 scans, searchable by address, displays score and date | P1 |
| 8 | PDF Report Export | As a project owner, I want to download a PDF audit report so that I can share it with my community | Generate PDF with logo, executive summary, detailed findings, timestamp. Professional formatting. | P1 |

### 4b. Post-MVP Features (Next 2-3 Iterations)

1. **Real-time Monitoring** - Subscribe to contract addresses, get alerts when ownership changes or suspicious txns detected. Deferred because requires ongoing infrastructure costs.
2. **Comparative Analysis** - Compare a new contract against known safe/scam contracts to find similarities. Deferred because requires large dataset of labeled contracts.
3. **Code Simulation** - Run contract functions in sandbox to detect runtime exploits. Deferred because complex and may increase scan time beyond 60s target.
4. **Community Verification** - Users can upvote/downvote audit accuracy, flag false positives. Deferred because requires user accounts and moderation.
5. **Whale Wallet Tracking** - See if known whale wallets hold this token (trust signal). Deferred because requires integration with wallet tracking services.
6. **Telegram Bot** - Paste contract address in Telegram, get instant analysis. Deferred until we validate web demand first.
7. **Chrome Extension** - Auto-scan contracts when you visit Etherscan/BaseScan. Deferred until proven product-market fit.

### 4c. Explicit Non-Goals

- **We will NOT audit off-chain code** (backend APIs, websites). Smart contracts only.
- **We will NOT provide legal/financial advice.** We detect technical vulnerabilities, not investment recommendations.
- **We will NOT guarantee 100% accuracy.** This is an AI-assisted tool, not a replacement for professional audits. We'll clearly state limitations.
- **We will NOT store or analyze private keys/wallets.** We analyze public contract code only.
- **We will NOT build a token price tracker.** We integrate with existing price APIs if needed but don't compete with CoinGecko.

---

## 5. USER FLOWS & EXPERIENCE

**Onboarding Flow:**
1. User lands on homepage → sees example contract analysis (pre-loaded famous rug pull)
2. Clear CTA: "Paste contract address or code"
3. User pastes → clicks "Analyze"
4. Loading state (15-60s): "Analyzing contract bytecode... Checking for rug pull patterns... AI reviewing logic..."
5. **Aha moment:** Results page shows clear SAFE/RISKY verdict with score and top 3 findings
6. User can drill into details, export PDF, or analyze another contract

**Core Loop:**
1. User discovers new token on Twitter/Discord
2. Copies contract address
3. Pastes into RugShield
4. Reviews security score + findings
5. Makes invest/skip decision
6. (Loop repeats for next token)

**Key User Journeys:**

*Happy Path: Detecting a Rug Pull*
1. User pastes contract address for new meme coin
2. Scan completes in 45s
3. Score: 15/100 (RISKY - Red)
4. Top finding: "CRITICAL: Owner can mint unlimited tokens via mintTo() function"
5. User sees code snippet highlighting the vulnerability
6. User decides NOT to invest, saves $500 from rug pull
7. User shares RugShield link in Discord as proof

*Edge Case: Legitimate Contract Flagged*
1. User pastes well-known contract (e.g., USDC)
2. Scan shows 92/100 (SAFE - Green)
3. Shows "INFO: Pausable by admin - expected for stablecoin compliance"
4. User understands this is acceptable centralization, not a rug pull
5. Context matters - AI explains WHY this pattern exists

*Power User: API Integration*
1. Developer wants to auto-check contracts before listing on their DEX
2. Signs up for API key
3. Integrates `/analyze` endpoint
4. Sets up webhook to reject listings with score <50
5. Reduces scam listings by 80%

**Notifications & Communication:**
- **Email:** Only for API key delivery and password reset (no marketing spam)
- **In-app alerts:** If scan takes >60s, show "Complex contract, may take up to 2 minutes"
- **Rate limit warnings:** "You've used 8/10 free scans today. Upgrade for unlimited scans."

---

## 6. BUSINESS MODEL & CONSTRAINTS

**Revenue Model:** Freemium + API

**Pricing Tiers:**
- **Free:** 10 scans/day, public results, basic security checks, watermarked PDF exports
- **Pro ($50/mo):** Unlimited scans, private results, advanced AI analysis, priority processing, branded PDF exports, email support
- **API ($0.05/scan):** Pay-as-you-go for developers, volume discounts at 1000+ scans/mo, dedicated support, SLA guarantees

**Budget Constraints:** 
- MVP budget: $50/mo max
  - OpenAI API: ~$20/mo (estimate 1000 scans @ $0.02/scan avg)
  - Hosting: $10/mo (Vercel free + Railway $5)
  - Database: $10/mo (Railway Postgres)
  - Blockchain RPC: Free tier (Alchemy/Infura)
- Scaling budget at 10K scans/mo: $300/mo
  - OpenAI API: $200/mo
  - Hosting: $50/mo
  - Database: $50/mo

**Timeline:** 2 weeks to MVP, then iterate based on user feedback

**Team Size & Skills:** Solo developer (Beto), using Claude Code + Codex for implementation. Stack: TypeScript/Next.js (familiar), PostgreSQL (standard), OpenAI API (proven).

**Regulatory/Compliance Requirements:** 
- **GDPR:** Minimal - we don't store PII beyond email for accounts. Clear privacy policy.
- **Financial regulations:** NOT financial advice - clear disclaimer that this is a technical analysis tool only
- **No specific blockchain regulations** currently, but monitor for changes
- **DMCA/IP:** Analyze public blockchain data (no copyright issues)

---

## 7. TECHNICAL REQUIREMENTS & PREFERENCES

**Platform:** Web only (responsive for mobile). CLI and API for developers.

**Existing Tech Preferences:** 
- **Frontend:** Next.js 14+ (App Router) with TypeScript - team familiar, great DX, Vercel deployment
- **Backend:** Next.js API routes + tRPC for type safety
- **Database:** PostgreSQL - reliable, free tier available, good for structured data
- **AI:** OpenAI GPT-4 or Anthropic Claude 3 Opus - proven code analysis, function calling support
- **Blockchain:** SUI SDK + RPC (primary), Ethers.js for EVM/Base, @solana/web3.js for Solana

**Performance Requirements:**
- Expected concurrent users at launch: 10-50
- Expected concurrent users at scale (12 months): 500-1000
- **Latency requirements:** 
  - Simple contracts: <30s analysis time
  - Complex contracts: <90s analysis time
  - API responses: <200ms (excluding AI analysis time)
- **Uptime requirement:** 99.5% ("best effort" for MVP, 99.9% after revenue validation)

**Data Requirements:**
- Expected data volume at launch: ~1K scans, ~100 users
- Expected data volume at scale: ~100K scans/mo, ~5K users
- **Data retention:** 
  - Free tier: Public scan results kept 30 days
  - Pro tier: Private results kept 1 year
  - API tier: Scan results available via API for 90 days
- **Backup:** Daily database backups, 7-day retention

**Integration Requirements:**
- **Blockchain RPC providers:** Sui fullnode providers (primary), Alchemy (Ethereum/Base), Helius (Solana)
- **Payment processing:** Stripe (for Pro subscriptions)
- **AI providers:** OpenAI API or Anthropic API - whichever has better rate limits/pricing
- **Email:** Resend or SendGrid (transactional only)
- **Export:** PDF generation via React-PDF or Puppeteer

**Offline Requirements:** None - requires internet for blockchain data and AI analysis

---

## 8. DESIGN & BRAND

**Design Direction:** **Technical/Minimal** - Think Etherscan meets GitHub. Clean, data-dense, trustworthy. Not playful - this is about security and money.

Reference products:
- Etherscan (information density, trust signals)
- Linear (clean UI, dark mode)
- Snyk (security reporting style)

**Accessibility Requirements:** WCAG 2.1 AA minimum
- Color contrast for readability
- Keyboard navigation for all features
- Screen reader support for findings
- Clear focus states

**Internationalization:** English only for MVP. Consider Spanish/Chinese post-validation.

**Dark Mode:** Required - crypto traders expect it, better for viewing charts/data

---

## 9. OPERATIONAL REQUIREMENTS

**Observability:**

*Logging:*
- Contract analysis requests (address, chain, timestamp, result score)
- AI API calls (model, tokens used, latency, errors)
- User actions (signup, login, export PDF)
- Rate limit hits and violations
- Error stack traces with context

*Monitoring:*
- **Critical metrics:**
  - Analysis success rate (target: >95%)
  - Average analysis time (target: <45s)
  - AI API error rate (target: <2%)
  - User signup conversion (free → pro)
- **Infrastructure:**
  - Database connection pool usage
  - API response times (p50, p95, p99)
  - Memory/CPU usage

*Alerting:*
- **Wake up at 3am:**
  - AI API errors >10% for 5 minutes (service down)
  - Analysis success rate <80% for 10 minutes (broken functionality)
  - Database down
- **Can wait until morning:**
  - Analysis time >90s for 20% of requests (performance degradation)
  - Free tier users hitting rate limits (expected behavior)
  - Individual scan failures (retry queue will handle)

**Analytics:**

*Product analytics:*
- Which chains get scanned most? (prioritize optimization)
- What vulnerabilities are most common? (educational content)
- Where do users drop off in onboarding?
- Free → Pro conversion funnel
- Feature usage (PDF export, API calls)

*Business analytics:*
- MRR and churn rate
- CAC (if running ads)
- Scan volume trends
- API usage per customer
- Support ticket volume by category

**Support Model:** 
- **Free tier:** Self-service docs + FAQ (no email support)
- **Pro tier:** Email support, 24-hour response SLA weekdays
- **API tier:** Email + Discord channel, 12-hour response SLA, dedicated account manager at $500+/mo

---

## 10. SECURITY & TRUST

**Authentication:**
- Email/password (Resend magic links for passwordless option)
- Social login: GitHub only (crypto devs use it)
- **No MetaMask login for MVP** (confusing UX, adds complexity)
- MFA: Optional (TOTP via authenticator app)

**Authorization Model:**
- Simple user/admin RBAC
- **Roles:**
  - Anonymous: 3 scans/day, no history, watermarked exports
  - Free user (email verified): 10 scans/day, saved history, watermarked exports
  - Pro user: Unlimited scans, private results, branded exports
  - API user: Rate limits based on tier, usage metering
  - Admin: Full access, can flag scans, manage users

**Data Sensitivity:**
- **Most sensitive:** User email addresses, API keys, payment info (Stripe tokenized)
- **Public:** Scan results from free tier (viewable via share link)
- **Private:** Pro tier scan results (user only)
- Contract addresses are public blockchain data (no privacy concerns)

**Audit Requirements:**
- **Audit log:** Track who scanned what and when (for abuse detection)
- Log API key usage (billing accuracy)
- Log admin actions (security)
- **Not needed:** HIPAA/SOC2 compliance for MVP

**Security Measures:**
- API keys hashed in database (bcrypt)
- Rate limiting on auth endpoints (prevent brute force)
- CORS restrictions on API
- Input validation on contract addresses (prevent injection)
- Scan result isolation (users can't see others' private scans)
- Secrets stored in env vars, never committed

---

---

## WHAT I NEED YOU TO PRODUCE

Based on everything above, generate a complete, implementation-ready technical specification covering:

### A. Architecture Overview
- System architecture diagram description (components and how they connect)
- Technology stack with specific version recommendations and justification for each choice
- Monolith vs. microservices decision with rationale
- Data flow diagrams for the 2-3 most critical operations

### B. Database Design
- Complete schema: tables/collections, columns/fields, data types, constraints
- Relationships and cardinality (1:1, 1:N, M:N with junction tables)
- Indexing strategy tied to actual query patterns
- Migration strategy and versioning approach
- Seed data requirements for development/testing
- Multi-tenancy approach if applicable

### C. API Design
- REST or GraphQL (with justification)
- Complete endpoint inventory with HTTP methods, request/response schemas, status codes
- Authentication and authorization per endpoint
- Rate limiting strategy
- Pagination, filtering, and sorting conventions
- API versioning strategy
- Webhook design if applicable
- Error response format and error code catalog

### D. Frontend Architecture
- Component hierarchy and page structure
- State management approach and data flow
- Routing structure with auth guards
- Form validation strategy (client + server)
- Responsive design breakpoints and approach
- Loading states, error states, empty states for every view
- Optimistic UI updates where applicable

### E. Authentication & Authorization
- Complete auth flow (signup, login, password reset, email verification, MFA)
- Session management (JWT vs. sessions, token refresh strategy, token storage)
- Permission model with specific roles and capabilities matrix
- API key management for integrations if needed

### F. Third-Party Services
- For each service: what it does, why this provider, fallback/alternative, estimated cost at launch and at scale
- Integration approach for each (SDK, API, webhook)

### G. Testing Strategy
- Unit test coverage targets and what to test
- Integration test approach for critical paths
- E2E test scenarios mapped to user journeys
- Load testing plan with expected thresholds
- Testing environments (local, staging, production)

### H. CI/CD & Deployment
- Repository structure (monorepo vs. polyrepo)
- Branch strategy and PR workflow
- CI pipeline stages (lint, test, build, security scan, deploy)
- Deployment target and strategy (blue-green, canary, rolling)
- Environment management (dev, staging, production)
- Infrastructure as code approach
- Rollback procedure

### I. Security Hardening
- OWASP Top 10 mitigations specific to this product
- Input validation and sanitization strategy
- CORS, CSP, and security header configuration
- Secrets management approach
- Dependency vulnerability scanning
- Data encryption (at rest, in transit, application-level if needed)

### J. Monitoring & Incident Response
- Health check endpoints
- Key metrics and SLIs/SLOs
- Alerting rules and escalation paths
- Runbook for the 3 most likely production incidents
- Log aggregation and search strategy

### K. Cost Estimation
- Monthly infrastructure cost breakdown at launch and at 10x scale
- Third-party service costs at launch and at scale
- Cost optimization opportunities and triggers for when to optimize

### L. Implementation Roadmap
- Phase 1 (MVP): Specific deliverables, estimated timeline, definition of done
- Phase 2 (Hardening): What to add post-launch for stability
- Phase 3 (Growth): Features and infrastructure for scaling
- Technical debt tracker: What shortcuts are acceptable for MVP and when to pay them back

### M. Risk Register
- Top 5 technical risks with likelihood, impact, and mitigation strategy
- Dependency risks (third-party services going down, API changes, pricing changes)
- Scaling bottlenecks and when they'll hit

---

## OUTPUT FORMAT REQUIREMENTS

Structure the spec with:
- **Clear headings** for each section (A through M)
- **Code blocks** for schemas, API definitions, configuration examples
- **Tables** for comparisons, matrices, feature grids, cost breakdowns
- **Mermaid diagrams** for architecture, data flows, auth flows, deployment pipelines

**The spec should be detailed enough that an engineer unfamiliar with the project could begin implementation without a follow-up conversation.**

Include:
- Specific version numbers for all dependencies
- Exact npm package names
- Environment variable names and example values
- File/folder structure
- Command-line instructions for setup
- Sample data for testing

Make it **copy-paste ready** for implementation.
