import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../database/entities/user.entity';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { PermissionEntity } from '../../database/entities/permission.entity';
import { RolePermissionEntity } from '../../database/entities/role-permission.entity';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,

    private readonly jwtService: JwtService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.userRepo.findOne({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const accessToken = this.issueAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  async refreshToken(token: string): Promise<{ access_token: string }> {
    // Find all non-revoked tokens for the user and validate
    const tokenRecord = await this.findValidRefreshToken(token);

    const user = await this.userRepo.findOne({
      where: { id: tokenRecord.userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const accessToken = this.issueAccessToken(user);
    return { access_token: accessToken };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  async logout(userId: string, token: string): Promise<void> {
    const tokenRecord = await this.findValidRefreshToken(token, userId);
    await this.refreshTokenRepo.update(tokenRecord.id, { isRevoked: true });
  }

  // ─── Get Current User ─────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<Omit<UserEntity, 'passwordHash'> & { permissions: string[] }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let permissions: string[] = [];
    if (user.role) {
      if (user.role.name.toLowerCase() === 'admin') {
        const allPermissions = await this.refreshTokenRepo.manager.find(PermissionEntity);
        permissions = allPermissions.map((p) => p.key);
      } else {
        const rolePermissions = await this.refreshTokenRepo.manager.find(RolePermissionEntity, {
          where: { roleId: user.role.id },
          relations: { permission: true },
        });
        permissions = rolePermissions
          .filter((rp) => rp.permission)
          .map((rp) => rp.permission.key);
      }
    }

    // Strip password hash before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return {
      ...(safeUser as Omit<UserEntity, 'passwordHash'>),
      permissions,
    };
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────────

  private issueAccessToken(user: UserEntity): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId ?? null,
    };
    return this.jwtService.sign(payload);
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = this.generateSecureToken();
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.refreshTokenRepo.save({
      userId,
      tokenHash,
      expiresAt,
      isRevoked: false,
    });

    return rawToken;
  }

  /**
   * Finds a non-revoked, non-expired refresh token record and validates the
   * raw token against the stored hash.
   */
  private async findValidRefreshToken(
    rawToken: string,
    userId?: string,
  ): Promise<RefreshTokenEntity> {
    const query = this.refreshTokenRepo
      .createQueryBuilder('rt')
      .where('rt.is_revoked = false')
      .andWhere('rt.expires_at > :now', { now: new Date() });

    if (userId) {
      query.andWhere('rt.user_id = :userId', { userId });
    }

    const candidates = await query.getMany();

    for (const record of candidates) {
      const matches = await bcrypt.compare(rawToken, record.tokenHash);
      if (matches) return record;
    }

    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  private generateSecureToken(): string {
    const array = new Uint8Array(48);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64url');
  }
}
