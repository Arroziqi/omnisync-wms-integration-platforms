import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserEntity } from '../../database/entities/user.entity';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_USER_EMAIL = 'admin@omnisync.io';

const mockUser: Partial<UserEntity> = {
  id: MOCK_USER_ID,
  email: MOCK_USER_EMAIL,
  name: 'Admin User',
  passwordHash: '',        // set in beforeAll after bcrypt.hash
  roleId: 'role-uuid-1',
  isActive: true,
  lastLoginAt: undefined,
};

const mockUserRepository = {
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockRefreshTokenRepository = {
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  const plainPassword = 'Secret123!';

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash(plainPassword, 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: mockRefreshTokenRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns access_token and refresh_token on valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockRefreshTokenRepository.save.mockResolvedValue(undefined);

      const result = await service.login(MOCK_USER_EMAIL, plainPassword);

      expect(result).toHaveProperty('access_token', 'mock.jwt.token');
      expect(result).toHaveProperty('refresh_token');
      expect(typeof result.refresh_token).toBe('string');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login('unknown@example.com', plainPassword),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.login(MOCK_USER_EMAIL, 'WrongPassword!'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── getMe ──────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('returns user without passwordHash', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.getMe(MOCK_USER_ID);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getMe('non-existent-id')).rejects.toThrow();
    });
  });

  // ─── refreshToken ────────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('throws UnauthorizedException for invalid token', async () => {
      mockRefreshTokenRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
