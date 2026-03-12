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
import { HousesService } from './houses.service';
import { CreateHouseDto, UpdateHouseDto } from './dto/house.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('houses')
@UseGuards(JwtAuthGuard)
export class HousesController {
  constructor(private readonly housesService: HousesService) {}

  // GET /api/v1/houses
  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.housesService.findAllMine(user.id);
  }

  // GET /api/v1/houses/:id
  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.housesService.findOne(user.id, id);
  }

  // POST /api/v1/houses
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateHouseDto) {
    return this.housesService.create(user.id, dto);
  }

  // PATCH /api/v1/houses/:id
  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateHouseDto,
  ) {
    return this.housesService.update(user.id, id, dto);
  }

  // DELETE /api/v1/houses/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.housesService.remove(user.id, id);
  }
}
