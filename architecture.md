# OmniSync WMS Integration Platform

# High Level Architecture (HLA)

## 1. Architecture Overview

OmniSync WMS Integration Platform uses an event-driven modular architecture designed for:

* scalability
* reliability
* maintainability
* asynchronous processing
* secure marketplace integration

The system separates operational concerns into multiple services to improve extensibility and fault isolation.

---

# 2. High Level Architecture Diagram

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
 │                      │                      │
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

                        │
                        ▼

               ┌────────────────┐
               │ Webhook Service│
               └───────┬────────┘
                       │
                       ▼

               ┌────────────────┐
               │ Redis + BullMQ │
               │ Queue System   │
               └───────┬────────┘
                       │
 ┌─────────────────────┼─────────────────────┐
 │                     │                     │
 ▼                     ▼                     ▼

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Order Worker │ │Product Worker│ │Inventory     │
│              │ │              │ │Worker         │
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

# 3. Architectural Principles

## Event-Driven Processing

All heavy synchronization processes are handled asynchronously using queues.

Benefits:

* better scalability
* retry capability
* failure isolation
* rate limit management

---

## Modular Service Separation

Each service has isolated responsibilities.

Benefits:

* easier maintenance
* independent scaling
* better fault isolation
* easier onboarding for developers

---

## Queue-Based Reliability

Marketplace synchronization uses queue workers to prevent blocking API requests.

Benefits:

* retry mechanisms
* delayed jobs
* dead letter queue
* distributed processing

---

## Secure Integration Architecture

Security is enforced at all integration layers:

* OAuth token management
* encrypted secrets
* webhook validation
* RBAC
* JWT authentication

---

# 4. Main Components

# 4.1 Admin Dashboard

## Responsibilities

* monitoring synchronization
* retrying failed jobs
* managing integrations
* viewing logs
* operational visibility

## Technology

* Next.js
* React Query
* TailwindCSS

---

# 4.2 API Gateway

## Responsibilities

* centralized API entry point
* authentication validation
* request routing
* rate limiting
* API versioning

## Technology

* NestJS

---

# 4.3 Auth Service

## Responsibilities

* login
* JWT generation
* refresh token handling
* RBAC enforcement

## Security Features

* hashed passwords
* secure refresh tokens
* role validation

---

# 4.4 Marketplace Service

## Responsibilities

* marketplace API connectors
* OAuth handling
* token refresh
* API abstraction layer
* API Quota Manager (Outbound rate limiter per seller account)

## Supported Integrations

* TikTok Shop
* Shopee
* Lazada

---

# 4.5 Webhook Service

## Responsibilities

* receiving webhook events
* validating signatures
* duplicate prevention
* queue publishing

## Security Features

* HMAC signature validation
* replay attack prevention
* timestamp validation

---

# 4.6 Queue System

## Responsibilities

* async processing
* retry handling
* delayed jobs
* workload distribution
* priority queuing (High: Order/Inventory, Med: Product, Low: Historical)
* queue throttling and API backoff (1m, 5m, 15m, 30m, DLQ)

## Technology

* BullMQ
* Redis (Note: Evaluate durable message brokers like Kafka/SQS for future high-scale deployment)

---

# 4.7 Worker Services

## Worker Types

| Worker              | Responsibility           |
| ------------------- | ------------------------ |
| Order Worker        | order synchronization    |
| Product Worker      | product synchronization  |
| Inventory Worker    | stock synchronization    |
| Retry Worker        | failed sync recovery     |
| Notification Worker | alerts and notifications |

---

# 4.8 Database Layer

## Primary Database

PostgreSQL

## Responsibilities

* transactional data
* audit logs
* sync logs
* marketplace metadata

---

# 5. External Systems

## Marketplace APIs

| Marketplace     | Usage                     |
| --------------- | ------------------------- |
| TikTok Shop API | orders/products/inventory |
| Shopee API      | operational sync          |
| Lazada API      | marketplace integration   |

---

# 6. Infrastructure Architecture

## Deployment Components

```text
Internet
   ↓
Nginx Reverse Proxy
   ↓
Docker Containers
   ↓
NestJS Services
   ↓
Redis + PostgreSQL
```

---

# 7. Security Architecture

## Security Layers

| Layer                   | Security Mechanism     |
| ----------------------- | ---------------------- |
| Frontend                | JWT authentication     |
| API Gateway             | request validation + IP allowlisting (supplementary) |
| Services                | RBAC                   |
| Marketplace Integration | OAuth 2.0 (Tokens encrypted at rest via AES-256-GCM) |
| Webhook Layer           | signature verification |
| Database                | encrypted secrets      |
| Infrastructure          | HTTPS + firewall       |

---

# 8. Reliability & Recovery

## Reliability Features

* retry mechanism
* exponential backoff
* dead letter queue
* distributed workers
* duplicate prevention
* queue persistence

---

# 9. Scalability Strategy

## Horizontal Scaling

The following components can scale independently:

* API Gateway
* Queue Workers
* Webhook Service
* Marketplace Connectors

---

# 10. Observability

## Monitoring Features

* sync monitoring
* queue monitoring
* failed job monitoring
* audit logs
* retry history

## Future Observability

* Prometheus
* Grafana
* centralized logging
* distributed tracing

================================================================================

# Low Level Architecture (LLA)

# 1. Backend Folder Structure

```text
apps/
├── api-gateway/
├── auth-service/
├── marketplace-service/
├── webhook-service/
├── sync-worker/
├── notification-service/

libs/
├── common/
├── database/
├── auth/
├── queue/
├── logger/
├── marketplace-connectors/
```

---

# 2. Marketplace Service Internal Structure

```text
marketplace-service/
├── controllers/
├── services/
├── repositories/
├── dto/
├── entities/
├── connectors/
│   ├── shopee/
│   ├── tiktok/
│   └── lazada/
├── oauth/
├── webhooks/
├── queues/
└── utils/
```

---

# 3. Database Design

# Core Tables

## users

```text
id
name
email
password_hash
role
created_at
```

---

## marketplace_connections

```text
id
marketplace
seller_id
access_token
refresh_token
expired_at
status
created_at
```

---

## products

```text
id
sku
name
stock
price
marketplace_id
created_at
```

---

## orders

```text
id
order_number
marketplace
customer_name
status
total_amount
created_at
```

---

## inventory_logs

```text
id
product_id
old_stock
new_stock
source
created_at
```

---

## sync_logs

```text
id
sync_type
status
error_message
retry_count
executed_at
```

---

## webhook_events

```text
id
marketplace
event_type
payload
signature
processed
created_at
```

---

## audit_logs

```text
id
actor_id
action
resource_type
resource_id
old_value
new_value
created_at
```

---

# 4. Queue Architecture

## Queue Types

```text
queues/
├── order-sync.queue
├── product-sync.queue
├── inventory-sync.queue
├── webhook.queue
├── retry.queue
└── notification.queue
```

---

# 5. Worker Processing Flow

## Order Sync Flow

```text
Webhook Received
      ↓
Validate Signature
      ↓
Store Webhook Event
      ↓
Push to Queue
      ↓
Worker Consumes Job
      ↓
Call Marketplace API
      ↓
Transform Data
      ↓
Save to Database
      ↓
Update Sync Logs
```

---

# 6. Retry Mechanism Flow

```text
Job Failed
    ↓
Save Error Log
    ↓
Increment Retry Count
    ↓
Apply Backoff Delay
    ↓
Retry Queue
    ↓
Success ?
 ┌───────┴────────┐
 │                │
Yes              No
 │                │
 ▼                ▼
Complete      Dead Letter Queue
```

---

# 7. OAuth Token Lifecycle

```text
User Connect Marketplace
          ↓
OAuth Authorization
          ↓
Receive Access Token
          ↓
Store Encrypted Token
          ↓
Access Token Expired?
       ┌──────┴──────┐
       │             │
      No            Yes
       │             │
       ▼             ▼
 Continue     Refresh Token Flow
                     ↓
             Save New Access Token
```

---

# 8. Webhook Security Flow

```text
Webhook Request
      ↓
Validate Timestamp
      ↓
Validate Signature
      ↓
Check Replay Attack
      ↓
Check Duplicate Event (Idempotency Key)
      ↓
State Transition / Event Ordering Safeguards
      ↓
Queue Processing
```

---

# 9. API Structure

## Authentication APIs

```text
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
```

---

## Marketplace APIs

```text
GET    /marketplaces
POST   /marketplaces/connect
POST   /marketplaces/refresh-token
```

---

## Order APIs

```text
GET    /orders
GET    /orders/:id
POST   /orders/resync
```

---

## Sync APIs

```text
GET    /sync/logs
POST   /sync/retry
GET    /sync/queues
```

---

# 10. Security Implementation

## Secret Management

```text
.env
Docker Secrets
Encrypted Tokens
```

---

## Authentication Flow

```text
User Login
    ↓
Generate JWT
    ↓
Validate Middleware
    ↓
RBAC Guard
    ↓
Access Resource
```

---

# 11. Deployment Architecture

```text
VPS
├── Nginx
├── Docker
│   ├── frontend-container
│   ├── api-gateway-container
│   ├── auth-service-container
│   ├── marketplace-service-container
│   ├── worker-container
│   ├── redis-container
│   └── postgres-container
```

---

# 12. CI/CD Workflow

```text
Developer Push
      ↓
GitHub Actions
      ↓
Run Tests
      ↓
Lint Validation
      ↓
Docker Build
      ↓
Push Docker Image
      ↓
Deploy Staging
      ↓
Manual Approval
      ↓
Production Deploy
```

---

# 13. Future Low-Level Expansion

## Planned Improvements

* distributed event bus
* Kafka integration
* Kubernetes deployment
* service mesh
* centralized observability
* distributed tracing
* auto scaling workers
