import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../../database/entities/role.entity';
import { PermissionEntity } from '../../database/entities/permission.entity';
import { RolePermissionEntity } from '../../database/entities/role-permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,

    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,

    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionEntity>,
  ) {}

  async findAll(): Promise<RoleEntity[]> {
    return this.roleRepo.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<RoleEntity> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    const existing = await this.roleRepo.findOne({
      where: { name: dto.name.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    const role = this.roleRepo.create({
      name: dto.name.toLowerCase(),
      description: dto.description,
    });
    return this.roleRepo.save(role);
  }

  async findAllPermissions(): Promise<PermissionEntity[]> {
    return this.permissionRepo.find({
      order: { key: 'ASC' },
    });
  }

  async findRolePermissionIds(roleId: string): Promise<string[]> {
    await this.findOne(roleId); // Throws NotFoundException if role doesn't exist
    const mappings = await this.rolePermissionRepo.find({
      where: { roleId },
    });
    return mappings.map((m) => m.permissionId);
  }

  async assignPermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.findOne(roleId);

    // Verify all permission IDs exist
    if (permissionIds.length > 0) {
      const dbPermissions = await this.permissionRepo.createQueryBuilder('p')
        .where('p.id IN (:...ids)', { ids: permissionIds })
        .getMany();

      if (dbPermissions.length !== permissionIds.length) {
        throw new NotFoundException('One or more permission IDs are invalid');
      }
    }

    // Wrap in a simple transaction
    await this.rolePermissionRepo.manager.transaction(async (manager) => {
      // Clear existing assignments
      await manager.delete(RolePermissionEntity, { roleId });

      // Create new assignments
      if (permissionIds.length > 0) {
        const mappings = permissionIds.map((permId) =>
          manager.create(RolePermissionEntity, {
            roleId,
            permissionId: permId,
          }),
        );
        await manager.save(RolePermissionEntity, mappings);
      }
    });
  }
}
