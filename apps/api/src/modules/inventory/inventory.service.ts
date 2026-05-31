import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { WarehouseEntity } from '../../database/entities/warehouse.entity';
import { InventoryEntity } from '../../database/entities/inventory.entity';
import { InventoryMovementEntity, MovementType } from '../../database/entities/inventory-movement.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { TransferInventoryDto } from './dto/transfer-inventory.dto';
import { InventorySyncQueueService } from './inventory-sync-queue.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(InventoryEntity)
    private readonly inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly movementRepo: Repository<InventoryMovementEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepo: Repository<ProductVariantEntity>,
    private readonly syncQueue: InventorySyncQueueService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Retrieves paginated, searchable inventory levels across warehouses.
   */
  async findAll(options: { page?: number; limit?: number; search?: string; warehouseId?: string }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));
    const skip = (page - 1) * limit;

    const query = this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.warehouse', 'warehouse')
      .leftJoinAndSelect('inventory.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .where('warehouse.deletedAt IS NULL');

    if (options.warehouseId) {
      query.andWhere('inventory.warehouseId = :warehouseId', { warehouseId: options.warehouseId });
    }

    if (options.search) {
      query.andWhere(
        '(variant.variantSku ILIKE :search OR variant.variantName ILIKE :search OR product.name ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    const [data, total] = await query
      .orderBy('inventory.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves all warehouses and calculates basic stock summaries.
   */
  async findAllWarehouses() {
    const warehouses = await this.warehouseRepo.find({
      order: { createdAt: 'DESC' },
    });

    const summaries = await Promise.all(
      warehouses.map(async (wh) => {
        const inventories = await this.inventoryRepo.find({
          where: { warehouseId: wh.id },
        });

        const totalVariants = inventories.length;
        const totalPhysicalStock = inventories.reduce((sum, inv) => sum + inv.quantity, 0);

        return {
          ...wh,
          totalVariants,
          totalPhysicalStock,
        };
      }),
    );

    return summaries;
  }

  /**
   * Creates a new warehouse storage facility.
   */
  async createWarehouse(dto: CreateWarehouseDto) {
    const existing = await this.warehouseRepo.findOne({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Warehouse with code "${dto.code}" already exists.`);
    }

    const warehouse = this.warehouseRepo.create(dto);
    return this.warehouseRepo.save(warehouse);
  }

  /**
   * Updates warehouse details.
   */
  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found.`);
    }

    if (dto.code && dto.code !== warehouse.code) {
      const existing = await this.warehouseRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new BadRequestException(`Warehouse with code "${dto.code}" already exists.`);
      }
    }

    Object.assign(warehouse, dto);
    return this.warehouseRepo.save(warehouse);
  }

  /**
   * Soft deletes a warehouse.
   */
  async deleteWarehouse(id: string) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found.`);
    }

    await this.warehouseRepo.softRemove(warehouse);
  }

  /**
   * Adjusts physical inventory stock for a variant inside a specific warehouse.
   */
  async adjustStock(dto: AdjustInventoryDto, userId: string | null) {
    const warehouse = await this.warehouseRepo.findOne({ where: { id: dto.warehouseId } });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${dto.warehouseId} not found.`);
    }

    const variant = await this.variantRepo.findOne({ where: { id: dto.variantId } });
    if (!variant) {
      throw new NotFoundException(`Product variant with ID ${dto.variantId} not found.`);
    }

    // Run within a transaction to maintain audit and level consistency
    return this.dataSource.transaction(async (manager) => {
      let inventory = await manager.findOne(InventoryEntity, {
        where: { warehouseId: dto.warehouseId, variantId: dto.variantId },
      });

      const previousQuantity = inventory ? inventory.quantity : 0;
      const previousReserved = inventory ? inventory.reserved : 0;

      const newQuantity = previousQuantity + dto.quantityDelta;

      if (newQuantity < 0) {
        throw new BadRequestException('Physical inventory quantity cannot drop below zero.');
      }

      if (newQuantity < previousReserved) {
        throw new BadRequestException(
          `Cannot adjust physical quantity to ${newQuantity} because ${previousReserved} units are reserved for orders.`,
        );
      }

      if (!inventory) {
        inventory = manager.create(InventoryEntity, {
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: newQuantity,
          reserved: 0,
          available: newQuantity,
        });
      } else {
        inventory.quantity = newQuantity;
        inventory.available = newQuantity - inventory.reserved;
      }

      const savedInventory = await manager.save(InventoryEntity, inventory);

      // Create and save movement audit log
      const movement = manager.create(InventoryMovementEntity, {
        warehouseId: dto.warehouseId,
        variantId: dto.variantId,
        type: dto.type || MovementType.ADJUSTMENT,
        quantityDelta: dto.quantityDelta,
        previousQuantity,
        newQuantity,
        referenceId: null,
        description: dto.description || 'Manual stock level adjustment',
        userId,
      });

      await manager.save(InventoryMovementEntity, movement);

      // Dispatch background sync task
      this.syncQueue.addSyncJob(dto.variantId);

      return savedInventory;
    });
  }

  /**
   * Performs an atomic physical transfer of items from one warehouse to another.
   */
  async transferStock(dto: TransferInventoryDto, userId: string | null) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses cannot be the same.');
    }

    const fromWarehouse = await this.warehouseRepo.findOne({ where: { id: dto.fromWarehouseId } });
    if (!fromWarehouse) {
      throw new NotFoundException(`Source warehouse with ID ${dto.fromWarehouseId} not found.`);
    }

    const toWarehouse = await this.warehouseRepo.findOne({ where: { id: dto.toWarehouseId } });
    if (!toWarehouse) {
      throw new NotFoundException(`Destination warehouse with ID ${dto.toWarehouseId} not found.`);
    }

    const variant = await this.variantRepo.findOne({ where: { id: dto.variantId } });
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${dto.variantId} not found.`);
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Source warehouse deduction
      let fromInventory = await manager.findOne(InventoryEntity, {
        where: { warehouseId: dto.fromWarehouseId, variantId: dto.variantId },
      });

      if (!fromInventory || fromInventory.available < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available stock in source warehouse: ${fromInventory ? fromInventory.available : 0}`,
        );
      }

      const fromPrevQty = fromInventory.quantity;
      const fromNewQty = fromPrevQty - dto.quantity;

      fromInventory.quantity = fromNewQty;
      fromInventory.available = fromNewQty - fromInventory.reserved;
      await manager.save(InventoryEntity, fromInventory);

      // Log source movement (transfer_out)
      const outMovement = manager.create(InventoryMovementEntity, {
        warehouseId: dto.fromWarehouseId,
        variantId: dto.variantId,
        type: MovementType.TRANSFER_OUT,
        quantityDelta: -dto.quantity,
        previousQuantity: fromPrevQty,
        newQuantity: fromNewQty,
        referenceId: `transfer_${dto.fromWarehouseId}_to_${dto.toWarehouseId}`,
        description: dto.description || `Stock transfer to ${toWarehouse.name}`,
        userId,
      });
      await manager.save(InventoryMovementEntity, outMovement);

      // 2. Destination warehouse receipt
      let toInventory = await manager.findOne(InventoryEntity, {
        where: { warehouseId: dto.toWarehouseId, variantId: dto.variantId },
      });

      const toPrevQty = toInventory ? toInventory.quantity : 0;
      const toNewQty = toPrevQty + dto.quantity;

      if (!toInventory) {
        toInventory = manager.create(InventoryEntity, {
          warehouseId: dto.toWarehouseId,
          variantId: dto.variantId,
          quantity: toNewQty,
          reserved: 0,
          available: toNewQty,
        });
      } else {
        toInventory.quantity = toNewQty;
        toInventory.available = toNewQty - toInventory.reserved;
      }
      await manager.save(InventoryEntity, toInventory);

      // Log destination movement (transfer_in)
      const inMovement = manager.create(InventoryMovementEntity, {
        warehouseId: dto.toWarehouseId,
        variantId: dto.variantId,
        type: MovementType.TRANSFER_IN,
        quantityDelta: dto.quantity,
        previousQuantity: toPrevQty,
        newQuantity: toNewQty,
        referenceId: `transfer_${dto.fromWarehouseId}_to_${dto.toWarehouseId}`,
        description: dto.description || `Stock transfer from ${fromWarehouse.name}`,
        userId,
      });
      await manager.save(InventoryMovementEntity, inMovement);

      // Dispatch background sync task for the updated variant stock
      this.syncQueue.addSyncJob(dto.variantId);

      return {
        success: true,
        message: `Successfully transferred ${dto.quantity} items of variant "${variant.variantSku}".`,
      };
    });
  }

  /**
   * Returns a historical list of all inventory movements.
   */
  async getMovements(options: { page?: number; limit?: number; warehouseId?: string }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.warehouseId) {
      where.warehouseId = options.warehouseId;
    }

    const [data, total] = await this.movementRepo.findAndCount({
      where,
      relations: {
        warehouse: true,
        variant: {
          product: true,
        },
        user: true,
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
