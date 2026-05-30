# Product Requirements Document (PRD)

# OmniSync WMS Integration Platform

## Version

v1.0

## Product Type

Internal Enterprise Operations System

## Prepared By

Ahmad Arroziqi

---

# 1. Product Overview

## Background

Modern e-commerce operations often rely on multiple marketplaces such as TikTok Shop, Shopee, and Lazada. Managing orders, products, inventory, and operational synchronization manually across platforms creates operational inefficiencies, synchronization delays, duplicate data, and high failure risks.

Marketplace APIs also introduce technical challenges including:

* OAuth token lifecycle management
* API rate limiting
* webhook reliability
* duplicate event prevention
* retry mechanisms
* sync monitoring
* operational visibility

The company requires an internal operational platform capable of integrating multiple marketplace APIs into a centralized and secure system.

---

# 2. Product Vision

Build a scalable internal marketplace integration platform that centralizes e-commerce operations, automates synchronization processes, and provides operational visibility with reliable API integration architecture.

---

# 3. Product Goals

## Primary Goals

* Centralize marketplace operational data
* Automate synchronization between marketplaces and internal systems
* Minimize failed synchronization processes
* Improve operational monitoring and visibility
* Ensure secure and scalable API integrations

## Secondary Goals

* Reduce manual operational work
* Improve debugging and troubleshooting efficiency
* Enable future marketplace expansion
* Support AI-assisted engineering workflow

---

# 4. Problem Statements

Current operational challenges include:

| Problem                                     | Impact                         |
| ------------------------------------------- | ------------------------------ |
| Marketplace data scattered across platforms | Difficult monitoring           |
| Failed sync processes are not visible       | Data inconsistencies           |
| Manual retry process                        | Operational inefficiency       |
| No centralized logs                         | Difficult debugging            |
| Token expiration handling is unreliable     | Integration downtime           |
| Duplicate webhook events                    | Duplicate orders/inventory     |
| No audit tracking                           | Low operational accountability |

---

# 5. Target Users

## Primary Users

### Operations Admin

Responsible for:

* monitoring sync status
* retrying failed jobs
* monitoring orders/products
* operational troubleshooting

### Technical Admin

Responsible for:

* marketplace integrations
* deployment
* system configuration
* token management

### Internal Developers

Responsible for:

* maintaining connectors
* reviewing logs
* scaling integrations
* debugging sync issues

---

# 6. Product Scope

## Included in Scope

### Marketplace Integration

* TikTok Shop API
* Shopee API
* Lazada API

### Core Features

* OAuth integration
* Access token management
* Refresh token automation
* Product synchronization
* Order synchronization
* Inventory synchronization
* Webhook handling
* Retry mechanism
* Queue processing
* Monitoring dashboard
* Audit logs
* Role-based access control

### Operational Features

* Sync logs
* Retry failed sync
* Manual resync
* Queue monitoring
* Error monitoring
* Activity tracking

### Infrastructure

* Docker deployment
* VPS deployment
* CI/CD pipeline
* Environment management

---

# 7. Out of Scope (MVP)

The following are not included in initial MVP:

* Payment gateway integration
* Customer-facing storefront
* Mobile application
* Accounting integration
* AI recommendation engine
* Multi-language support
* Return and refund synchronization (Phase 2)
* Currency conversion and cross-border financial reporting (Phase 2)

---

# 8. Functional Requirements

# 8.1 Authentication & Authorization

## Features

* User login
* JWT authentication
* Refresh token
* Role-based access control

## Roles

| Role             | Permissions             |
| ---------------- | ----------------------- |
| Super Admin      | Full access             |
| Operations Admin | Sync monitoring & retry |
| Developer        | Technical monitoring    |
| Viewer           | Read-only access        |

---

# 8.2 Marketplace Connection Management

## Features

* Connect marketplace account
* OAuth authorization flow
* Token refresh automation
* Marketplace status monitoring
* Historical data sync upon connection (last 30 days orders, active products, current inventory)
* Handle deauthorization webhooks to disable revoked accounts

## Requirements

* Secure token storage
* Encrypted sensitive credentials
* Auto token expiration handling

---

# 8.3 Product Synchronization

## Features

* Fetch products from marketplaces
* Store product data internally
* Sync inventory changes
* Prevent duplicate product records
* Manual UI mapping of marketplace-specific SKUs to internal SKUs

## Sync Data

* Product name
* SKU
* price
* stock
* images
* marketplace identifiers

---

# 8.4 Order Synchronization

## Features

* Sync incoming orders (Indonesian operations / IDR currency only for MVP)
* Order status updates
* Prevent duplicate orders
* Manual resync support

## Order Data

* customer info
* order items
* shipping status
* payment status
* marketplace metadata

---

# 8.5 Inventory Synchronization

## Features

* Marketplace stock updates
* Internal stock updates
* Conflict prevention
* Queue-based stock sync

---

# 8.6 Webhook Processing

## Features

* Receive marketplace webhooks
* Validate signatures
* Prevent replay attacks
* Queue webhook events

## Security Requirements

* Timestamp validation
* Signature verification
* Duplicate event prevention

---

# 8.7 Queue & Retry System

## Features

* Queue-based processing
* Failed sync retry
* Exponential backoff
* Dead letter queue

## Retry Strategy

| Attempt | Delay      |
| ------- | ---------- |
| Retry 1 | 1 minute   |
| Retry 2 | 5 minutes  |
| Retry 3 | 15 minutes |
| Retry 4 | 1 hour     |

---

# 8.8 Admin Dashboard

## Dashboard Modules

### Overview Dashboard

* sync success rate
* failed sync count
* active queues
* active integrations

### Sync Monitoring

* recent sync activity
* failed jobs
* retry history
* webhook events

### Operational Controls

* retry failed sync
* manual resync
* disable integration
* clear queues

---

# 8.9 Logging & Audit System

## Audit Logs

Track:

* user actions
* retry actions
* sync failures
* configuration updates

## Log Data

* actor
* action
* timestamp
* old value
* new value
* IP address

---

# 9. Non-Functional Requirements

# 9.1 Performance

| Requirement              | Target |
| ------------------------ | ------ |
| API response time        | <500ms |
| Webhook response         | <3s    |
| Webhook throughput       | 20 req/sec |
| Queue processing latency | <10s   |
| Dashboard load time      | <2s    |

---

# 9.2 Reliability

| Requirement          | Target     |
| -------------------- | ---------- |
| Retry mechanism      | Automatic  |
| Queue durability     | Persistent |
| Duplicate prevention | Required   |
| Failure visibility   | Real-time  |

---

# 9.3 Scalability

System must support:

* multiple marketplace accounts
* concurrent sync jobs
* future marketplace expansion
* distributed workers

---

# 9.4 Security

## Requirements

* no hardcoded secrets
* encrypted environment variables
* HTTPS only
* JWT authentication
* secure webhook validation
* RBAC enforcement
* OAuth access and refresh tokens encrypted at rest via AES-256-GCM (Envelope Encryption)

---

# 10. Technical Architecture

# 10.1 Architecture Style

Event-driven modular backend architecture with queue-based async processing.

---

# 10.2 High-Level Components

```text
Marketplace APIs
        ↓
Webhook Service
        ↓
Queue System
        ↓
Sync Workers
        ↓
Database
        ↓
Admin Dashboard
```

---

# 10.3 Backend Services

| Service              | Responsibility         |
| -------------------- | ---------------------- |
| API Gateway          | Public API routing     |
| Auth Service         | Authentication         |
| Marketplace Service  | Marketplace connectors |
| Webhook Service      | Webhook processing     |
| Sync Worker          | Queue consumers        |
| Notification Service | Alerts & notifications |

---

# 10.4 Database

## Primary Database

PostgreSQL

## Queue Storage

Redis

---

# 11. Recommended Tech Stack

| Layer         | Technology     |
| ------------- | -------------- |
| Frontend      | Next.js        |
| Backend       | NestJS         |
| Database      | PostgreSQL     |
| Queue         | BullMQ + Redis |
| Deployment    | Docker         |
| Reverse Proxy | Nginx          |
| CI/CD         | GitHub Actions |

---

# 12. API Design Principles

## Standards

* RESTful APIs
* consistent response format
* versioned APIs
* centralized error handling

## Security

* JWT authentication
* rate limiting
* request validation

---

# 13. DevOps & Deployment

# Deployment Requirements

* Dockerized services (MVP: Single VPS deployment)
* Production Scale Phase (Cloud HA: AWS/GCP, triggered at >50 connected stores or >50,000 orders/day)
* staging environment
* production environment
* automated CI/CD
* environment isolation

## CI/CD Workflow

```text
Push Code
    ↓
Run Tests
    ↓
Lint & Validation
    ↓
Build Docker Image
    ↓
Deploy to Staging
    ↓
Manual Approval
    ↓
Production Deploy
```

---

# 14. AI-Assisted Engineering Workflow

The system development workflow supports AI-assisted engineering tools to accelerate productivity while maintaining code quality and security standards.

## AI Usage Areas

* boilerplate generation
* documentation drafting
* unit test generation
* code suggestions

## Engineering Policy

* all AI-generated code must be manually reviewed
* security validation is mandatory
* no direct deployment without code review

---

# 15. Success Metrics

| Metric                    | Target |
| ------------------------- | ------ |
| Sync success rate         | >95%   |
| Failed webhook recovery   | >90%   |
| Duplicate prevention rate | 100%   |
| Dashboard uptime          | >99%   |
| Retry automation success  | >85%   |

---

# 16. MVP Deliverables

## MVP Includes

### Core Backend

* auth system
* marketplace connector
* queue system
* webhook processor
* retry mechanism

### Dashboard

* monitoring dashboard
* sync logs
* retry controls

### Infrastructure

* Docker setup
* VPS deployment
* CI/CD pipeline

### Documentation

* API docs
* architecture docs
* deployment docs

---

# 17. Future Enhancements

## Phase 2

* Tokopedia integration
* analytics dashboard
* notification system
* Slack/Discord alerts

## Phase 3

* distributed microservices
* AI anomaly detection
* predictive sync monitoring
* advanced observability

---

# 18. Risks & Mitigations

| Risk                     | Mitigation                  |
| ------------------------ | --------------------------- |
| Marketplace API changes  | Connector abstraction layer |
| Rate limits              | Queue throttling            |
| Token expiration         | Automated refresh           |
| Duplicate webhook events | Idempotency system          |
| Failed sync accumulation | Retry & DLQ                 |
| Security breach          | Secret management & RBAC    |

---

# 19. Conclusion

OmniSync WMS Integration Platform is designed as an enterprise-grade operational integration system capable of handling marketplace synchronization reliably, securely, and scalably.

The platform focuses on:

* operational visibility
* reliable API integration
* queue-based architecture
* secure webhook processing
* scalable synchronization workflows
* AI-assisted engineering practices

The system architecture is designed to support long-term operational growth and future marketplace expansion.
