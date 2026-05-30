import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles:read')
  async findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @Permissions('roles:write')
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get('permissions')
  @Permissions('roles:read')
  async findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id/permissions')
  @Permissions('roles:read')
  async findRolePermissionIds(@Param('id') id: string) {
    return { permissionIds: await this.rolesService.findRolePermissionIds(id) };
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @Permissions('roles:write')
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    await this.rolesService.assignPermissions(id, dto.permissionIds);
    return { message: 'Permissions updated successfully' };
  }
}
