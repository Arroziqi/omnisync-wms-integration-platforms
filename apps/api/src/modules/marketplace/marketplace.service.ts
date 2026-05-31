import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import {
  MarketplaceAccountEntity,
  MarketplaceType,
  AccountStatus,
} from '../../database/entities/marketplace-account.entity';
import { OAuthStateEntity } from '../../database/entities/oauth-state.entity';
import { EncryptionService } from './encryption.service';
import { MarketplaceConnectorResolver } from './marketplace-connector.resolver';

@Injectable()
export class MarketplaceService implements OnModuleInit {
  public readonly accountConnected$ = new Subject<string>();

  constructor(
    @InjectRepository(MarketplaceAccountEntity)
    private readonly accountRepo: Repository<MarketplaceAccountEntity>,
    @InjectRepository(OAuthStateEntity)
    private readonly stateRepo: Repository<OAuthStateEntity>,
    private readonly encryption: EncryptionService,
    private readonly connectorResolver: MarketplaceConnectorResolver,
  ) {}

  onModuleInit() {
    // Run automated token refresh check every 1 hour (3,600,000 milliseconds)
    setInterval(() => {
      this.autoRefreshTokens().catch((err) => {
        console.error('Automated token refresh check failed:', err);
      });
    }, 3600000);

    // Run automated token expiration check every 1 hour (3,600,000 milliseconds)
    setInterval(() => {
      this.checkTokenExpirations().catch((err) => {
        console.error('Automated token expiration check failed:', err);
      });
    }, 3600000);

    // Run automated health diagnostics check for all channels every 6 hours (21,600,000 milliseconds)
    setInterval(() => {
      this.checkAllAccountsHealth().catch((err) => {
        console.error('Automated system connection diagnostics check failed:', err);
      });
    }, 21600000);
  }

  /**
   * Generates a temporary state token and the redirection URL for OAuth connection.
   */
  async connect(marketplace: string, _userId: string): Promise<{ url: string; state: string }> {
    const cleanMarketplace = marketplace.toLowerCase();
    if (
      cleanMarketplace !== MarketplaceType.TIKTOK &&
      cleanMarketplace !== MarketplaceType.SHOPEE &&
      cleanMarketplace !== MarketplaceType.LAZADA
    ) {
      throw new BadRequestException(`Unsupported marketplace: ${marketplace}`);
    }

    const stateToken = crypto.randomBytes(16).toString('hex');
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10); // 10-minute expiration

    const oauthState = this.stateRepo.create({
      state: stateToken,
      marketplace: cleanMarketplace,
      expiredAt: expiration,
    });
    await this.stateRepo.save(oauthState);

    const connector = this.connectorResolver.resolve(cleanMarketplace);
    const url = connector.getAuthorizationUrl(stateToken);

    return { url, state: stateToken };
  }

  /**
   * Processes the callback from marketplace, exchanging the auth code for encrypted tokens.
   */
  async handleCallback(code: string, state: string, userId: string | null = null): Promise<any> {
    const stateRecord = await this.stateRepo.findOne({ where: { state } });
    if (!stateRecord) {
      throw new BadRequestException('OAuth validation failed: State not found');
    }

    if (new Date() > stateRecord.expiredAt) {
      await this.stateRepo.remove(stateRecord);
      throw new BadRequestException('OAuth validation failed: State has expired');
    }

    const marketplace = stateRecord.marketplace as MarketplaceType;
    const connector = this.connectorResolver.resolve(marketplace);

    // Exchange auth code for tokens
    const tokens = await connector.exchangeCodeForTokens(code);

    // Encrypt sensitive access and refresh tokens
    const encryptedAccessToken = this.encryption.encrypt(tokens.accessToken);
    const encryptedRefreshToken = this.encryption.encrypt(tokens.refreshToken);
    const tokenExpiredAt = new Date(Date.now() + tokens.expiresIn * 1000);

    // Check for existing account matching marketplace + sellerId
    let account = await this.accountRepo.findOne({
      where: { marketplace, sellerId: tokens.sellerId },
      withDeleted: true,
    });

    if (account) {
      // Re-enable and update existing account
      account.sellerName = tokens.sellerName;
      account.accessToken = encryptedAccessToken;
      account.refreshToken = encryptedRefreshToken;
      account.tokenExpiredAt = tokenExpiredAt;
      account.status = AccountStatus.ACTIVE;
      account.deletedAt = null;
      account.createdBy = userId || account.createdBy;
    } else {
      // Create new account
      account = this.accountRepo.create({
        marketplace,
        sellerId: tokens.sellerId,
        sellerName: tokens.sellerName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiredAt,
        status: AccountStatus.ACTIVE,
        createdBy: userId,
      });
    }

    await this.accountRepo.save(account);

    // Trigger background sync events (historical sync for orders, products)
    this.accountConnected$.next(account.id);

    // Consume (delete) the temporary state
    await this.stateRepo.remove(stateRecord);

    return {
      id: account.id,
      marketplace: account.marketplace,
      sellerId: account.sellerId,
      sellerName: account.sellerName,
      status: account.status,
    };
  }

  /**
   * Retrieves all connected marketplace accounts. Omits sensitive token values for security.
   */
  async getConnectedAccounts(): Promise<any[]> {
    const accounts = await this.accountRepo.find();
    const now = new Date();
    let hasChanges = false;
    for (const acc of accounts) {
      if (acc.status === AccountStatus.ACTIVE && acc.tokenExpiredAt <= now) {
        acc.status = AccountStatus.EXPIRED;
        await this.accountRepo.save(acc);
        hasChanges = true;
      }
    }

    const finalAccounts = hasChanges ? await this.accountRepo.find() : accounts;
    return finalAccounts.map((acc) => {
      // Omit tokens to prevent exposing encrypted payloads to the client
      const { accessToken: _accessToken, refreshToken: _refreshToken, ...publicFields } = acc;
      return publicFields;
    });
  }

  /**
   * Manually triggers token refresh for a specific account.
   */
  async refreshAccountTokens(id: string): Promise<any> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Marketplace account with ID ${id} not found`);
    }

    const decryptedRefreshToken = this.encryption.decrypt(account.refreshToken);
    const connector = this.connectorResolver.resolve(account.marketplace);

    const tokens = await connector.refreshTokens(decryptedRefreshToken);

    account.accessToken = this.encryption.encrypt(tokens.accessToken);
    account.refreshToken = this.encryption.encrypt(tokens.refreshToken);
    account.tokenExpiredAt = new Date(Date.now() + tokens.expiresIn * 1000);
    account.status = AccountStatus.ACTIVE;

    await this.accountRepo.save(account);

    const { accessToken: _accessToken, refreshToken: _refreshToken, ...publicFields } = account;
    return publicFields;
  }

  /**
   * Disconnects and soft-deletes a marketplace account.
   */
  async disconnectAccount(id: string): Promise<void> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Marketplace account with ID ${id} not found`);
    }

    account.status = AccountStatus.DISCONNECTED;
    await this.accountRepo.save(account);
    await this.accountRepo.softDelete(id);
  }

  /**
   * Checks connection health using the connector interface.
   */
  async getAccountHealth(id: string): Promise<{ active: boolean }> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Marketplace account with ID ${id} not found`);
    }

    try {
      const decryptedAccessToken = this.encryption.decrypt(account.accessToken);
      const connector = this.connectorResolver.resolve(account.marketplace);
      
      const active = await connector.getAccountHealth(decryptedAccessToken);
      
      if (!active && account.status === AccountStatus.ACTIVE) {
        account.status = AccountStatus.EXPIRED;
        await this.accountRepo.save(account);
      } else if (active && account.status === AccountStatus.EXPIRED) {
        account.status = AccountStatus.ACTIVE;
        await this.accountRepo.save(account);
      }
      
      return { active };
    } catch (_err) {
      return { active: false };
    }
  }

  /**
   * Handles deauthorization webhooks by updating the store connection status and soft-deleting.
   */
  async handleDeauthorization(marketplace: string, sellerId: string): Promise<void> {
    const cleanMarketplace = marketplace.toLowerCase() as MarketplaceType;
    const account = await this.accountRepo.findOne({
      where: { marketplace: cleanMarketplace, sellerId },
    });

    if (account) {
      account.status = AccountStatus.DISCONNECTED;
      await this.accountRepo.save(account);
      await this.accountRepo.softDelete(account.id);
    }
  }

  /**
   * Automatically refreshes all active accounts' tokens that are expiring within the next 24 hours.
   */
  async autoRefreshTokens(): Promise<void> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() + 24);

    const expiringAccounts = await this.accountRepo.find({
      where: {
        status: AccountStatus.ACTIVE,
        tokenExpiredAt: LessThan(thresholdDate),
      },
    });

    for (const account of expiringAccounts) {
      try {
        await this.refreshAccountTokens(account.id);
      } catch (err) {
        console.error(`Failed to automatically refresh token for account ${account.id}:`, err);
      }
    }
  }

  /**
   * Scans and flags expired accounts in the database.
   */
  async checkTokenExpirations(): Promise<{ updatedCount: number }> {
    const now = new Date();
    const activeAccounts = await this.accountRepo.find({
      where: { status: AccountStatus.ACTIVE },
    });

    let updatedCount = 0;
    for (const account of activeAccounts) {
      if (account.tokenExpiredAt <= now) {
        account.status = AccountStatus.EXPIRED;
        await this.accountRepo.save(account);
        updatedCount++;
      }
    }
    return { updatedCount };
  }

  /**
   * Iterates through active/expired marketplace channels and executes connector health verification.
   */
  async checkAllAccountsHealth(): Promise<{ checkedCount: number; unhealthyCount: number }> {
    const accounts = await this.accountRepo.find();
    const activeOrExpired = accounts.filter(
      (acc) => acc.status === AccountStatus.ACTIVE || acc.status === AccountStatus.EXPIRED,
    );

    let unhealthyCount = 0;
    for (const account of activeOrExpired) {
      try {
        const { active } = await this.getAccountHealth(account.id);
        if (!active) {
          unhealthyCount++;
        }
      } catch (_err) {
        unhealthyCount++;
      }
    }

    return {
      checkedCount: activeOrExpired.length,
      unhealthyCount,
    };
  }
}
