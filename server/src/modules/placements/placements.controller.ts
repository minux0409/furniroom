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
import { PlacementsService } from './placements.service';
import {
  CreatePlacementDto,
  UpdatePlacementDto,
  BulkUpdatePlacementsDto,
} from './dto/placement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// 집 하위 리소스: /api/v1/houses/:houseId/placements
@Controller('houses/:houseId/placements')
@UseGuards(JwtAuthGuard)
export class PlacementsController {
  constructor(private readonly placementsService: PlacementsService) {}

  // GET /api/v1/houses/:houseId/placements
  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Param('houseId') houseId: string,
  ) {
    return this.placementsService.findAll(user.id, houseId);
  }

  // POST /api/v1/houses/:houseId/placements
  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Param('houseId') houseId: string,
    @Body() dto: CreatePlacementDto,
  ) {
    return this.placementsService.create(user.id, houseId, dto);
  }

  // PATCH /api/v1/houses/:houseId/placements/bulk
  // 3D 에디터 저장 버튼 — 모든 가구 위치 일괄 저장
  @Patch('bulk')
  @HttpCode(HttpStatus.OK)
  bulkUpdate(
    @CurrentUser() user: { id: string },
    @Param('houseId') houseId: string,
    @Body() dto: BulkUpdatePlacementsDto,
  ) {
    return this.placementsService.bulkUpdate(user.id, houseId, dto);
  }

  // PATCH /api/v1/houses/:houseId/placements/:id
  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('houseId') houseId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlacementDto,
  ) {
    return this.placementsService.update(user.id, houseId, id, dto);
  }

  // DELETE /api/v1/houses/:houseId/placements/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: { id: string },
    @Param('houseId') houseId: string,
    @Param('id') id: string,
  ) {
    return this.placementsService.remove(user.id, houseId, id);
  }
}
