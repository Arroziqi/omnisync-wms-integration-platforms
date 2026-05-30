# OmniSync WMS Integration Platform

# Entity Relationship Design (ERD)

# 1. Core System Entities

---

# 1.1 users

Stores system users.

| Field         | Type      |
| ------------- | --------- |
| id            | uuid      |
| name          | varchar   |
| email         | varchar   |
| password_hash | text      |
| role_id       | uuid      |
| is_active     | boolean   |
| last_login_at | timestamp |
| created_at    | timestamp |
| updated_at    | timestamp |

---

# 1.2 roles

Stores RBAC roles.

| Field       | Type      |
| ----------- | --------- |
| id          | uuid      |
| name        | varchar   |
| description | text      |
| created_at  | timestamp |

---

# 1.3 permissions

Stores system permissions.

| Field       | Type    |
| ----------- | ------- |
| id          | uuid    |
| key         | varchar |
| description | text    |

---

# 1.4 role_permissions

Role-permission mapping.

| Field         | Type |
| ------------- | ---- |
| role_id       | uuid |
| permission_id | uuid |

---

# 2. Marketplace Integration Entities

---

# 2.1 marketplace_accounts

Stores marketplace connection accounts.

| Field            | Type      |
| ---------------- | --------- |
| id               | uuid      |
| marketplace      | enum      |
| seller_id        | varchar   |
| seller_name      | varchar   |
| access_token     | text      |
| refresh_token    | text      |
| token_expired_at | timestamp |
| status           | enum      |
| created_by       | uuid      |
| created_at       | timestamp |
| updated_at       | timestamp |
| deleted_at       | timestamp |

---

# 2.2 oauth_states

OAuth validation state storage.

| Field       | Type      |
| ----------- | --------- |
| id          | uuid      |
| state       | varchar   |
| marketplace | varchar   |
| expired_at  | timestamp |
| created_at  | timestamp |

---

# 3. Product Management Entities

---

# 3.1 products

Master product data.

| Field       | Type      |
| ----------- | --------- |
| id          | uuid      |
| sku         | varchar   |
| name        | varchar   |
| description | text      |
| category    | varchar   |
| brand       | varchar   |
| status      | enum      |
| created_at  | timestamp |
| updated_at  | timestamp |
| deleted_at  | timestamp |

---

# 3.2 product_variants

Product variants.

| Field        | Type      |
| ------------ | --------- |
| id           | uuid      |
| product_id   | uuid      |
| variant_name | varchar   |
| variant_sku  | varchar   |
| price        | decimal   |
| currency     | varchar   |
| weight       | decimal   |
| created_at   | timestamp |

---

# 3.3 marketplace_products

Marketplace product mapping.

| Field                  | Type      |
| ---------------------- | --------- |
| id                     | uuid      |
| marketplace_account_id | uuid      |
| product_id             | uuid      |
| marketplace_product_id | varchar   |
| marketplace_variant_id | varchar   |
| sync_status            | enum      |
| last_synced_at         | timestamp |

---

# 4. Inventory Entities

---

# 4.1 warehouses

Warehouse master.

| Field      | Type      |
| ---------- | --------- |
| id         | uuid      |
| name       | varchar   |
| code       | varchar   |
| address    | text      |
| created_at | timestamp |
| deleted_at | timestamp |

---

# 4.2 inventories

Current inventory stock.

| Field              | Type      |
| ------------------ | --------- |
| id                 | uuid      |
| warehouse_id       | uuid      |
| product_variant_id | uuid      |
| stock              | integer   |
| reserved_stock     | integer   |
| updated_at         | timestamp |

---

# 4.3 inventory_movements

Inventory history.

| Field          | Type      |
| -------------- | --------- |
| id             | uuid      |
| inventory_id   | uuid      |
| movement_type  | enum      |
| quantity       | integer   |
| reference_type | varchar   |
| reference_id   | uuid      |
| created_at     | timestamp |

---

# 5. Order Management Entities

---

# 5.1 orders

Order header.

| Field                  | Type      |
| ---------------------- | --------- |
| id                     | uuid      |
| marketplace_account_id | uuid      |
| order_number           | varchar   |
| customer_name          | varchar   |
| customer_phone         | varchar   |
| customer_address       | text      |
| order_status           | enum      |
| payment_status         | enum      |
| total_amount           | decimal   |
| currency               | varchar   |
| marketplace_created_at | timestamp |
| created_at             | timestamp |

---

# 5.2 order_items

Order detail items.

| Field              | Type    |
| ------------------ | ------- |
| id                 | uuid    |
| order_id           | uuid    |
| product_variant_id | uuid    |
| product_name       | varchar |
| quantity           | integer |
| price              | decimal |
| subtotal           | decimal |

---

# 6. Sync & Queue Entities

---

# 6.1 sync_jobs

Stores async sync jobs.

| Field                  | Type      |
| ---------------------- | --------- |
| id                     | uuid      |
| job_type               | enum      |
| entity_type            | varchar   |
| entity_id              | uuid      |
| marketplace_account_id | uuid      |
| status                 | enum      |
| retry_count            | integer   |
| started_at             | timestamp |
| completed_at           | timestamp |
| created_at             | timestamp |

---

# 6.2 sync_logs

Stores sync execution logs.

| Field       | Type      |
| ----------- | --------- |
| id          | uuid      |
| sync_job_id | uuid      |
| log_level   | enum      |
| message     | text      |
| payload     | jsonb     |
| created_at  | timestamp |

---

# 6.3 failed_jobs

Dead letter queue storage.

| Field         | Type      |
| ------------- | --------- |
| id            | uuid      |
| sync_job_id   | uuid      |
| error_message | text      |
| stack_trace   | text      |
| failed_at     | timestamp |

---

# 7. Webhook Entities

---

# 7.1 webhook_events

Stores incoming webhooks.

| Field        | Type      |
| ------------ | --------- |
| id           | uuid      |
| marketplace  | varchar   |
| event_type   | varchar   |
| event_id     | varchar   |
| idempotency_key | varchar   |
| payload      | jsonb     |
| signature    | text      |
| is_processed | boolean   |
| received_at  | timestamp |

---

# 7.2 webhook_delivery_logs

Webhook processing logs.

| Field              | Type      |
| ------------------ | --------- |
| id                 | uuid      |
| webhook_event_id   | uuid      |
| status             | enum      |
| processing_time_ms | integer   |
| error_message      | text      |
| created_at         | timestamp |

---

# 8. Audit & Monitoring Entities

---

# 8.1 audit_logs

Audit trail.

| Field         | Type      |
| ------------- | --------- |
| id            | uuid      |
| actor_id      | uuid      |
| action        | varchar   |
| resource_type | varchar   |
| resource_id   | uuid      |
| old_values    | jsonb     |
| new_values    | jsonb     |
| ip_address    | varchar   |
| created_at    | timestamp |

---

# 8.2 system_notifications

Operational notifications.

| Field      | Type      |
| ---------- | --------- |
| id         | uuid      |
| type       | enum      |
| title      | varchar   |
| message    | text      |
| is_read    | boolean   |
| created_at | timestamp |

---

# 8.3 api_request_logs

Outbound API request and response tracking.

| Field                  | Type      |
| ---------------------- | --------- |
| id                     | uuid      |
| marketplace_account_id | uuid      |
| endpoint               | varchar   |
| method                 | varchar   |
| request_payload        | jsonb     |
| response_status        | integer   |
| response_payload       | jsonb     |
| created_at             | timestamp |

---

# 9. Entity Relationships

```text
roles
  └── users

roles
  └── role_permissions
          └── permissions

marketplace_accounts
  └── marketplace_products
          └── products
                  └── product_variants
                          └── inventories
                                  └── inventory_movements

marketplace_accounts
  └── orders
          └── order_items

sync_jobs
  └── sync_logs

sync_jobs
  └── failed_jobs

webhook_events
  └── webhook_delivery_logs
```

================================================================================

# Complete API Documentation

# Base URL

```text
/api/v1
```

**Note:** All GET list endpoints (e.g., `/orders`, `/products`) support standard query parameters for pagination, filtering, and sorting: `?page=1&limit=50&sort=-created_at`.

================================================================================

# 1. Authentication APIs

# Auth

## Login

```http
POST /auth/login
```

## Refresh Token

```http
POST /auth/refresh-token
```

## Logout

```http
POST /auth/logout
```

## Current User

```http
GET /auth/me
```

================================================================================

# 2. User Management APIs

# Users

## Get Users

```http
GET /users
```

## Get User Detail

```http
GET /users/:id
```

## Create User

```http
POST /users
```

## Update User

```http
PATCH /users/:id
```

## Delete User

```http
DELETE /users/:id
```

================================================================================

# 3. Role & Permission APIs

# Roles

## Get Roles

```http
GET /roles
```

## Create Role

```http
POST /roles
```

## Assign Permissions

```http
POST /roles/:id/permissions
```

================================================================================

# 4. Marketplace APIs

# Marketplace Accounts

## Get Connected Accounts

```http
GET /marketplace-accounts
```

## Connect Marketplace

```http
POST /marketplace-accounts/connect
```

## OAuth Callback

```http
GET /marketplace-accounts/oauth/callback
```

## Refresh Token

```http
POST /marketplace-accounts/:id/refresh-token
```

## Disconnect Marketplace

```http
DELETE /marketplace-accounts/:id
```

## Get Marketplace Health

```http
GET /marketplace-accounts/:id/health
```

================================================================================

# 5. Product APIs

# Products

## Get Products

```http
GET /products
```

## Get Product Detail

```http
GET /products/:id
```

## Create Product

```http
POST /products
```

## Update Product

```http
PATCH /products/:id
```

## Delete Product

```http
DELETE /products/:id
```

---

# Product Variants

## Get Variants

```http
GET /products/:id/variants
```

## Create Variant

```http
POST /products/:id/variants
```

## Update Variant

```http
PATCH /product-variants/:id
```

================================================================================

# 6. Inventory APIs

# Warehouses

## Get Warehouses

```http
GET /warehouses
```

## Create Warehouse

```http
POST /warehouses
```

---

# Inventories

## Get Inventory

```http
GET /inventories
```

## Adjust Inventory

```http
POST /inventories/adjust
```

## Bulk Adjust Inventory

```http
POST /inventories/bulk-adjust
```

## Transfer Inventory

```http
POST /inventories/transfer
```

## Inventory Movements

```http
GET /inventory-movements
```

================================================================================

# 7. Order APIs

# Orders

## Get Orders

```http
GET /orders
```

## Get Order Detail

```http
GET /orders/:id
```

## Manual Resync Order

```http
POST /orders/:id/resync
```

## Cancel Order

```http
POST /orders/:id/cancel
```

================================================================================

# 8. Sync APIs

# Sync Jobs

## Get Sync Jobs

```http
GET /sync-jobs
```

## Get Sync Job Detail

```http
GET /sync-jobs/:id
```

## Retry Failed Sync

```http
POST /sync-jobs/:id/retry
```

## Bulk Retry Failed Sync

```http
POST /sync-jobs/bulk-retry
```

## Cancel Sync Job

```http
POST /sync-jobs/:id/cancel
```

---

# Sync Logs

## Get Sync Logs

```http
GET /sync-logs
```

================================================================================

# 9. Queue Monitoring APIs

# Queues

## Queue Statistics

```http
GET /queues/stats
```

## Failed Jobs

```http
GET /queues/failed
```

## Retry Failed Queue Job

```http
POST /queues/failed/:id/retry
```

================================================================================

# 10. Webhook APIs

# Webhooks

## TikTok Webhook

```http
POST /webhooks/tiktok
```

## Shopee Webhook

```http
POST /webhooks/shopee
```

## Lazada Webhook

```http
POST /webhooks/lazada
```

## Deauthorization Webhook

```http
POST /webhooks/deauthorization
```

---

# Webhook Monitoring

## Get Webhook Events

```http
GET /webhook-events
```

## Get Webhook Detail

```http
GET /webhook-events/:id
```

================================================================================

# 11. Dashboard APIs

# Dashboard

## Overview Metrics

```http
GET /dashboard/overview
```

## Sync Statistics

```http
GET /dashboard/sync-statistics
```

## Queue Statistics

```http
GET /dashboard/queue-statistics
```

## Marketplace Statistics

```http
GET /dashboard/marketplace-statistics
```

================================================================================

# 12. Audit & Monitoring APIs

# Audit Logs

## Get Audit Logs

```http
GET /audit-logs
```

---

# Notifications

## Get Notifications

```http
GET /notifications
```

## Mark Notification Read

```http
PATCH /notifications/:id/read
```

================================================================================

# 13. System APIs

# Health Check

## System Health

```http
GET /health
```

## Readiness Probe

```http
GET /health/ready
```

## Liveness Probe

```http
GET /health/live
```

================================================================================

# 14. Internal Worker APIs

# Internal Processing

## Trigger Product Sync

```http
POST /internal/sync/products
```

## Trigger Order Sync

```http
POST /internal/sync/orders
```

## Trigger Inventory Sync

```http
POST /internal/sync/inventories
```

## Trigger Retry Worker

```http
POST /internal/retry/run
```
