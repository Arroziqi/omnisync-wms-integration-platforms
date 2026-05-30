import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleEntity } from '../../../database/entities/role.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roleId) {
      throw new ForbiddenException('Access denied: No role assigned');
    }

    // Fetch the role name from database
    const roleRecord = await this.roleRepo.findOne({
      where: { id: user.roleId },
    });

    if (!roleRecord) {
      throw new ForbiddenException('Access denied: Role not found');
    }

    // Admins bypass all role restrictions
    if (roleRecord.name.toLowerCase() === 'admin') {
      return true;
    }

    const hasRole = requiredRoles.some(
      (role) => role.toLowerCase() === roleRecord.name.toLowerCase(),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required role is one of [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
