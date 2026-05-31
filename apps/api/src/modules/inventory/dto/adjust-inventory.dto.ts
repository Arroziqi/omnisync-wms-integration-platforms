import { IsUUID, IsNotEmpty, IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { MovementType } from '../../../database/entities/inventory-movement.entity';

export class AdjustInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @IsInt()
  @IsNotEmpty()
  quantityDelta: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MovementType)
  @IsOptional()
  type?: MovementType;
}
