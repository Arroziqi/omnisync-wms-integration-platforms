import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsNotEmpty()
  @IsString()
  variantName: string;

  @IsNotEmpty()
  @IsString()
  variantSku: string;

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
