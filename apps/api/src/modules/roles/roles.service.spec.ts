import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RoleEntity } from '../../database/entities/role.entity';
import { PermissionEntity } from '../../database/entities/permission.entity';
import { RolePermissionEntity } from '../../database/entities/role-permission.entity';

describe('RolesService', () => {
  let service: RolesService;

  const mockRoleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPermissionRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockRolePermissionRepo = {
    find: jest.fn(),
    manager: {
      transaction: jest.fn((cb) => cb(mockRolePermissionRepo.manager)),
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(RoleEntity), useValue: mockRoleRepo },
        { provide: getRepositoryToken(PermissionEntity), useValue: mockPermissionRepo },
        { provide: getRepositoryToken(RolePermissionEntity), useValue: mockRolePermissionRepo },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return sorted roles', async () => {
      const mockRoles = [{ name: 'admin' }, { name: 'viewer' }];
      mockRoleRepo.find.mockResolvedValue(mockRoles);

      const result = await service.findAll();
      expect(result).toEqual(mockRoles);
      expect(mockRoleRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });
  });
});
