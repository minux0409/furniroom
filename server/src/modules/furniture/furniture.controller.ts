import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FurnitureService } from './furniture.service';
import { CreateFurnitureDto, UpdateFurnitureDto } from './dto/furniture.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('furniture')
@UseGuards(JwtAuthGuard)
export class FurnitureController {
  constructor(private readonly furnitureService: FurnitureService) {}

  // GET /api/v1/furniture
  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.furnitureService.findAllMine(user.id);
  }

  // GET /api/v1/furniture/:id
  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.furnitureService.findOne(user.id, id);
  }

  // POST /api/v1/furniture
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateFurnitureDto) {
    return this.furnitureService.create(user.id, dto);
  }

  // PATCH /api/v1/furniture/:id
  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateFurnitureDto,
  ) {
    return this.furnitureService.update(user.id, id, dto);
  }

  // DELETE /api/v1/furniture/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.furnitureService.remove(user.id, id);
  }

  // POST /api/v1/furniture/:id/import
  // 커뮤니티 가구를 내 목록으로 복사
  @Post(':id/import')
  importFromCommunity(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.furnitureService.importFromCommunity(user.id, id);
  }
}
