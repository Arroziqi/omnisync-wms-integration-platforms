import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Throttle } from '../security/decorators/skip-throttle.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    roleId: string | null;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Returns access_token + refresh_token on valid credentials.
   */
  /**
   * Stricter throttle: 5 requests per 60 s per IP.
   * Prevents brute-force and credential-stuffing attacks.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Audit('user.login')
  @UseInterceptors(AuditInterceptor)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * POST /api/v1/auth/refresh-token
   * Exchanges a valid refresh token for a new access token.
   */
  /** Stricter throttle: 10 requests per 60 s per IP for token refresh. */
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  /**
   * POST /api/v1/auth/logout
   * Revokes the provided refresh token. Requires a valid access token.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit('user.logout')
  @UseInterceptors(AuditInterceptor)
  async logout(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RefreshTokenDto,
  ) {
    await this.authService.logout(req.user.userId, dto.refresh_token);
  }

  /**
   * GET /api/v1/auth/me
   * Returns the currently authenticated user's profile.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user.userId);
  }
}
