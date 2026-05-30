import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RoleEntity } from '../../../database/entities/role.entity';
import { RolePermissionEntity } from '../../../database/entities/role-permission.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roleId) {
      throw new ForbiddenException('Access denied: No role assigned');
    }

    // Fetch the role name to check for admin bypass
    const roleRecord = await this.roleRepo.findOne({
      where: { id: user.roleId },
    });

    if (!roleRecord) {
      throw new ForbiddenException('Access denied: Role not found');
    }

    if (roleRecord.name.toLowerCase() === 'admin') {
      return true;
    }

    // Fetch all permission keys assigned to this role
    const rolePermissions = await this.rolePermissionRepo.find({
      where: { roleId: user.roleId },
      relations: { permission: true },
    });

    const userPermissionKeys = rolePermissions
      .filter((rp) => rp.permission)
      .map((rp) => rp.permission.key);

    // Check if the user has ALL of the required permissions (or SOME, depending on policy. Usually ALL is safer)
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissionKeys.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Access denied: Missing required permissions [${requiredPermissions
          .filter((p) => !userPermissionKeys.includes(p))
          .join(', ')}]`,
      );
    }

    return true;
  }
}
