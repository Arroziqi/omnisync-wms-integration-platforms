# OmniSync WMS Integration Platform — Documentation Hub

Welcome to the central documentation hub for **OmniSync WMS Integration Platform**, a high-performance, event-driven internal operations integration system that synchronizes order, product, inventory, and event data across multiple marketplace platforms (TikTok Shop, Shopee, and Lazada).

This repository contains five core categories of documentation designed to serve developers, operations teams, technical administrators, and system integrators.

---

## 📚 Documentation Catalog

Use the navigation matrix below to locate the manuals best suited to your operational or development objectives:

| Document | Primary Audience | Key Topics Covered |
| :--- | :--- | :--- |
| 🚀 **[Developer Onboarding Guide](./onboarding_guide.md)** | Internal Developers, System Integrators | Local environment setup, coding standards, extending connectors, adding BullMQ queue workers, running tests. |
| 🛠️ **[Architecture Guide](./architecture_guide.md)** | Technical Leads, Architects, Devs | HLA & LLA diagrams, event-driven design, service boundaries, queue backoffs, webhook safeguards. |
| 📡 **[API Reference & ERD Schema](./api_documentation.md)** | Integrators, Backend Engineers | PostgreSQL entity-relationship diagrams, database dictionary, 14 functional API modules. |
| 📦 **[Production Operations & Deployment](./deployment_guide.md)** | DevOps, Site Reliability Engineers | Ubuntu host provisioning, firewalls, Docker Compose, Nginx SSL (Let's Encrypt), automated cron backups, restore, Cloud HA triggers. |
| 💼 **[Operational Handbook](./operational_handbook.md)** | Operations Admins, Technical Admins | Marketplace channel setup, order sync troubleshooting, DLQ recoveries, manual stock adjustments, audit trail tracking. |

---

## 🧩 Architectural Overview at a Glance

OmniSync is built on an asynchronous, queue-centric architecture to guarantee reliability under heavy peak marketplace traffic. Webhook payloads are verified and pushed instantly to BullMQ queues, allowing worker instances to process sync jobs in a controlled and rate-limited manner.

```text
               ┌──────────────────────┐
               │    Next.js Admin     │
               │      Dashboard       │
               └──────────┬───────────┘
                          │ HTTPS
                          ▼
               ┌──────────────────────┐
               │     API Gateway      │
               │   (NestJS Gateway)   │
               └──────────┬───────────┘
                          │
  ┌───────────────────────┼───────────────────────┐
  ▼                       ▼                       ▼
┌──────────────┐   ┌──────────────┐   ┌───────────────┐
│ Auth Service │   │ Config/Admin │   │ Marketplace   │
│              │   │   Service    │   │   Service     │
└──────┬───────┘   └──────┬───────┘   └──────┬────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────┐
│                 PostgreSQL Database                 │
└─────────────────────────────────────────────────────┘
                          ▲
                          │ Sync / Logs
┌─────────────────────────┴─────────┐
│          Webhook Service          │◄─────── Incoming Events
└─────────────────────────┬─────────┘         (TikTok/Shopee/Lazada)
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Redis + BullMQ Queue Hub               │
└─────────────────────────┬───────────────────────────┘
                          │ Asynchronous Dispatch
                          ▼
┌─────────────────────────────────────────────────────┐
│                   Worker Clusters                   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│   │ Order Worker │  │Product Worker│  │Inv Worker│  │
│   └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │
└──────────┼─────────────────┼───────────────┼────────┘
           └─────────────────┴───────────────┘
                             │
                             ▼
                 ┌──────────────────────┐
                 │   Marketplace APIs   │
                 │ TikTok / Shopee / Laz│
                 └──────────────────────┘
```

For a detailed breakdown of service interaction lifecycles and concurrency capabilities, refer to the full **[Architecture Guide](./architecture_guide.md)**.
