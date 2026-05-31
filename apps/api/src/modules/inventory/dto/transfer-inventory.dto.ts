import { IsUUID, IsNotEmpty, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class TransferInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  fromWarehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  toWarehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsOptional()
  description?: string;
}
