import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class ConnectMarketplaceProductDto {
  @IsNotEmpty()
  @IsUUID('4')
  marketplaceAccountId: string;

  @IsNotEmpty()
  @IsUUID('4')
  productId: string;

  @IsNotEmpty()
  @IsString()
  marketplaceProductId: string;

  @IsOptional()
  @IsString()
  marketplaceVariantId?: string;
}
