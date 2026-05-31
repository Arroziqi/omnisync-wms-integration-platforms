import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { WarehouseEntity } from '../../database/entities/warehouse.entity';
import { InventoryEntity } from '../../database/entities/inventory.entity';
import { InventoryMovementEntity } from '../../database/entities/inventory-movement.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { InventorySyncQueueService } from './inventory-sync-queue.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let warehouseRepo: jest.Mocked<Repository<WarehouseEntity>>;
  let _inventoryRepo: jest.Mocked<Repository<InventoryEntity>>;
  let _movementRepo: jest.Mocked<Repository<InventoryMovementEntity>>;
  let variantRepo: jest.Mocked<Repository<ProductVariantEntity>>;
  let syncQueue: jest.Mocked<InventorySyncQueueService>;
  
  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn((arg1, arg2) => {
      const val = arg2 !== undefined ? arg2 : arg1;
      return Promise.resolve({ id: 'saved_id', ...val });
    }),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    });

    const mockSyncQueue = {
      addSyncJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(WarehouseEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(InventoryEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(InventoryMovementEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(ProductVariantEntity), useFactory: mockRepo },
        { provide: InventorySyncQueueService, useValue: mockSyncQueue },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    warehouseRepo = module.get(getRepositoryToken(WarehouseEntity));
    inventoryRepo = module.get(getRepositoryToken(InventoryEntity));
    movementRepo = module.get(getRepositoryToken(InventoryMovementEntity));
    variantRepo = module.get(getRepositoryToken(ProductVariantEntity));
    syncQueue = module.get(InventorySyncQueueService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Warehouse Operations', () => {
    it('should create a warehouse successfully if code is unique', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);
      warehouseRepo.create.mockReturnValue({ code: 'WH1', name: 'Test WH' } as any);
      warehouseRepo.save.mockResolvedValue({ id: 'wh_id', code: 'WH1', name: 'Test WH' } as any);

      const result = await service.createWarehouse({ code: 'WH1', name: 'Test WH' });
      expect(result.code).toBe('WH1');
      expect(warehouseRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if warehouse code already exists', async () => {
      warehouseRepo.findOne.mockResolvedValue({ id: 'exists' } as any);

      await expect(
        service.createWarehouse({ code: 'WH1', name: 'Test WH' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adjustStock', () => {
    it('should throw NotFoundException if warehouse does not exist', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.adjustStock(
          { warehouseId: 'invalid_wh', variantId: 'var_id', quantityDelta: 5 },
          'user_id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if variant does not exist', async () => {
      warehouseRepo.findOne.mockResolvedValue({ id: 'wh_id' } as any);
      variantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.adjustStock(
          { warehouseId: 'wh_id', variantId: 'invalid_var', quantityDelta: 5 },
          'user_id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should adjust inventory and log movements successfully', async () => {
      warehouseRepo.findOne.mockResolvedValue({ id: 'wh_id' } as any);
      variantRepo.findOne.mockResolvedValue({ id: 'var_id', variantSku: 'SKU1' } as any);
      
      // Existing inventory levels: 10 physical, 2 reserved
      mockEntityManager.findOne.mockResolvedValue({
        warehouseId: 'wh_id',
        variantId: 'var_id',
        quantity: 10,
        reserved: 2,
        available: 8,
      });

      mockEntityManager.create.mockImplementation((entityClass, data) => data);

      const result = await service.adjustStock(
        { warehouseId: 'wh_id', variantId: 'var_id', quantityDelta: 5 },
        'user_id',
      );

      // Verify physical stock goes 10 -> 15, available goes 8 -> 13
      expect(result.quantity).toBe(15);
      expect(result.available).toBe(13);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2); // Save inventory and movement
      expect(syncQueue.addSyncJob).toHaveBeenCalledWith('var_id');
    });

    it('should throw BadRequestException if adjustment results in negative physical stock', async () => {
      warehouseRepo.findOne.mockResolvedValue({ id: 'wh_id' } as any);
      variantRepo.findOne.mockResolvedValue({ id: 'var_id', variantSku: 'SKU1' } as any);

      // Existing inventory levels: 5 physical
      mockEntityManager.findOne.mockResolvedValue({
        warehouseId: 'wh_id',
        variantId: 'var_id',
        quantity: 5,
        reserved: 0,
        available: 5,
      });

      await expect(
        service.adjustStock(
          { warehouseId: 'wh_id', variantId: 'var_id', quantityDelta: -10 },
          'user_id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transferStock', () => {
    it('should throw BadRequestException if source and target warehouses are identical', async () => {
      await expect(
        service.transferStock(
          { fromWarehouseId: 'wh1', toWarehouseId: 'wh1', variantId: 'var1', quantity: 5 },
          'user_id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should execute stock transfer between warehouses atomicly', async () => {
      warehouseRepo.findOne
        .mockResolvedValueOnce({ id: 'wh_src', name: 'Source' } as any)
        .mockResolvedValueOnce({ id: 'wh_dest', name: 'Dest' } as any);
      variantRepo.findOne.mockResolvedValue({ id: 'var_id', variantSku: 'SKU1' } as any);

      // Source inventory has 10 available
      mockEntityManager.findOne
        .mockResolvedValueOnce({
          warehouseId: 'wh_src',
          variantId: 'var_id',
          quantity: 10,
          reserved: 0,
          available: 10,
        })
        // Destination inventory has 2 physical
        .mockResolvedValueOnce({
          warehouseId: 'wh_dest',
          variantId: 'var_id',
          quantity: 2,
          reserved: 0,
          available: 2,
        });

      mockEntityManager.create.mockImplementation((entityClass, data) => data);

      const result = await service.transferStock(
        { fromWarehouseId: 'wh_src', toWarehouseId: 'wh_dest', variantId: 'var_id', quantity: 4 },
        'user_id',
      );

      expect(result.success).toBe(true);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(4); // 2 inventory saves, 2 movement logs
      expect(syncQueue.addSyncJob).toHaveBeenCalledWith('var_id');
    });

    it('should throw BadRequestException if source warehouse has insufficient available stock', async () => {
      warehouseRepo.findOne
        .mockResolvedValueOnce({ id: 'wh_src', name: 'Source' } as any)
        .mockResolvedValueOnce({ id: 'wh_dest', name: 'Dest' } as any);
      variantRepo.findOne.mockResolvedValue({ id: 'var_id', variantSku: 'SKU1' } as any);

      // Source inventory only has 3 available
      mockEntityManager.findOne.mockResolvedValueOnce({
        warehouseId: 'wh_src',
        variantId: 'var_id',
        quantity: 3,
        reserved: 0,
        available: 3,
      });

      await expect(
        service.transferStock(
          { fromWarehouseId: 'wh_src', toWarehouseId: 'wh_dest', variantId: 'var_id', quantity: 5 },
          'user_id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
