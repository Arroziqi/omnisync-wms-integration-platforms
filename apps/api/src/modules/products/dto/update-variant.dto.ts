import {
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class UpdateProductVariantDto {
  @IsOptional()
  @IsString()
  variantName?: string;

  @IsOptional()
  @IsString()
  variantSku?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;
}
