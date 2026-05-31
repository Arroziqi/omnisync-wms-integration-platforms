# OmniSync WMS Integration Platform

OmniSync is a high-performance, production-ready internal operations integration platform designed to consolidate and synchronize inventory, product, order, and event data across multiple marketplace channels including **TikTok Shop**, **Shopee**, and **Lazada** into a single WMS.

Built using an asynchronous event-driven monorepo architecture, the platform prevents data mismatch, rate-limit bans, and order loss during peak sale seasons.

---

## 🚀 Key Features

* **Multichannel Token Lifecycle Management:** Proactive, encrypted background OAuth token renewal to eliminate integration downtime.
* **Reliable Asynchronous Sync (BullMQ + Redis):** Queue-based order and inventory ingestion using dynamic backoffs and a persistent Dead Letter Queue (DLQ).
* **Outbound Quota Manager:** Dynamic API request rate limiting per seller account to fully comply with platform-specific rate limits.
* **Webhook Signature Verification:** High-performance, timestamp-checked HMAC SHA-256 signature validation with a 24-hour Redis idempotency filter.
* **Auditable Operations:** Full user mutation logs, change delta snapshots, and comprehensive log streams.
* **Enterprise Security:** AES-256-GCM envelope encryption for tokens at rest, strict RBAC, and secure Docker secret loading.

---

## 📂 Monorepo Components

OmniSync is structured as an **Nx Monorepo Workspace** for modular and scalable engineering.

* `apps/api`: NestJS Fastify backend engine
* `apps/web`: Next.js App Router administrative dashboard
* `packages/shared`: Shared TypeScript domain models, schemas, and helpers
* `apps/api-e2e` / `apps/web-e2e`: E2E integration test suites

---

## 📚 Unified Documentation Hub

All technical and operational documentation is consolidated under the `docs/` directory.

> [!NOTE]
> For the complete visual portal index, open the **[Documentation Hub README](./docs/README.md)**.

* **[Developer Onboarding Guide](./docs/onboarding_guide.md):** Step-by-step local dev environment setup, TypeORM/DTO coding standards, connector customization guidelines, and BullMQ worker templates.
* **[High & Low-Level Architecture](./docs/architecture_guide.md):** HLA/LLA diagrams, decoupled worker flows, retry backoff algorithms, and system deployment architecture.
* **[API Reference & Database Schema](./docs/api_documentation.md):** 14 fully cataloged API modules (endpoints/payloads) and detailed TypeORM ERD database schemas.
* **[Production Operations & Deployment](./docs/deployment_guide.md):** Ubuntu VPS hardening (UFW/SSL), Docker Compose configuration, automated database backup cron scripts, and Cloud High-Availability (HA) autoscale triggers.
* **[Operational Handbook](./docs/operational_handbook.md):** Store integration guides, order recovery, manual stock adjustment overrides, queue monitoring, and disaster recovery processes.

---

## 🛠️ Quick Start (Local Development)

You have two options to develop locally: **Option A (Host Developer Mode)** or **Option B (Full Dockerized Dev Stack)**.

### Option A: Host Developer Mode (Recommended)
This runs database/queue services in Docker and the application builds directly on your host machine.

#### 1. Initialize Monorepo
Install the workspace node packages locally:
```bash
npm install
```

#### 2. Boot Local Infra Services
Launch only the PostgreSQL and Redis containers:
```bash
docker compose up -d postgres redis
```

#### 3. Initialize Database
Apply local environment credentials via `.env`, run structural migrations, and seed default data:
```bash
cp .env.example .env
npx nx run api:migration:run
npx nx run api:seed
```

> [!TIP]
> The database seeder initializes a default administrator account. You can use these credentials to log in to the dashboard:
> * **Email:** `admin@omnisync.io`
> * **Password:** `Secret123!`
> * **Role:** Admin (Full system access)

#### 4. Run the Platform
```bash
# Start backend API (Fastify)
npx nx serve api

# Start frontend admin dashboard (Next.js)
npx nx dev web
```

---

### Option B: Full Dockerized Dev Stack
This runs the entire system (including NestJS and Next.js with live-reloading) inside Docker containers. No local Node installation is needed on your host machine.

#### 1. Boot the Stack
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

#### 2. Initialize Database Inside Container
Run migrations and seeds within the running API container:
```bash
docker compose exec api npx nx run api:migration:run
docker compose exec api npx nx run api:seed
```

### 5. Running Test Suites
```bash
# Run unit tests
npx nx test api
npx nx test web

# Run E2E integrations
npx nx e2e api-e2e
```
