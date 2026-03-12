import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { APP_CONFIG } from '../../config/app.config';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get('GOOGLE_CLIENT_ID'));
  }

  // ============================================================
  // Google 로그인
  // 모바일 앱에서 Google Sign-In SDK로 받은 idToken을 검증
  // ============================================================
  async googleLogin(idToken: string) {
    const ticket = await this.googleClient
      .verifyIdToken({
        idToken,
        audience: this.config.get('GOOGLE_CLIENT_ID'),
      })
      .catch(() => {
        throw new UnauthorizedException('유효하지 않은 Google 토큰입니다');
      });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      throw new UnauthorizedException(
        'Google 사용자 정보를 가져올 수 없습니다',
      );
    }

    const user = await this.findOrCreateUser({
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
      profileImageUrl: payload.picture,
      authProvider: 'google',
      authProviderId: payload.sub,
    });

    return this.generateTokens(user);
  }

  // ============================================================
  // Apple 로그인 (추후 구현 — Apple Developer 계정 필요)
  // ============================================================
  appleLogin(_identityToken: string, _fullName?: string): Promise<never> {
    return Promise.reject(
      new BadRequestException('Apple 로그인은 곧 지원될 예정입니다'),
    );
  }

  // ============================================================
  // 토큰 갱신 (리프레시 토큰 → 새 액세스 토큰)
  // ============================================================
  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user);
  }

  // ============================================================
  // 로그아웃 (리프레시 토큰 무효화)
  // ============================================================
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  // ============================================================
  // 내부 메서드
  // ============================================================
  private async findOrCreateUser(data: {
    email: string;
    name: string;
    profileImageUrl?: string;
    authProvider: 'google' | 'apple';
    authProviderId: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: {
        authProvider_authProviderId: {
          authProvider: data.authProvider,
          authProviderId: data.authProviderId,
        },
      },
    });

    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        profileImageUrl: data.profileImageUrl,
        authProvider: data.authProvider,
        authProviderId: data.authProviderId,
        subscription: { create: {} },
      },
    });
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_SECRET'),
        expiresIn: APP_CONFIG.JWT_ACCESS_EXPIRES_IN,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: APP_CONFIG.JWT_REFRESH_EXPIRES_IN,
      }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
      },
    };
  }
}
