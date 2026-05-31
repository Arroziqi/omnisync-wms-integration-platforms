import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { TransferInventoryDto } from './dto/transfer-inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * GET /api/v1/inventory
   * Retrieves paginated warehouse stock levels.
   */
  @Get()
  @Permissions('inventory:read')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.findAll({ page, limit, search, warehouseId });
  }

  /**
   * GET /api/v1/inventory/warehouses
   * Retrieves all warehouses and their stock summaries.
   */
  @Get('warehouses')
  @Permissions('inventory:read')
  async findAllWarehouses() {
    return this.inventoryService.findAllWarehouses();
  }

  /**
   * POST /api/v1/inventory/warehouses
   * Creates a new physical warehouse facility.
   */
  @Post('warehouses')
  @Permissions('inventory:write')
  @HttpCode(HttpStatus.CREATED)
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  /**
   * PATCH /api/v1/inventory/warehouses/:id
   * Updates warehouse configuration details.
   */
  @Patch('warehouses/:id')
  @Permissions('inventory:write')
  async updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.inventoryService.updateWarehouse(id, dto);
  }

  /**
   * DELETE /api/v1/inventory/warehouses/:id
   * Soft deletes a warehouse from the system.
   */
  @Delete('warehouses/:id')
  @Permissions('inventory:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWarehouse(@Param('id') id: string) {
    return this.inventoryService.deleteWarehouse(id);
  }

  /**
   * POST /api/v1/inventory/adjust
   * Adjusts the physical count of items inside a warehouse.
   */
  @Post('adjust')
  @Permissions('inventory:write')
  @HttpCode(HttpStatus.OK)
  async adjustStock(@Body() dto: AdjustInventoryDto, @Req() req: any) {
    const userId = req.user?.userId || null;
    return this.inventoryService.adjustStock(dto, userId);
  }

  /**
   * POST /api/v1/inventory/transfer
   * Performs an atomic physical transfer of variant stock between two warehouses.
   */
  @Post('transfer')
  @Permissions('inventory:write')
  @HttpCode(HttpStatus.OK)
  async transferStock(@Body() dto: TransferInventoryDto, @Req() req: any) {
    const userId = req.user?.userId || null;
    return this.inventoryService.transferStock(dto, userId);
  }

  /**
   * GET /api/v1/inventory/movements
   * Fetches the historical log of physical inventory movements.
   */
  @Get('movements')
  @Permissions('inventory:read')
  async getMovements(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getMovements({ page, limit, warehouseId });
  }
}
