# OmniSync WMS Integration Platform — High-Level & Low-Level Architecture Guide

This document describes the high-level architecture (HLA) and low-level architecture (LLA) of the OmniSync WMS Integration Platform. It outlines the event-driven modular design, service boundaries, database design, queue topologies, security controls, and recovery workflows that govern the platform.

---

## 1. High-Level Architecture (HLA)

### 1.1 Architecture Overview
OmniSync uses an **event-driven, modular monorepo architecture** designed for high throughput, strict operational reliability, and horizontal scalability. The platform decouples synchronous client requests from long-running marketplace operations.

```text
  ┌───────────────────────────────────────────────┐
  │                 Admin Users                  │
  └──────────────────────┬────────────────────────┘
                         │
                         ▼
               ┌───────────────────┐
               │   Next.js Admin   │
               │     Dashboard     │
               └─────────┬─────────┘
                         │ HTTPS
                         ▼
               ┌───────────────────┐
               │    API Gateway    │
               │  (NestJS Gateway) │
               └─────────┬─────────┘
                         │
  ┌──────────────────────┼──────────────────────┐
  ▼                      ▼                      ▼
┌──────────────┐  ┌──────────────┐   ┌──────────────┐
│ Auth Service │  │ Config/Admin │   │ Marketplace  │
│              │  │   Service    │   │   Service    │
└──────┬───────┘  └──────┬───────┘   └──────┬───────┘
       │                 │                  │
       │                 │                  │
       ▼                 ▼                  ▼
 ┌──────────────────────────────────────────┐
 │            PostgreSQL Database           │
 └──────────────────────────────────────────┘
                        ▲
                        │
               ┌────────┴───────┐
               │ Webhook Service│ ◄──── Incoming Events (Shopee/TikTok/Lazada)
               └────────┬───────┘
                        │
                        ▼
               ┌────────────────┐
               │ Redis + BullMQ │
               │  Queue System  │
               └────────┬───────┘
                        │
  ┌─────────────────────┼─────────────────────┐
  │                     │                     │
  ▼                     ▼                     ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Order Worker │ │Product Worker│ │Inventory     │
│              │ │              │ │Worker        │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
             ┌────────────────────┐
             │ Marketplace APIs   │
             │                    │
             │ - TikTok Shop      │
             │ - Shopee           │
             │ - Lazada           │
             └────────────────────┘
```

---

### 1.2 Core Architectural Principles

* **Event-Driven Processing:** All integration workflows (order ingestion, inventory adjustments, and product updates) are decoupled from public-facing endpoints using a persistent queue. This prevents platform lag during peak sale periods (e.g., 11.11 shopping festivals).
* **Failure Isolation:** An outage on Shopee's API does not impact Lazada or TikTok Shop operations. Similarly, backend worker failures do not degrade Nginx or frontend dashboard responsiveness.
* **Outbound Rate Limiting & Quota Management:** Integrating external APIs requires strict compliance with vendor rate limits. The **API Quota Manager** dynamically throttles outbound marketplace calls per connected seller account using Redis.
* **Strict State Control:** Order state transitions undergo verification to prevent historical overrides (e.g., preventing a cancelled webhook event from rolling back an order that has already been shipped).

---

## 2. High-Level System Components

### 2.1 Admin Dashboard (Next.js)
* **Purpose:** Provides operational visibility and management controls for non-technical operations teams and system administrators.
* **Stack:** Next.js (App Router), TailwindCSS, React Query, Lucide Icons.
* **Core Modules:** Unified Sync Console, Webhook Logs, Manual Resync Controls, Notification Center.

### 2.2 API Gateway (NestJS Gateway)
* **Purpose:** Centralized entry point enforcing API security, rate-limiting, liveness probes, and routing to standard internal modules.
* **Stack:** NestJS Core, Fastify, Helmet, RateLimiter.

### 2.3 Webhook Service
* **Purpose:** Handles extremely high-throughput webhook streams from Shopee, Lazada, and TikTok Shop.
* **Security Controls:**
  * **Signature Validation:** Enforces SHA-256 HMAC verification using marketplace-specific client keys.
  * **Idempotency Filter:** Thwarts duplicate payloads via Redis locks before queue publishing.
  * **Replay Defenses:** Compares request timestamps against a strict 5-minute threshold.

### 2.4 Queue Hub (Redis + BullMQ)
* **Purpose:** Organizes, schedules, and throttles transactional operations.
* **Queue Topologies:**
  * `order-sync.queue` (High priority, critical path)
  * `inventory-sync.queue` (High priority, prevents overselling)
  * `product-sync.queue` (Medium priority)
  * `retry.queue` & `notification.queue` (Low priority)

### 2.5 Worker Clusters
* **Order Sync Worker:** Parses and transforms marketplace payloads, reconciles SKU mappings, and persists unified order records.
* **Inventory Worker:** Coordinates stock changes in real-time, executing outbound adjustments back to marketplaces.
* **Retry Worker:** Periodically processes temporary marketplace connection failures using exponential backoff schedules.

---

## 3. Low-Level Architecture (LLA)

### 3.1 Backend Folder Layout
OmniSync is structured as an **Nx Monorepo Workspace** for optimal build and dependency management.

```text
omnisync/
├── apps/
│   ├── api/                   # Core NestJS API backend
│   │   ├── src/
│   │   │   ├── app/           # System bootstrapping and global filters
│   │   │   ├── config/        # Environment and typeorm configs
│   │   │   ├── database/      # Database migrations & seeds
│   │   │   └── modules/       # Encapsulated functional domains
│   │   │       ├── audit/     # User audit trails
│   │   │       ├── auth/      # JWT auth, passport, guards
│   │   │       ├── inventory/ # Warehouse and stock management
│   │   │       ├── marketplace/# Connection & connector interfaces
│   │   │       ├── orders/    # Order matching, syncing, and processors
│   │   │       ├── queue/     # BullMQ configurations & Quota Manager
│   │   │       └── webhooks/  # Marketplace webhook endpoints
│   ├── api-e2e/               # E2E test suites for API
│   ├── web/                   # Next.js frontend dashboard
│   └── web-e2e/               # E2E test suites for Next.js app
└── packages/
    └── shared/                # Common types, utilities, and constants
```

---

### 3.2 Marketplace Connector Interface
All channel-specific logic (Shopee, Lazada, TikTok) implements the unified `IMarketplaceConnector` interface, ensuring that the core synchronization core remains decoupled from external vendor API specs.

```typescript
export interface IMarketplaceConnector {
  getAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<MarketplaceTokens>;
  refreshTokens(refreshToken: string): Promise<MarketplaceTokens>;
  getAccountHealth(accessToken: string): Promise<boolean>;
}
```

---

## 4. Key Workflows

### 4.1 Secure Webhook Processing Lifecycle
```text
Webhook Stream ──► Validate Timestamp ──► Validate Signature ──► Check Replay Attacks
                                                                        │
                                                                        ▼
   Done ◄── Process Job ◄── Push to BullMQ ◄── Acquire Redis Lock ◄── Idempotency Key check
```

1. **Signature Verification:** Re-computes signature using request body and stored marketplace credentials, comparing it to the webhook header.
2. **Idempotency Check:** Locks the unique event identifier in Redis (`webhook:idempotency:<event_id>`) for 24 hours. If lock acquisition fails, the request is discarded as a duplicate.
3. **Queue Publishing:** Publishes job to `order-sync.queue` with immediate `200 OK` return to the marketplace platform.

### 4.2 Auto-Retry & Dead Letter Queue (DLQ) Flow
```text
Worker Job Failure
      │
      ▼
Increment Attempt Count
      │
      ├─── Attempt < 5 ──► Apply Exponential Backoff (2^attempt * 1000ms) ──► Re-queue
      │
      └─── Attempt = 5 ──► Move to DLQ (failed_jobs table) ──► Trigger Dashboard Alert & Notifications
```

1. **Backoff Formula:** `delay = Math.pow(2, attemptsMade) * 1000ms`.
2. **Recovery Action:** On the 5th failed attempt, the BullMQ job is removed from active loops.
3. **DLQ Persistence:** A new `FailedJobEntity` record is written to the database with `bullJobId`, `finalError`, `jobData`, and a state set to `DEAD`.
4. **Operations Alert:** An automated in-app alert is broadcasted via `NotificationService` to operational dashboards.

---

## 5. Security & Infrastructure Architecture

### 5.1 Security Controls Matrix
OmniSync secures marketplace integrations and operations at every boundary:

| Boundary | Control Mechanism | Implementation |
| :--- | :--- | :--- |
| **User Access** | Role-Based Access Control (RBAC) | NestJS JWT Guards checking user role permissions (e.g., `role:operations`). |
| **Credential Storage** | Envelope Encryption (AES-256-GCM) | Marketplace access/refresh tokens are encrypted before database persistence using unique host-injected keys. |
| **Environment Integrity** | Docker File-Based Secrets | Production secrets (db password, encryption keys) are mounted inside secure, non-readable root directories. |
| **Gateway Safety** | Reverse Proxy Hardening | Nginx enforces strict HTTP Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options). |

### 5.2 Deployment Topology
```text
           [ HTTPS Requests ]
                   │
                   ▼
     [ hardened Nginx Reverse Proxy ]
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    [ Next.js Web ]    [ NestJS API ]
   (Port 3000 / Web)   (Port 3333 / API)
         │                   │
         │                   ├──────────────► [ Redis Cache & BullMQ ]
         │                   │                   (Port 6379)
         ▼                   ▼
     ┌───────────────────────────┐
     │  PostgreSQL Master DB     │
     │      (Port 5432)          │
     └───────────────────────────┘
```

For guidelines on setting up local developer environments and writing connectors, refer to the **[Developer Onboarding Guide](./onboarding_guide.md)**. For deployment, provisioning, and Cloud HA setups, refer to the **[Production Operations & Deployment Guide](./deployment_guide.md)**.
