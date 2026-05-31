# OmniSync WMS Integration Platform — Developer Onboarding Guide

This onboarding guide is designed to help **Internal Developers** and **System Integrators** set up a local development environment, understand the monorepo architecture, extend channel connectors, implement async background workers, and run tests.

---

## 🛠️ 1. Local Development Environment Setup

OmniSync is managed as an Nx monorepo enclosing a NestJS backend application (`apps/api`) and a Next.js admin frontend dashboard (`apps/web`).

### 1.1 Prerequisites
Ensure your local machine has the following tools installed:
* **Node.js:** v18.18.0 or newer (LTS recommended)
* **npm:** v9.x or newer
* **Docker & Docker Compose:** For running local database and queue services
* **Git:** For version control

### 1.2 Monorepo Initialization
1. Clone the repository to your local development environment:
   ```bash
   git clone <repository-url> omnisync
   cd omnisync
   ```
2. Install the system dependencies:
   ```bash
   npm install
   ```

### 1.3 Launching Dev Infrastructure Services
The platform requires a local PostgreSQL database and a Redis instance for queue management. Launch only these containerized services using Docker Compose:
```bash
# Start Postgres and Redis in detached (background) mode
docker compose up -d postgres redis
```
* **PostgreSQL Dev Port:** `5432` (credentials: `omnisync` / `omnisync_pass`)
* **Redis Dev Port:** `6379` (credentials: none / default)

### 1.4 Setting Up Environment Variables
Create a local `.env` configuration file in the project root by copying the template:
```bash
cp .env.example .env
```
Ensure the local database and redis details match your local dev setup:
```ini
NODE_ENV=development
PORT=3333

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=omnisync
DB_PASSWORD=omnisync_pass
DB_DATABASE=omnisync_db

# Redis & Queue Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_CONCURRENCY=5

# Encryption Credentials (Used for AES-256-GCM token storage)
ENCRYPTION_KEY=your-32-byte-hex-encoded-development-key-goes-here
```

### 1.5 Database Migrations & Seeding
Prepare the database tables and apply default RBAC seed files:
```bash
# Run database migrations to construct schemas
npx nx run api:migration:run

# Populate seed data (default Super Admin and default permissions)
npx nx run api:seed
```

> [!TIP]
> The database seeder initializes a default administrator account. You can use these credentials to log in to the dashboard:
> * **Email:** `admin@omnisync.io`
> * **Password:** `Secret123!`
> * **Role:** Admin (Full system access)

---

## 📐 2. Coding Standards & Architecture

### 2.1 Workspace Structure
The project folder layout organizes boundaries to isolate logical domains:
* `apps/api/src/modules/`: Contains encapsulated modules for each domain (e.g., `orders`, `inventory`, `marketplace`). Each module should contain its controllers, services, entities, and DTOS.
* `packages/shared/`: Shared TypeScript models, utility classes, and common type definitions. Do not place business logic here.

### 2.2 NestJS Coding Conventions
Keep modules highly structured by adhering to these conventions:
* **DTO Validation:** Enforce strict request payloads using `class-validator` and `class-transformer` decorators inside your DTO files.
* **Database Access:** Access PostgreSQL strictly using TypeORM repositories. Avoid writing raw SQL strings; leverage the TypeORM QueryBuilder instead.
* **Global Error Filter:** Never catch and swallow database or network exceptions silently. Throw standard NestJS HttpExceptions (`NotFoundException`, `BadRequestException`) to let the global exception filter format clean API responses.
* **Audit Logging:** Any action modifying state (e.g., order cancel, inventory adjustment) must be captured by injecting `AuditLogService` and recording the old vs new value maps.

---

## 🔌 3. Extending the Platform: Adding a New Marketplace Connector

To add a new marketplace channel connection (e.g., Tokopedia):

### 3.1 Implementing the Connector Interface
All connectors must reside under `apps/api/src/modules/marketplace/connectors/` and implement the standard `IMarketplaceConnector` interface:
```typescript
import { Injectable } from '@nestjs/common';
import { IMarketplaceConnector } from '../interfaces/marketplace-connector.interface';
import { MarketplaceTokens } from '../interfaces/marketplace-tokens.interface';

@Injectable()
export class TokopediaConnectorService implements IMarketplaceConnector {
  getAuthorizationUrl(state: string): string {
    // Return redirected OAuth authorization URL
    return `https://seller.tokopedia.com/oauth/authorize?client_id=...&state=${state}`;
  }

  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    // Exchange callback auth code for access & refresh tokens
    return {
      accessToken: 'encrypted_access_token',
      refreshToken: 'encrypted_refresh_token',
      expiresIn: 86400,
    };
  }

  async refreshTokens(refreshToken: string): Promise<MarketplaceTokens> {
    // Refresh expired tokens
    return {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresIn: 86400,
    };
  }

  async getAccountHealth(accessToken: string): Promise<boolean> {
    // Perform light diagnostic call to vendor API to verify access validity
    return true;
  }
}
```

### 3.2 Registering the Connector
Once implemented, register your new connector service inside `MarketplaceModule`:
1. Import the service in `apps/api/src/modules/marketplace/marketplace.module.ts`.
2. Add your service to the `providers` list.
3. Update the `MarketplaceConnectorResolver` class to resolve your connector dynamically when the marketplace type matches:
   ```typescript
   resolve(marketplace: string): IMarketplaceConnector {
     switch (marketplace.toUpperCase()) {
       case 'TIKTOK': return this.tiktokConnector;
       case 'SHOPEE': return this.shopeeConnector;
       case 'LAZADA': return this.lazadaConnector;
       case 'TOKOPEDIA': return this.tokopediaConnector; // Register here
       default: throw new Error(`Unsupported marketplace: ${marketplace}`);
     }
   }
   ```

---

## ⚡ 4. Creating a New Queue Worker

Background tasks utilize BullMQ queues backed by Redis storage.

### 4.1 Queue Registration
Add the queue name to the `queue.constants.ts` file:
```typescript
export const TOKOPEDIA_SYNC_QUEUE = 'tokopedia-sync';
```
Register the queue in the `QueueModule` (`apps/api/src/modules/queue/queue.module.ts`) using the `BullModule.registerQueue` decorator helper.

### 4.2 Implementing the Processor (Worker)
Create a processor file (e.g., `tokopedia-sync.processor.ts`) extending NestJS's `WorkerHost`:
```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { TOKOPEDIA_SYNC_QUEUE } from '../queue/queue.constants';

@Injectable()
@Processor(TOKOPEDIA_SYNC_QUEUE, { concurrency: 2 })
export class TokopediaSyncProcessor extends WorkerHost {
  async process(job: Job<any>): Promise<any> {
    // Worker job execution logic
    const { storeId, action } = job.data;
    
    // Perform processing tasks
    return true;
  }
}
```

### 4.3 Error Handling & Retry Policies
When queue jobs fail, always ensure they are set up to handle automatic retries:
1. Configure automatic exponential backoffs when queueing the task inside your Queue Service publisher:
   ```typescript
   await this.myQueue.add('sync-job', jobData, {
     attempts: 5,
     backoff: {
       type: 'exponential',
       delay: 2000, // 2s -> 4s -> 8s -> 16s -> 32s
     },
   });
   ```
2. Implement a listener for final failures inside the Processor using the `@OnWorkerEvent('failed')` decorator to record failed items into the Dead Letter Queue (DLQ / `failed_jobs` table) for visibility:
   ```typescript
   @OnWorkerEvent('failed')
   async onFailed(job: Job, error: Error): Promise<void> {
     const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
     if (isFinalAttempt) {
       // Persist payload to FailedJobEntity in database
       await this.failedJobRepo.save({
         bullJobId: job.id,
         finalError: error.message,
         jobData: job.data,
         status: 'DEAD',
       });
     }
   }
   ```

---

## 🧪 5. Testing & Verification

OmniSync maintains high code quality standards. Ensure all tests pass before proposing a PR.

### 5.1 Running Tests
```bash
# Run NestJS API unit tests
npx nx test api

# Run NestJS API integration and E2E tests
npx nx e2e api-e2e

# Run Next.js Web dashboard unit tests
npx nx test web
```

### 5.2 Linting & Formatting Check
Ensure your changes meet ESLint and Prettier guidelines:
```bash
# Run ESLint check
npx nx lint api
npx nx lint web

# Run Prettier format check
npx prettier --check "apps/**/*.{ts,tsx}"
```
