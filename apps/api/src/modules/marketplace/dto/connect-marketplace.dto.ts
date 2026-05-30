import { IsEnum, IsNotEmpty } from 'class-validator';
import { MarketplaceType } from '../../../database/entities/marketplace-account.entity';

export class ConnectMarketplaceDto {
  @IsNotEmpty()
  @IsEnum(MarketplaceType, {
    message: 'marketplace must be one of: tiktok, shopee, lazada',
  })
  marketplace: string;
}
