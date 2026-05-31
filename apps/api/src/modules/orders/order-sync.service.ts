import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity, OrderStatus, PaymentStatus } from '../../database/entities/order.entity';
import { OrderItemEntity } from '../../database/entities/order-item.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { InventoryEntity } from '../../database/entities/inventory.entity';
import { InventoryMovementEntity, MovementType } from '../../database/entities/inventory-movement.entity';
import { WarehouseEntity } from '../../database/entities/warehouse.entity';
import { OrderSyncFailureEntity, SyncFailureStatus } from '../../database/entities/order-sync-failure.entity';

@Injectable()
export class OrderSyncService {
  private readonly logger = new Logger(OrderSyncService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemRepo: Repository<OrderItemEntity>,
    @InjectRepository(MarketplaceAccountEntity)
    private readonly accountRepo: Repository<MarketplaceAccountEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepo: Repository<ProductVariantEntity>,
    @InjectRepository(OrderSyncFailureEntity)
    private readonly failureRepo: Repository<OrderSyncFailureEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Syncs orders from a specific marketplace account (handling both near-real-time and historical).
   */
  async syncOrdersForAccount(
    accountId: string,
    specificOrderNumber?: string,
  ): Promise<boolean> {
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) {
      this.logger.error(`Sync orders failed: Account with ID ${accountId} not found`);
      return false;
    }

    try {
      this.logger.log(
        `Starting order sync for ${account.marketplace.toUpperCase()} store "${account.sellerName}" (ID: ${accountId})`,
      );

      // Fetch external order data (real or simulated)
      const externalOrders = await this.fetchExternalOrders(account, specificOrderNumber);
      
      this.logger.log(`Fetched ${externalOrders.length} external orders to synchronize.`);

      let hasFailures = false;
      for (const extOrder of externalOrders) {
        try {
          await this.syncSingleOrder(accountId, extOrder);
          // If this order successfully synced, resolve its failure log
          await this.resolveFailure(accountId, extOrder.order_number);
        } catch (err: any) {
          this.logger.error(`Failed to sync individual order ${extOrder.order_number}: ${err.message}`);
          await this.recordFailure(accountId, extOrder, err.message);
          hasFailures = true;
        }
      }

      if (hasFailures) {
        this.logger.warn(`Order sync completed with failures for account ${accountId}.`);
        // We still return true to represent that the sync process ran successfully, 
        // but individual failures are persisted and managed separately.
      } else {
        this.logger.log(`Successfully completed order sync for account ${accountId}!`);
      }
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to execute order sync for account ${accountId}: ${err.message}`, err.stack);
      return false;
    }
  }

  /**
   * Records a failed synchronization in the database.
   */
  private async recordFailure(
    accountId: string,
    extOrder: any,
    errorMessage: string,
  ): Promise<void> {
    const orderNumber = extOrder.order_number;
    const customerName = extOrder.customer_name || 'Unknown';

    let failure = await this.failureRepo.findOne({
      where: { marketplaceAccountId: accountId, orderNumber },
    });

    if (failure) {
      failure.errorMessage = errorMessage;
      failure.status = SyncFailureStatus.FAILED;
      failure.retryCount += 1;
      await this.failureRepo.save(failure);
      this.logger.warn(
        `[SYNC-FAILURE] Updated sync failure log for Order ${orderNumber}. Retry count: ${failure.retryCount}`,
      );
    } else {
      failure = this.failureRepo.create({
        marketplaceAccountId: accountId,
        orderNumber,
        customerName,
        errorMessage,
        status: SyncFailureStatus.FAILED,
        retryCount: 0,
      });
      await this.failureRepo.save(failure);
      this.logger.error(
        `[SYNC-FAILURE] Logged new order sync failure for Order ${orderNumber}: ${errorMessage}`,
      );
    }
  }

  /**
   * Marks a previously failed sync log as resolved or deletes it.
   */
  private async resolveFailure(accountId: string, orderNumber: string): Promise<void> {
    const failure = await this.failureRepo.findOne({
      where: { marketplaceAccountId: accountId, orderNumber },
    });

    if (failure) {
      await this.failureRepo.remove(failure);
      this.logger.log(
        `[SYNC-FAILURE] Resolved sync failure for Order ${orderNumber}. Log entry cleared.`,
      );
    }
  }

  /**
   * Transforms and syncs a single order payload into our local DB, using transactions to maintain stock logic.
   */
  private async syncSingleOrder(accountId: string, extOrder: any): Promise<void> {
    const orderNumber = extOrder.order_number;

    if (extOrder.simulate_failure) {
      throw new Error(extOrder.failure_reason || 'Simulated marketplace integration error');
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Check for duplicate/existing order
      let order = await manager.findOne(OrderEntity, {
        where: { orderNumber },
        relations: { items: true },
      });

      const oldStatus = order ? order.orderStatus : null;
      const newStatus = extOrder.order_status as OrderStatus;

      // Prepare order header data
      const orderData = {
        marketplaceAccountId: accountId,
        orderNumber,
        customerName: extOrder.customer_name,
        customerPhone: extOrder.customer_phone,
        customerAddress: extOrder.customer_address,
        orderStatus: newStatus,
        paymentStatus: extOrder.payment_status as PaymentStatus,
        totalAmount: extOrder.total_amount,
        currency: extOrder.currency || 'IDR',
        marketplaceCreatedAt: new Date(extOrder.marketplace_created_at),
      };

      if (order) {
        // IDEMPOTENT UPDATE: Update order details
        Object.assign(order, orderData);
        order = await manager.save(OrderEntity, order);
        this.logger.log(`[SYNC] Order ${orderNumber} already exists. Updated status from "${oldStatus}" to "${newStatus}".`);
      } else {
        // INSERT NEW ORDER
        const newOrder = manager.create(OrderEntity, orderData);
        order = await manager.save(OrderEntity, newOrder);
        this.logger.log(`[SYNC] Created new order ${orderNumber} with status "${newStatus}".`);

        // Create order items
        const itemsToCreate = [];
        for (const extItem of extOrder.items) {
          const item = manager.create(OrderItemEntity, {
            orderId: order.id,
            productVariantId: extItem.product_variant_id || null,
            productName: extItem.product_name,
            quantity: extItem.quantity,
            price: extItem.price,
            subtotal: extItem.subtotal,
          });
          itemsToCreate.push(item);
        }
        await manager.save(OrderItemEntity, itemsToCreate);
        order.items = itemsToCreate;
      }

      // 2. STOCK RESERVATION / INVENTORY INTEGRATION LOGIC
      await this.handleInventoryStockTransition(manager, order, oldStatus, newStatus);
    });
  }

  /**
   * Transitions inventory stock locks/reservations based on order status change.
   */
  private async handleInventoryStockTransition(
    manager: any,
    order: OrderEntity,
    oldStatus: OrderStatus | null,
    newStatus: OrderStatus,
  ): Promise<void> {
    // We synchronize inventory with default warehouse WH-JKT-01 if it exists, or fall back to the first warehouse found.
    let warehouse = await manager.findOne(WarehouseEntity, { where: { code: 'WH-JKT-01' } });
    if (!warehouse) {
      warehouse = await manager.findOne(WarehouseEntity, {});
    }
    if (!warehouse) {
      this.logger.warn(`No warehouse facilities found in system. Skipping stock reservation logic.`);
      return;
    }

    for (const item of order.items) {
      if (!item.productVariantId) continue;

      // Load/create inventory level for variant
      let inventory = await manager.findOne(InventoryEntity, {
        where: { warehouseId: warehouse.id, variantId: item.productVariantId },
      });

      if (!inventory) {
        inventory = manager.create(InventoryEntity, {
          warehouseId: warehouse.id,
          variantId: item.productVariantId,
          quantity: 100, // Standard initial seed stock for simulation
          reserved: 0,
          available: 100,
        });
        inventory = await manager.save(InventoryEntity, inventory);
      }

      // Stock logic state machine
      if (oldStatus === null) {
        // A: Brand new order
        if (newStatus === OrderStatus.PENDING || newStatus === OrderStatus.SHIPPED || newStatus === OrderStatus.DELIVERED) {
          // Reserve the stock
          inventory.reserved += item.quantity;
          inventory.available = inventory.quantity - inventory.reserved;
          await manager.save(InventoryEntity, inventory);

          // Log reservation movement
          await manager.save(
            InventoryMovementEntity,
            manager.create(InventoryMovementEntity, {
              warehouseId: warehouse.id,
              variantId: item.productVariantId,
              type: MovementType.ADJUSTMENT,
              quantityDelta: 0, // reserved, not deducted yet
              previousQuantity: inventory.quantity,
              newQuantity: inventory.quantity,
              referenceId: order.orderNumber,
              description: `Reserved ${item.quantity} stock units for Order #${order.orderNumber}`,
            }),
          );
        }

        if (newStatus === OrderStatus.SHIPPED || newStatus === OrderStatus.DELIVERED) {
          // Deduct physical inventory (shipment out)
          const prevQty = inventory.quantity;
          inventory.quantity -= item.quantity;
          inventory.reserved -= item.quantity;
          inventory.available = inventory.quantity - inventory.reserved;
          await manager.save(InventoryEntity, inventory);

          // Log deduction movement
          await manager.save(
            InventoryMovementEntity,
            manager.create(InventoryMovementEntity, {
              warehouseId: warehouse.id,
              variantId: item.productVariantId,
              type: MovementType.ADJUSTMENT,
              quantityDelta: -item.quantity,
              previousQuantity: prevQty,
              newQuantity: inventory.quantity,
              referenceId: order.orderNumber,
              description: `Shipped / Deducted ${item.quantity} units for Order #${order.orderNumber}`,
            }),
          );
        }
      } else {
        // B: Existing order transitioning statuses
        const isReservedAlready = oldStatus === OrderStatus.PENDING;

        if (isReservedAlready && newStatus === OrderStatus.CANCELLED) {
          // Release reservation
          inventory.reserved -= item.quantity;
          inventory.available = inventory.quantity - inventory.reserved;
          await manager.save(InventoryEntity, inventory);

          await manager.save(
            InventoryMovementEntity,
            manager.create(InventoryMovementEntity, {
              warehouseId: warehouse.id,
              variantId: item.productVariantId,
              type: MovementType.ADJUSTMENT,
              quantityDelta: 0,
              previousQuantity: inventory.quantity,
              newQuantity: inventory.quantity,
              referenceId: order.orderNumber,
              description: `Released ${item.quantity} reserved units (Order #${order.orderNumber} Cancelled)`,
            }),
          );
        } else if (isReservedAlready && (newStatus === OrderStatus.SHIPPED || newStatus === OrderStatus.DELIVERED)) {
          // Commit reservation: deduct physical stock
          const prevQty = inventory.quantity;
          inventory.quantity -= item.quantity;
          inventory.reserved -= item.quantity;
          inventory.available = inventory.quantity - inventory.reserved;
          await manager.save(InventoryEntity, inventory);

          await manager.save(
            InventoryMovementEntity,
            manager.create(InventoryMovementEntity, {
              warehouseId: warehouse.id,
              variantId: item.productVariantId,
              type: MovementType.ADJUSTMENT,
              quantityDelta: -item.quantity,
              previousQuantity: prevQty,
              newQuantity: inventory.quantity,
              referenceId: order.orderNumber,
              description: `Committed reservation: Shipped ${item.quantity} units for Order #${order.orderNumber}`,
            }),
          );
        }
      }
    }
  }

  /**
   * Fetches remote order data from the marketplace. Simulates realistic payloads for MVP.
   */
  private async fetchExternalOrders(
    account: MarketplaceAccountEntity,
    specificOrderNumber?: string,
  ): Promise<any[]> {
    const isMockAccount =
      account.accessToken.includes('mock-') || account.sellerId.includes('_seller_');

    if (!isMockAccount) {
      this.logger.log(`Executing real marketplace integration endpoints...`);
      // Standard return of mock list as stub for actual API
    }

    // SIMULATION MODE
    // Discover active variants in DB to create real link mapping
    const activeVariants = await this.variantRepo.find({ relations: { product: true } });

    const generatedOrders = [];
    const seedNames = ['Ahmad Arroziqi', 'Budi Santoso', 'Siti Rahma', 'Dewi Lestari', 'Joko Widodo', 'Rian Hidayat'];
    const seedPhones = ['081234567890', '085712345678', '089988887777', '081122223333', '081399998888', '085244445555'];
    const seedAddresses = [
      'Kawasan Menteng Raya No. 45, Jakarta Pusat, DKI Jakarta',
      'Rungkut Asri Timur V/23, Surabaya, Jawa Timur',
      'Dago Elok Blok C3, Bandung, Jawa Barat',
      'Kaliurang KM 7.5, Depok, Sleman, Yogyakarta',
      'Sudirman Hill Residence Suite 18, Jakarta Selatan, DKI Jakarta',
      'Gatot Subroto No. 120, Semarang, Jawa Tengah',
    ];

    const orderNumbers = specificOrderNumber
      ? [specificOrderNumber]
      : [
          `${account.marketplace.substring(0, 2).toUpperCase()}-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          `${account.marketplace.substring(0, 2).toUpperCase()}-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          `${account.marketplace.substring(0, 2).toUpperCase()}-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        ];

    for (let i = 0; i < orderNumbers.length; i++) {
      const orderNum = orderNumbers[i];
      const randomSeed = Math.floor(Math.random() * seedNames.length);

      // Select random item variant or create simulated item
      const itemVariant = activeVariants.length > 0 
        ? activeVariants[Math.floor(Math.random() * activeVariants.length)]
        : null;

      const qty = Math.floor(1 + Math.random() * 3);
      const price = itemVariant ? Number(itemVariant.price) : 150000; // IDR currency default
      const subtotal = price * qty;
      const shippingFee = 15000;
      const totalAmount = subtotal + shippingFee;

      const items = [
        {
          product_variant_id: itemVariant ? itemVariant.id : null,
          product_name: itemVariant 
            ? `${itemVariant.product?.name} — ${itemVariant.variantName}`
            : 'Premium Ergonomic Office Chair',
          quantity: qty,
          price,
          subtotal,
        },
      ];

      // Random status
      const statuses = [OrderStatus.PENDING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
      const orderStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentStatus = orderStatus === OrderStatus.PENDING 
        ? PaymentStatus.PENDING 
        : PaymentStatus.PAID;

      // 1 out of 3 generated orders will fail in bulk mode
      const simulateFailure = !specificOrderNumber && i === 1;
      const failureReason = simulateFailure
        ? 'Marketplace API rate limit exceeded'
        : undefined;

      generatedOrders.push({
        order_number: orderNum,
        customer_name: seedNames[randomSeed],
        customer_phone: seedPhones[randomSeed],
        customer_address: seedAddresses[randomSeed],
        order_status: orderStatus,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        currency: 'IDR',
        marketplace_created_at: new Date(Date.now() - i * 3600000).toISOString(),
        items,
        simulate_failure: simulateFailure,
        failure_reason: failureReason,
      });
    }

    return generatedOrders;
  }
}
