# OmniSync WMS Integration Platform — Production Operations & Deployment Guide

This guide describes how to provision, configure, deploy, secure, and maintain the OmniSync WMS Integration Platform on a production-ready Virtual Private Server (VPS) using Docker Compose and Nginx, and defines the triggers for migrating to a Cloud High-Availability (HA) architecture.

> [!TIP]
> **Automated Deployment & Testing Script Available**
> The platform includes a fully automated deployment script [`scripts/deploy-env.sh`](../scripts/deploy-env.sh) that validates prerequisites, audits file-based Docker secrets, bootstraps TLS certificates, triggers migrations/seeding, and executes dynamic smoke tests & port security validations. 
> To deploy in one command:
> ```bash
> # Deploy Staging
> ./scripts/deploy-env.sh staging
> 
> # Deploy Production
> ./scripts/deploy-env.sh production
> ```

---

## 1. VPS Host Provisioning & Hardening

We recommend deploying to a clean **Ubuntu 24.04 LTS** or **Debian 12** VPS with a minimum of **2 vCPUs, 4GB RAM, and 40GB SSD**.

### 1.1 Non-Root User Setup
Never run your production services or host commands directly as the `root` user.
```bash
# Create a dedicated deployment user
adduser deploy

# Add to sudo group
usermod -aG sudo deploy
usermod -aG docker deploy # After installing Docker

# Switch to deploy user
su - deploy
```

### 1.2 Firewall Configuration (UFW)
Restrict all incoming network access except HTTP, HTTPS, and SSH.
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status verbose
```

### 1.3 Docker & Compose Installation
Install the official Docker Engine (do not use default snap or distro versions):
```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## 2. Secrets Management & Environment Setup

Production environments must utilize Docker file-based secrets to protect credentials from process listings and config dumps.

### 2.1 File-Based Secrets Creation
Run these commands on the staging/production host inside `/opt/omnisync` to initialize secrets:
```bash
mkdir -p /opt/omnisync/secrets
cd /opt/omnisync

# Generate cryptographically secure random values
openssl rand -base64 32 | tr -d '\n' > ./secrets/db_password.txt
openssl rand -base64 48 | tr -d '\n' > ./secrets/jwt_secret.txt
openssl rand -base64 32 | tr -d '\n' > ./secrets/redis_password.txt

# Fill marketplace keys securely (no newlines/quotes)
echo -n "your-prod-tiktok-secret"   > ./secrets/tiktok_app_secret.txt
echo -n "your-prod-shopee-partner"  > ./secrets/shopee_partner_key.txt
echo -n "your-prod-lazada-secret"   > ./secrets/lazada_app_secret.txt

# Enforce strict file permissions (Read-only by owner)
chmod 600 ./secrets/*.txt
```

### 2.2 Environment Variables Configuration
Configure `/opt/omnisync/.env` on the VPS host with public, non-secret options:
```ini
NODE_ENV=production
ALLOWED_ORIGINS=https://dashboard.omnisync-wms.com
NEXT_PUBLIC_API_URL=https://dashboard.omnisync-wms.com

# Non-secret marketplace configurations
TIKTOK_APP_KEY="your-prod-tiktok-key"
SHOPEE_PARTNER_ID="your-prod-shopee-id"
LAZADA_APP_KEY="your-prod-lazada-key"

# Global rate limits & throttles
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 3. Production Nginx & SSL Setup

Our production Nginx configuration enforces modern TLS standards, HSTS, strong security headers, and reverse proxy rate-limiting.

### 3.1 Obtaining TLS Certificates (Let's Encrypt)
On the VPS, install Certbot and obtain your SSL certificate:
```bash
sudo apt-get install -y certbot

# Run temporary standalone certbot (make sure Nginx or anything on port 80/443 is stopped)
sudo certbot certonly --standalone -d dashboard.omnisync-wms.com

# Copy the keys into the omnisync certificates directory
mkdir -p /opt/omnisync/certs
sudo cp /etc/letsencrypt/live/dashboard.omnisync-wms.com/fullchain.pem /opt/omnisync/certs/
sudo cp /etc/letsencrypt/live/dashboard.omnisync-wms.com/privkey.pem /opt/omnisync/certs/
sudo chown -R deploy:deploy /opt/omnisync/certs
sudo chmod 600 /opt/omnisync/certs/privkey.pem
```

### 3.2 Automated SSL Renewal Cron
Certificates expire every 90 days. Set up a hook script to copy renewed certs and reload Nginx:
Create `/etc/letsencrypt/renewal-hooks/deploy/omnisync-nginx`:
```bash
#!/bin/bash
cp /etc/letsencrypt/live/dashboard.omnisync-wms.com/fullchain.pem /opt/omnisync/certs/
cp /etc/letsencrypt/live/dashboard.omnisync-wms.com/privkey.pem /opt/omnisync/certs/
chmod 600 /opt/omnisync/certs/privkey.pem
docker compose -f /opt/omnisync/docker-compose.yml -f /opt/omnisync/docker-compose.prod.yml exec -T nginx nginx -s reload
```
Make it executable:
```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/omnisync-nginx
```

---

## 4. Database Backup Automation

### 4.1 Installing the Backup Script
1. Deploy `backup-db.sh` to `/opt/omnisync/scripts/backup-db.sh`.
2. Make it executable:
   ```bash
   chmod +x /opt/omnisync/scripts/backup-db.sh
   ```
3. Initialize the backup log file:
   ```bash
   sudo touch /var/log/omnisync-backup.log
   sudo chown deploy:deploy /var/log/omnisync-backup.log
   ```

### 4.2 Cron Integration
Configure a cron job to run the backup daily at 2:00 AM.
Open the crontab editor for the `deploy` user:
```bash
crontab -e
```
Add the following line at the bottom:
```text
0 2 * * * /opt/omnisync/scripts/backup-db.sh >> /var/log/omnisync-backup.log 2>&1
```

### 4.3 Disaster Recovery / Restore Procedure
To restore the database from a compressed backup file:
```bash
# 1. Unzip the target backup file
gunzip -k /opt/omnisync/backups/omnisync_db_YYYYMMDD_HHMMSS.sql.gz

# 2. Terminate active application connections to avoid lock issues
docker compose stop api

# 3. Recreate / Clean the database
docker exec -i omnisync-postgres dropdb -U omnisync omnisync_db --if-exists
docker exec -i omnisync-postgres createdb -U omnisync omnisync_db

# 4. Stream SQL script into PostgreSQL
docker exec -i omnisync-postgres psql -U omnisync -d omnisync_db < /opt/omnisync/backups/omnisync_db_YYYYMMDD_HHMMSS.sql

# 5. Start API back up
docker compose start api
```

---

## 5. Cloud High-Availability (HA) Migration Triggers

As transactional volume grows, single-node architectures present constraints regarding uptime, performance, and point-of-failure exposure. The following triggers outline when OmniSync must migrate to a Cloud HA model.

### 5.1 Migration Triggers & Thresholds

| Metric Class | Single-Node Constraint (Trigger) | Business Metric Impact | HA Migration Action |
| :--- | :--- | :--- | :--- |
| **Database Storage** | PostgreSQL database exceeds **150 GB** size. | Heavy read/write queries degrade API latencies. | Migrate to **AWS RDS PostgreSQL** (Multi-AZ with automatic read-replicas). |
| **System Reliability** | Core application downtime exceeds **0.1%** monthly (SLA breach). | Intermittent order sync lag delays fulfillment. | Deploy across **Multi-AZ Application Load Balancer** with autoscale groups. |
| **Concurrency & Load** | System receives constant peak of **>500 webhooks/sec** or average CPU usage on host remains **>70%** for >2 hours. | Delayed webhook replies cause Lazada/Shopee/TikTok to retry, bloating queues. | Migrate to **AWS EKS / ECS Fargate** with autoscaling triggered by target CPU/webhook latency. |
| **Queue Saturation** | BullMQ background tasks exceed **20,000 pending jobs** with latency to process exceeding **5 minutes**. | Out-of-sync inventory levels causing customer cancellations. | Separate worker nodes and migrate to **Amazon ElastiCache for Redis** Cluster. |
| **Disaster Recovery** | RPO (Recovery Point Objective) target drops **< 1 hour**, or RTO (Recovery Time Objective) drops **< 15 mins**. | Manual backup restoration takes too long during database failure. | Enable RDS continuous automated backups, Point-in-Time Restore (PITR), and Multi-AZ replication. |

### 5.2 Target High-Availability Cloud Architecture

Once a trigger threshold is breached, the system is migrated to the following AWS-based highly available infrastructure:

```text
                  [ Internet Users ]
                          │ HTTPS (WAF Protected)
                          ▼
             [ AWS Route 53 (DNS Failover) ]
                          │
                          ▼
          [ Application Load Balancer (ALB) ]
            ┌─────────────┴─────────────┐
            ▼                           ▼
      [ Availability Zone A ]     [ Availability Zone B ]
      [ ECS Fargate / EKS ]       [ ECS Fargate / EKS ]
      ├── API Gateway             ├── API Gateway
      └── BullMQ Workers          └── BullMQ Workers
            │     └─────────┬─────────┘     │
            │               │               │
            ▼               ▼               ▼
      [ Amazon RDS ]  [ ElastiCache ] [ AWS Secrets ]
      PostgreSQL      Redis Cluster   Manager
      (Multi-AZ DB)   (Replicated)    (Secret Injection)
```

1. **Routing & WAF:** AWS Route 53 routes incoming requests through AWS WAF (Web Application Firewall) to block SQL injections, DDoS attacks, and bad bots before routing to an **AWS Application Load Balancer (ALB)**.
2. **Container Compute:** Run API Gateway and BullMQ queue workers inside **AWS ECS (Fargate)** or **AWS EKS (Kubernetes)** distributed symmetrically across at least two Availability Zones (AZ). Autoscale based on average CPU usage or queue backlog size.
3. **Persistent Database:** Migrate local PostgreSQL to **AWS RDS PostgreSQL (Multi-AZ)**. Read traffic (such as history reports and analytics queries) is offloaded to RDS **Read Replicas** in secondary availability zones.
4. **Queue Storage:** Replace local Redis with a secure, managed multi-node **Amazon ElastiCache for Redis** cluster.
5. **Secret Rotation:** Migrate Docker Secrets to **AWS Secrets Manager**, which automates secure rotation of database, Redis, and marketplace partner tokens dynamically.
