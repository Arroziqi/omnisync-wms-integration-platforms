import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MarketplaceType } from '../../../database/entities/marketplace-account.entity';

export class DeauthorizeDto {
  @IsNotEmpty()
  @IsEnum(MarketplaceType, {
    message: 'marketplace must be one of: tiktok, shopee, lazada',
  })
  marketplace: string;

  @IsNotEmpty()
  @IsString()
  seller_id: string;
}
