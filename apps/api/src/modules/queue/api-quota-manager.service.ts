import { Injectable, Logger } from '@nestjs/common';

interface MarketplaceQuotaConfig {
  /** Maximum number of API calls in the sliding window */
  maxRequests: number;
  /** Sliding window duration in milliseconds */
  windowMs: number;
}

interface QuotaBucket {
  count: number;
  windowStart: number;
}

/**
 * API Quota Manager — Sliding-Window Rate Limiter
 *
 * Enforces per-marketplace API call rate limits to prevent exceeding
 * the request quotas imposed by marketplace APIs.
 *
 * Default limits (aligned with public marketplace documentation):
 *  - TikTok Shop:   40 calls / 10 seconds
 *  - Shopee:       100 calls / 60 seconds
 *  - Lazada:       100 calls / 60 seconds
 *
 * Usage:
 *   await this.quotaManager.waitForSlot('tiktok');
 *   // ... make API call ...
 */
@Injectable()
export class ApiQuotaManagerService {
  private readonly logger = new Logger(ApiQuotaManagerService.name);

  /** Per-marketplace sliding-window configurations */
  private readonly configs: Record<string, MarketplaceQuotaConfig> = {
    tiktok: {
      maxRequests: Number(process.env.TIKTOK_RATE_LIMIT) || 40,
      windowMs: 10_000, // 10 seconds
    },
    shopee: {
      maxRequests: Number(process.env.SHOPEE_RATE_LIMIT) || 100,
      windowMs: 60_000, // 1 minute
    },
    lazada: {
      maxRequests: Number(process.env.LAZADA_RATE_LIMIT) || 100,
      windowMs: 60_000, // 1 minute
    },
  };

  /** In-memory sliding-window state per marketplace */
  private readonly buckets = new Map<string, QuotaBucket>();

  /**
   * Waits until a quota slot is available for the given marketplace,
   * then increments the counter and returns.
   *
   * Callers should `await` this before making marketplace API requests.
   */
  async waitForSlot(marketplace: string): Promise<void> {
    const key = marketplace.toLowerCase();
    const config = this.configs[key];

    if (!config) {
      // Unknown marketplace — no quota enforcement
      return;
    }

    return new Promise<void>((resolve) => {
      this.tryAcquireSlot(key, config, resolve);
    });
  }

  private tryAcquireSlot(
    marketplace: string,
    config: MarketplaceQuotaConfig,
    resolve: () => void,
  ): void {
    const now = Date.now();
    const existing = this.buckets.get(marketplace);

    if (!existing || now - existing.windowStart >= config.windowMs) {
      // Start a fresh window
      this.buckets.set(marketplace, { count: 1, windowStart: now });
      resolve();
      return;
    }

    if (existing.count < config.maxRequests) {
      // Slot available in current window
      existing.count++;
      resolve();
      return;
    }

    // Quota exhausted — calculate wait time until the window resets
    const remainingMs = config.windowMs - (now - existing.windowStart);
    this.logger.warn(
      `[QUOTA] ${marketplace.toUpperCase()} quota exhausted (${existing.count}/${config.maxRequests}). ` +
        `Waiting ${remainingMs}ms for window reset...`,
    );

    setTimeout(() => {
      this.tryAcquireSlot(marketplace, config, resolve);
    }, remainingMs);
  }

  /**
   * Returns current quota utilisation stats for all tracked marketplaces.
   * Useful for monitoring endpoints.
   */
  getQuotaStats(): Record<string, { used: number; max: number; windowMs: number; utilisation: string }> {
    const now = Date.now();
    const stats: Record<string, { used: number; max: number; windowMs: number; utilisation: string }> = {};

    for (const [key, config] of Object.entries(this.configs)) {
      const bucket = this.buckets.get(key);
      const isWindowActive = bucket && now - bucket.windowStart < config.windowMs;
      const used = isWindowActive ? bucket!.count : 0;

      stats[key] = {
        used,
        max: config.maxRequests,
        windowMs: config.windowMs,
        utilisation: `${Math.round((used / config.maxRequests) * 100)}%`,
      };
    }

    return stats;
  }
}
