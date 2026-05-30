import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleEntity } from '../../database/entities/role.entity';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async findAll(): Promise<Omit<UserEntity, 'passwordHash'>[]> {
    const users = await this.userRepo.find({
      relations: { role: true },
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...safeUser } = user;
      return safeUser as Omit<UserEntity, 'passwordHash'>;
    });
  }

  async findOne(id: string): Promise<Omit<UserEntity, 'passwordHash'>> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser as Omit<UserEntity, 'passwordHash'>;
  }

  async create(dto: CreateUserDto): Promise<Omit<UserEntity, 'passwordHash'>> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    if (dto.roleId) {
      const roleExists = await this.roleRepo.findOne({
        where: { id: dto.roleId },
      });
      if (!roleExists) {
        throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      roleId: dto.roleId || null,
      isActive: dto.isActive !== false,
    });

    const saved = await this.userRepo.save(user);
    // Reload user with relation
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<Omit<UserEntity, 'passwordHash'>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updates: Partial<UserEntity> = {};

    if (dto.name !== undefined) {
      updates.name = dto.name;
    }

    if (dto.email !== undefined) {
      const emailLower = dto.email.toLowerCase();
      if (emailLower !== user.email) {
        const existing = await this.userRepo.findOne({
          where: { email: emailLower },
        });
        if (existing) {
          throw new ConflictException(
            `User with email "${dto.email}" already exists`,
          );
        }
        updates.email = emailLower;
      }
    }

    if (dto.password !== undefined) {
      updates.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    if (dto.roleId !== undefined) {
      if (dto.roleId !== null) {
        const roleExists = await this.roleRepo.findOne({
          where: { id: dto.roleId },
        });
        if (!roleExists) {
          throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
        }
      }
      updates.roleId = dto.roleId;
    }

    if (dto.isActive !== undefined) {
      updates.isActive = dto.isActive;
    }

    if (Object.keys(updates).length > 0) {
      await this.userRepo.update(id, updates);
    }

    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepo.delete(id);
  }
}
