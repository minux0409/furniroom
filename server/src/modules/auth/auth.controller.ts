import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto, AppleLoginDto } from './dto/social-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/google
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.idToken);
  }

  // POST /api/v1/auth/apple
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  appleLogin(@Body() dto: AppleLoginDto) {
    return this.authService.appleLogin(dto.identityToken, dto.fullName);
  }

  // POST /api/v1/auth/refresh
  // Authorization: Bearer <refreshToken>
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: { id: string }) {
    return this.authService.refresh(user.id);
  }

  // POST /api/v1/auth/logout
  // Authorization: Bearer <accessToken>
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: { id: string }) {
    return this.authService.logout(user.id);
  }
}
