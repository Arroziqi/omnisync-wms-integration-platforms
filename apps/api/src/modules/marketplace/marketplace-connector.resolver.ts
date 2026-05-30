import { Injectable } from '@nestjs/common';
import { TikTokConnectorService } from './connectors/tiktok-connector.service';
import { ShopeeConnectorService } from './connectors/shopee-connector.service';
import { LazadaConnectorService } from './connectors/lazada-connector.service';
import { IMarketplaceConnector } from './interfaces/marketplace-connector.interface';

@Injectable()
export class MarketplaceConnectorResolver {
  constructor(
    private readonly tiktok: TikTokConnectorService,
    private readonly shopee: ShopeeConnectorService,
    private readonly lazada: LazadaConnectorService,
  ) {}

  /**
   * Resolves the connector service for a given marketplace name.
   */
  resolve(marketplace: string): IMarketplaceConnector {
    switch (marketplace.toLowerCase()) {
      case 'tiktok':
        return this.tiktok;
      case 'shopee':
        return this.shopee;
      case 'lazada':
        return this.lazada;
      default:
        throw new Error(`Unsupported marketplace: ${marketplace}`);
    }
  }
}
