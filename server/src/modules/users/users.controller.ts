import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/v1/users/me
  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.getMe(user.id);
  }

  // PATCH /api/v1/users/me
  @Patch('me')
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  // GET /api/v1/users/me/slots
  @Get('me/slots')
  getMySlots(@CurrentUser() user: { id: string }) {
    return this.usersService.getMySlots(user.id);
  }

  // DELETE /api/v1/users/me
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  deleteMe(@CurrentUser() user: { id: string }) {
    return this.usersService.deleteMe(user.id);
  }
}
