# OmniSync WMS Integration Platform — API Reference & Database Schema

This document provides a comprehensive catalog of the OmniSync WMS Integration Platform's API endpoints and database design.

---

## 1. Database Schema & Entity Relationship Design (ERD)

All identifiers are generated using `UUIDv4`. All times are stored in UTC.

### 1.1 Core System Entities

#### `users`
Stores operational and administrative platform users.
* **Relationships:** Belongs to `roles`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `name` | `varchar` | User's full name. |
| `email` | `varchar` | Unique login email. |
| `password_hash` | `text` | Hashed password string. |
| `role_id` | `uuid` | Foreign key mapping to roles. |
| `is_active` | `boolean` | Enabled status indicator. |
| `last_login_at` | `timestamp` | UTC timestamp of last login. |
| `created_at` | `timestamp` | UTC registration timestamp. |
| `updated_at` | `timestamp` | UTC modification timestamp. |

#### `roles`
Stores role titles and operational scopes.
* **Relationships:** Has many `role_permissions`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `name` | `varchar` | Unique role key (e.g., `role:operations`). |
| `description` | `text` | Readable role description. |
| `created_at` | `timestamp` | UTC creation timestamp. |

#### `permissions`
Granular functional capability flags.
* **Relationships:** Map to `roles` via `role_permissions`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `key` | `varchar` | Unique permission tag (e.g., `orders:sync`). |
| `description` | `text` | Functional context. |

#### `role_permissions`
Cross-reference mapping table.

| Field | Type | Description |
| :--- | :--- | :--- |
| `role_id` | `uuid` | Foreign Key referencing `roles`. |
| `permission_id` | `uuid` | Foreign Key referencing `permissions`. |

---

### 1.2 Marketplace Connections

#### `marketplace_accounts`
Stores active e-commerce integrations, including encrypted OAuth keys.
* **Relationships:** Has many `marketplace_products`, `orders`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `marketplace` | `enum` | Marketplace channel (`TIKTOK`, `SHOPEE`, `LAZADA`). |
| `seller_id` | `varchar` | Platform-specific seller unique identifier. |
| `seller_name` | `varchar` | Registered shop name. |
| `access_token` | `text` | Encrypted marketplace API access token (AES-256-GCM). |
| `refresh_token` | `text` | Encrypted marketplace API refresh token (AES-256-GCM). |
| `token_expired_at`| `timestamp` | Expiration UTC date. |
| `status` | `enum` | Account connection health (`ACTIVE`, `EXPIRED`, `REVOKED`). |
| `created_by` | `uuid` | Foreign Key referencing the user who connected. |
| `created_at` | `timestamp` | UTC timestamp. |
| `updated_at` | `timestamp` | UTC timestamp. |
| `deleted_at` | `timestamp` | Soft deletion timestamp. |

#### `oauth_states`
Protects OAuth authorization requests against CSRF/forgery attempts.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `state` | `varchar` | Secure random state string. |
| `marketplace` | `varchar` | Associated channel name. |
| `expired_at` | `timestamp` | State expiration timestamp (max 15 mins). |
| `created_at` | `timestamp` | UTC timestamp. |

---

### 1.3 Product & Variant Entities

#### `products`
Master catalog items stored in OmniSync.
* **Relationships:** Has many `product_variants`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `sku` | `varchar` | Central product master SKU. |
| `name` | `varchar` | Base product name. |
| `description` | `text` | Product descriptive copy. |
| `category` | `varchar` | Product taxonomy category. |
| `brand` | `varchar` | Brand label. |
| `status` | `enum` | Operational status (`ACTIVE`, `INACTIVE`). |
| `created_at` | `timestamp` | UTC timestamp. |
| `updated_at` | `timestamp` | UTC timestamp. |
| `deleted_at` | `timestamp` | Soft deletion timestamp. |

#### `product_variants`
Specific variations of products (e.g., size, color).
* **Relationships:** Belongs to `products`. Has many `inventories`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `product_id` | `uuid` | Foreign Key mapping to `products`. |
| `variant_name` | `varchar` | Variant name (e.g., `Red XL`). |
| `variant_sku` | `varchar` | Variant SKU string. |
| `price` | `decimal` | Product catalog unit price. |
| `currency` | `varchar` | Price currency (`IDR` for MVP). |
| `weight` | `decimal` | Unit weight in grams. |
| `created_at` | `timestamp` | UTC timestamp. |

#### `marketplace_products`
Reconciles channel-specific items back to internal master inventory.
* **Relationships:** Maps `marketplace_accounts` to `products`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `marketplace_account_id`| `uuid` | Foreign Key mapping to `marketplace_accounts`. |
| `product_id` | `uuid` | Foreign Key mapping to `products`. |
| `marketplace_product_id`| `varchar` | Vendor-side unique product ID. |
| `marketplace_variant_id`| `varchar` | Vendor-side unique variant ID. |
| `sync_status` | `enum` | Mapping alignment (`MAPPED`, `UNMAPPED`, `ERROR`). |
| `last_synced_at` | `timestamp` | UTC of last full integration sync. |

---

### 1.4 Inventory Entities

#### `warehouses`
Physical fulfillment nodes.
* **Relationships:** Has many `inventories`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `name` | `varchar` | Warehouse name. |
| `code` | `varchar` | Unique facility code (e.g., `WH-JKT-01`). |
| `address` | `text` | Location address. |
| `created_at` | `timestamp` | UTC timestamp. |
| `deleted_at` | `timestamp` | Soft deletion timestamp. |

#### `inventories`
Active stock values for variants per warehouse.
* **Relationships:** Belongs to `warehouses` and `product_variants`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `warehouse_id` | `uuid` | Foreign Key mapping to `warehouses`. |
| `product_variant_id`| `uuid` | Foreign Key mapping to `product_variants`. |
| `stock` | `integer` | Total physically present physical stock. |
| `reserved_stock` | `integer` | Stock locked for unpaid or unfulfilled orders. |
| `updated_at` | `timestamp` | UTC timestamp. |

#### `inventory_movements`
Auditable physical stock movements (reconciliation ledger).
* **Relationships:** Belongs to `inventories`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `inventory_id` | `uuid` | Foreign Key mapping to `inventories`. |
| `movement_type` | `enum` | Flow direction (`INBOUND`, `OUTBOUND`, `ADJUSTMENT`). |
| `quantity` | `integer` | Stock volume changed (+/-). |
| `reference_type` | `varchar` | Trigger type (`ORDER`, `MANUAL`, `TRANSFER`). |
| `reference_id` | `uuid` | Associated document ID. |
| `created_at` | `timestamp` | UTC ledger timestamp. |

---

### 1.5 Order Management

#### `orders`
Consolidated multichannel order header.
* **Relationships:** Belongs to `marketplace_accounts`. Has many `order_items`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `marketplace_account_id`| `uuid` | Foreign Key mapping to `marketplace_accounts`. |
| `order_number` | `varchar` | Unique marketplace order reference ID. |
| `customer_name` | `varchar` | Customer's full name (masked if required). |
| `customer_phone` | `varchar` | Customer contact number. |
| `customer_address` | `text` | Full shipping address. |
| `order_status` | `enum` | Internal status (`PENDING`, `READY_TO_SHIP`, `SHIPPED`, `DELIVERED`, `CANCELLED`). |
| `payment_status` | `enum` | Financial state (`UNPAID`, `PAID`, `REFUNDED`). |
| `total_amount` | `decimal` | Complete monetary transaction value. |
| `currency` | `varchar` | Transaction currency (`IDR`). |
| `marketplace_created_at`| `timestamp`| Marketplace checkout timestamp in UTC. |
| `created_at` | `timestamp` | UTC ingestion timestamp. |

#### `order_items`
Order lines detail.
* **Relationships:** Belongs to `orders` and `product_variants`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `order_id` | `uuid` | Foreign Key mapping to `orders`. |
| `product_variant_id`| `uuid` | Foreign Key mapping to `product_variants`. |
| `product_name` | `varchar` | Ingested item name. |
| `quantity` | `integer` | Ingested item quantity. |
| `price` | `decimal` | Unit price at purchase. |
| `subtotal` | `decimal` | Subtotal line valuation. |

---

### 1.6 Sync, Webhook, & Audit Logging

#### `sync_jobs`
Durable tracking of asynchronous sync tasks.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `job_type` | `enum` | Type of job (`ORDER_SYNC`, `PRODUCT_SYNC`, `STOCK_SYNC`). |
| `entity_type` | `varchar` | Affected master entity type. |
| `entity_id` | `uuid` | Primary key of targeted entity. |
| `marketplace_account_id`| `uuid`| Foreign Key mapping to `marketplace_accounts`. |
| `status` | `enum` | Active execution state (`PENDING`, `ACTIVE`, `COMPLETED`, `FAILED`, `DEAD`). |
| `retry_count` | `integer` | Attempt count (capped at 5). |
| `started_at` | `timestamp` | UTC start timestamp. |
| `completed_at` | `timestamp` | UTC resolution timestamp. |
| `created_at` | `timestamp` | UTC creation timestamp. |

#### `sync_logs`
Fine-grained log events during job execution.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `sync_job_id` | `uuid` | Foreign Key mapping to `sync_jobs`. |
| `log_level` | `enum` | Severity level (`INFO`, `WARN`, `ERROR`). |
| `message` | `text` | Descriptive execution details. |
| `payload` | `jsonb` | Full context JSON dump. |
| `created_at` | `timestamp` | UTC timestamp. |

#### `failed_jobs`
The Dead Letter Queue (DLQ) persistent repository.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `sync_job_id` | `uuid` | Foreign Key mapping to `sync_jobs`. |
| `marketplace_account_id`| `uuid`| Foreign Key mapping to `marketplace_accounts`. |
| `marketplace` | `varchar` | Marketplace channel. |
| `order_number` | `varchar` | Targeted order number (if applicable). |
| `job_data` | `jsonb` | BullMQ data dump for recovery. |
| `final_error` | `text` | Stack trace or final exception message. |
| `total_attempts` | `integer` | Count of attempts before DLQ. |
| `status` | `enum` | DLQ state (`DEAD`, `RESOLVED`). |
| `failed_at` | `timestamp` | UTC failure timestamp. |

#### `webhook_events`
Historical database containing raw, validated webhook events.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `marketplace` | `varchar` | Source platform (`tiktok`, `shopee`, `lazada`). |
| `event_type` | `varchar` | Event identifier (`ORDER_CREATED`, `ORDER_CANCELLED`). |
| `event_id` | `varchar` | Vendor-provided transaction ID. |
| `idempotency_key` | `varchar` | Computed unique lock key. |
| `payload` | `jsonb` | Unaltered payload payload. |
| `signature` | `text` | Validated signature. |
| `is_processed` | `boolean` | Success flag. |
| `received_at` | `timestamp` | Ingestion UTC date. |

#### `webhook_delivery_logs`
Tracks processing delays and exceptions for inbound webhooks.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `webhook_event_id` | `uuid` | Foreign Key mapping to `webhook_events`. |
| `status` | `enum` | Resolution status (`SUCCESS`, `FAILED`). |
| `processing_time_ms`| `integer` | Total processing time. |
| `error_message` | `text` | Internal exception message. |
| `created_at` | `timestamp` | UTC timestamp. |

#### `audit_logs`
Immutable log tracing user activities inside the admin system.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `actor_id` | `uuid` | Foreign Key mapping to `users`. |
| `action` | `varchar` | Performed operation (`auth.login`, `order.resync`). |
| `resource_type` | `varchar` | Target domain (`Order`, `MarketplaceConnection`). |
| `resource_id` | `uuid` | Target resource ID. |
| `old_values` | `jsonb` | Pre-transaction values. |
| `new_values` | `jsonb` | Post-transaction values. |
| `ip_address` | `varchar` | Origin network address. |
| `created_at` | `timestamp` | UTC timestamp. |

---

## 2. API Endpoint Specification

All endpoints are prefixed with `/api/v1`. Authentication requires a Bearer JWT header:
`Authorization: Bearer <token>`

### 2.1 Authentication Module (`/auth`)

* **`POST /auth/login`**
  * **Payload:** `{ "email": "...", "password": "..." }`
  * **Response:** `{ "accessToken": "...", "refreshToken": "...", "user": { "id": "...", "role": "..." } }`
* **`POST /auth/refresh-token`**
  * **Payload:** `{ "refreshToken": "..." }`
  * **Response:** `{ "accessToken": "..." }`
* **`POST /auth/logout`**
  * **Security:** Requires Bearer JWT.
  * **Response:** `{ "success": true }`
* **`GET /auth/me`**
  * **Response:** Active user details and role permissions array.

### 2.2 Users & Access Control Modules (`/users`, `/roles`)

* **`GET /users`** (Paginated)
  * **Query:** `?page=1&limit=20`
* **`POST /users`**
  * **Payload:** `{ "name": "...", "email": "...", "password": "...", "roleId": "..." }`
* **`PATCH /users/:id`**
  * **Payload:** `{ "name": "...", "roleId": "...", "isActive": boolean }`
* **`DELETE /users/:id`**
* **`GET /roles`** (Fetches all available RBAC roles)
* **`POST /roles`**
  * **Payload:** `{ "name": "role:operations", "description": "Operations team role" }`
* **`POST /roles/:id/permissions`**
  * **Payload:** `{ "permissionIds": ["...", "..."] }`

### 2.3 Marketplace Accounts Module (`/marketplace-accounts`)

* **`GET /marketplace-accounts`**
  * **Response:** Returns list of connected storefront integrations.
* **`POST /marketplace-accounts/connect`**
  * **Payload:** `{ "marketplace": "TIKTOK" }`
  * **Response:** Redirect URL to initiate OAuth flow.
* **`GET /marketplace-accounts/oauth/callback`**
  * **Query:** `?code=XYZ&state=ABC`
  * **Response:** HTML template resolving connection status to parent window.
* **`POST /marketplace-accounts/:id/refresh-token`**
  * **Manual override:** Triggers manual refresh of marketplace credentials.
* **`DELETE /marketplace-accounts/:id`** (Disconnects and disables integration)
* **`GET /marketplace-accounts/:id/health`**
  * **Response:** `{ "healthy": true, "statusCode": "200" }`

### 2.4 Product & SKU Mapping Module (`/products`)

* **`GET /products`** (Supports paginated listings & variant embedding)
  * **Query:** `?page=1&limit=50&search=SKU-123`
* **`GET /products/:id`**
* **`POST /products`**
  * **Payload:** `{ "sku": "M-SKU-1", "name": "Master Item 1", "description": "..." }`
* **`PATCH /products/:id`**
* **`DELETE /products/:id`**
* **`GET /products/:id/variants`**
* **`POST /products/:id/variants`**
  * **Payload:** `{ "variantSku": "M-SKU-1-RED", "variantName": "Red Option", "price": 150000 }`
* **`PATCH /product-variants/:id`**

### 2.5 Inventory Module (`/inventories`, `/warehouses`)

* **`GET /warehouses`** (Fetches catalog of facilities)
* **`POST /warehouses`**
  * **Payload:** `{ "code": "WH-SUB-01", "name": "Surabaya Facility", "address": "..." }`
* **`GET /inventories`**
  * **Query:** `?page=1&limit=50&warehouseId=...`
* **`POST /inventories/adjust`**
  * **Payload:** `{ "inventoryId": "...", "type": "ADJUSTMENT", "quantity": 10, "referenceType": "MANUAL" }`
  * **Workflow:** Real-time stock change + push sync task to BullMQ for marketplaces.
* **`POST /inventories/transfer`**
  * **Payload:** `{ "productVariantId": "...", "sourceWarehouseId": "...", "targetWarehouseId": "...", "quantity": 5 }`
* **`GET /inventory-movements`** (Auditable historical movement trail)

### 2.6 Order Module (`/orders`)

* **`GET /orders`** (Paginated list with filter capabilities)
  * **Query:** `?page=1&limit=50&status=PENDING&marketplace=shopee`
* **`GET /orders/:id`** (Returns full order header + associated item list)
* **`POST /orders/:id/resync`**
  * **Trigger:** Initiates immediate order resync. Pushes a sync job to the top of `order-sync.queue`.
* **`POST /orders/:id/cancel`** (Updates internal status to cancelled and updates reserved stocks)

### 2.7 Sync Queue & DLQ Modules (`/sync-jobs`, `/queues`)

* **`GET /sync-jobs`**
  * **Query:** `?page=1&limit=50&status=FAILED`
* **`GET /sync-jobs/:id`**
* **`POST /sync-jobs/:id/retry`** (Manual re-queueing of failed sync task)
* **`POST /sync-jobs/bulk-retry`**
  * **Payload:** `{ "jobIds": ["...", "..."] }`
* **`GET /queues/stats`**
  * **Response:** `{ "active": 2, "waiting": 10, "delayed": 5, "failed": 1, "completed": 980 }`
* **`GET /queues/failed`** (Lists detailed exceptions logged in `failed_jobs` / DLQ)
* **`POST /queues/failed/:id/retry`** (Recovers and reruns a dead job in the queue)

### 2.8 Inbound Webhook Receiver Module (`/webhooks`)

* **`POST /webhooks/tiktok`**
  * **Security:** HMAC Header validation (`x-tiktok-signature`).
* **`POST /webhooks/shopee`**
  * **Security:** HMAC Header validation (`x-shopee-signature`).
* **`POST /webhooks/lazada`**
  * **Security:** HMAC Header validation (`x-lazada-signature`).
* **`POST /webhooks/deauthorization`**
  * **Action:** Direct API webhook payload indicating that a seller has removed the OmniSync app. Triggers state set to `REVOKED` for safety.
* **`GET /webhook-events`** (Audit trail of received payloads)

### 2.9 Dashboard & Metrics Modules (`/dashboard`)

* **`GET /dashboard/overview`**
  * **Response:** Returns high-level metrics for dashboard home page (Sync success rate, pending errors, active store count).
* **`GET /dashboard/sync-statistics`**
  * **Query:** `?range=7d`
  * **Response:** Day-by-day time series tracking successful vs failed jobs.
* **`GET /dashboard/queue-statistics`** (BullMQ latency statistics)
* **`GET /dashboard/marketplace-statistics`** (Success ratios split by store)

### 2.10 Systems & Diagnostics Modules (`/health`)

* **`GET /health`** (General gateway check)
  * **Response:** `{ "status": "ok", "timestamp": "..." }`
* **`GET /health/ready`** (Verifies active connection pools to PostgreSQL & Redis)
* **`GET /health/live`** (Process active loop monitor)
