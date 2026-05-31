# OmniSync WMS Integration Platform — Operational & Admin Handbook

This manual serves as the primary operational guide for **Operations Admins** and **Technical Admins** using the OmniSync WMS Integration Platform. It outlines standard operating procedures for channel management, order recovery, inventory reconciliation, queue monitoring, and system troubleshooting.

---

## 🚀 1. Managing Marketplace Connections

The OmniSync platform integrates multiple seller accounts from TikTok Shop, Shopee, and Lazada into a centralized WMS dashboard.

### 1.1 Connecting a Store Channel
To connect a new seller channel to the platform:
1. Log in to the OmniSync Admin Dashboard using credentials with `role:admin` or `role:super_admin` permissions.
2. Navigate to the **Marketplace Connections** screen via the sidebar.
3. Click **Connect Account** and select the target marketplace channel (e.g., TikTok Shop).
4. You will be securely redirected to the marketplace’s official seller authorization portal.
5. Log in using your seller credentials, verify the permissions, and click **Authorize**.
6. Upon successful authorization, the marketplace redirects you back to the OmniSync callback endpoint, which handles token extraction, establishes dynamic background sync tasks, and returns you to the dashboard with an `ACTIVE` status.

### 1.2 Token Lifecycle & Connection Health
The platform maintains secure connections using OAuth 2.0.
* **Active Status:** Connection is healthy; API calls can be executed freely.
* **Expired Status:** The channel's `access_token` has lapsed, but the `refresh_token` remains active. The platform background service automatically refreshes tokens in the background 30 minutes before expiration.
* **Revoked Status:** The seller has explicitly terminated access, or the credentials have expired past their refresh window.
  * **Action Required:** To restore functionality, you must click the **Reconnect** button on the channel card to initiate a fresh OAuth redirect.

### 1.3 Deauthorization Webhooks
If a seller terminates access to OmniSync directly from their marketplace console (e.g., Shopee Seller Centre):
1. The marketplace fires an inbound `deauthorization` webhook.
2. OmniSync verifies the webhook signature, identifies the associated `marketplace_account_id`, and immediately changes its status to `REVOKED`.
3. All background queues for that store are paused, and an alert is dispatched to the **Notification Center** informing the technical team of the revocation.

---

## 📦 2. Order Sync Troubleshooting & Recovery

OmniSync's primary function is ensuring orders from all marketplaces match internal warehouse records.

### 2.1 Identifying Order Inconsistencies
Navigate to the **Orders Console** to monitor synchronization performance.
* **Ingested orders** display a green check icon.
* **Failed synchronization attempts** are marked with a red warning badge.
* To locate sync gaps, filter the list by `Status = FAILED` or search for specific marketplace `Order Numbers`.

### 2.2 Manual Order Resync
If a webhook event was dropped or a connection timed out during a sale event, you can manually trigger an immediate resync:
1. Open the details page for the failed order in the dashboard, or search by Order Number in the **Unified Sync Console**.
2. Click the **Manual Resync** button at the top-right corner.
3. This pushes an high-priority order sync task directly to the head of the `order-sync.queue` in BullMQ.
4. The system will make an immediate API request to the marketplace channel, fetch the latest order state, transform the data, write it to PostgreSQL, and refresh your dashboard view in less than 500ms.

### 2.3 Duplicate Prevention Safeguards
Operations teams do not need to worry about manual resyncs causing double-fulfillment. OmniSync prevents duplicates using two layers of protection:
* **Database Unique Constraints:** The `orders` table enforces a strict unique composite index across `(marketplace_account_id, order_number)`. Any attempt to duplicate an order is rejected.
* **State Transition Safeguards:** When an order payload is processed, the system compares the incoming order state with the existing database state. It will not allow status downgrades (e.g., changing a `READY_TO_SHIP` order back to `PENDING` due to an out-of-order webhook delivery).

---

## ⚡ 3. Inventory & Stock Adjustments

OmniSync centralizes stock counts across multiple warehouses and marketplaces to prevent overselling.

### 3.1 Making Manual Adjustments
1. Navigate to the **Warehouse Management** portal and choose the target facility (e.g., `WH-JKT-01`).
2. Search for the specific variant SKU in the inventory grid.
3. Click **Adjust Stock**.
4. In the pop-up modal, select the movement type (e.g., `ADJUSTMENT`), select the source reason (`PHYSICAL_COUNT_RECONCILIATION`), and input the change quantity (e.g., `+12` or `-3`).
5. Click **Submit**.

### 3.2 Conflict Resolution Policies
If a manual adjustment is submitted while a marketplace background sync is running:
* **The Single-Source Ledger Rule:** Internal warehouse inventory changes always act as the master state. 
* **Outbound Sync Event:** Upon manual submission, OmniSync immediately creates an `INBOUND` or `OUTBOUND` `inventory_movement` record and triggers an immediate background task to publish updated stock levels to TikTok Shop, Shopee, and Lazada.
* **Incoming Marketplace Orders:** If a customer purchases an item concurrently, the marketplace reserves the inventory and fires a webhook. OmniSync updates the internal `reserved_stock` count, preserving physical safety buffers.

---

## 📡 4. Monitoring Queues & Retries

All asynchronous synchronization jobs are managed via the BullMQ Queue Hub.

### 4.1 Interpreting the Queue Dashboard
Navigate to **Queue Statistics** to view current processing pools:
* **Active:** Jobs currently being processed by workers.
* **Waiting:** Jobs lined up in Redis, waiting for an available worker slot.
* **Delayed:** Jobs waiting for a scheduled retry attempt.
* **Failed / DLQ:** Jobs that have exhausted all 5 retry attempts and require manual review.

### 4.2 Recovering Dead / DLQ Jobs
When a background job fails (e.g., due to an API timeout), BullMQ retries the task up to 5 times using exponential backoff (1m, 5m, 15m, 1h). If it fails on the 5th attempt, it moves to the **Dead Letter Queue (DLQ)**.

To recover and rerun DLQ tasks:
1. Go to the **Dead Letter Queue** tab in the dashboard.
2. Select the specific job cards or click the checkbox to select multiple tasks.
3. Click the **Retry Selected** button.
4. The system will retrieve the job payload from the `failed_jobs` table, remove the DLQ record, and push the task back into the active queue.

---

## 🔍 5. Audit & Log Querying

OmniSync maintains an auditable trail of all actions to ensure administrative accountability.

### 5.1 Querying the Audit Console
To review administrative activity:
1. Navigate to **Audit Logs** via the sidebar.
2. Filter the log grid using standard criteria:
  * **Actor:** Filter by specific user accounts.
  * **Action:** Search by action key (e.g., `auth.login`, `order.resync`, `inventory.adjust`).
  * **Date Range:** Select start and end dates.
  * **IP Address:** Identify changes from unknown networks.

### 5.2 Analyzing Data Mutations
Clicking an audit log entry displays the exact changes made:
* **Old Values JSON:** The state of the record before the action.
* **New Values JSON:** The modified state. Highlighted lines show exactly what was changed (e.g., stock value changing from `14` to `26`).

---

## 🚨 6. Incident Escalation Procedures

If the platform experiences severe issues, use the escalation path below to notify developers and protect data.

### 6.1 Identifying Critical Incidents
The following symptoms represent **Severity-1 Incidents** that must be escalated immediately:
1. **Persistent Webhook Failures:** The overview dashboard indicates a webhook success rate below **90%** for more than 15 minutes.
2. **Database Connection Pool Exhaustion:** The dashboard displays frequent database connection errors, or APIs return `500 Internal Server Error`.
3. **Queue Staleness:** The waiting queue count exceeds **1,000** jobs and is not decreasing, indicating background worker crashes.

### 6.2 Escalation Protocol
1. **Collect Diagnostic Information:**
   * Take a screenshot of the dashboard error or the queue stats screen.
   * Copy the exact error log message from the **Sync Console** or **DLQ Console** (including any error code).
   * Note the impacted stores and marketplaces (e.g., Shopee only).
2. **File a Developer Support Ticket:**
   * Open the company ticketing portal and tag the ticket as **S1 - OmniSync Platform Outage**.
   * Attach the collected diagnostics and list the active impact (e.g., "Shopee orders lagging by 30 minutes").
3. **Emergency Workarounds:**
   * If a single channel's token is causing repeated worker crashes, navigate to **Marketplace Connections** and click **Deactivate** to pause processing for that channel while engineers resolve the issue.
