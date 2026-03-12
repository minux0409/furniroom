import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityQueryDto } from './dto/community-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // 공개 집 목록
  @Get('houses')
  getPublicHouses(@Query() query: CommunityQueryDto) {
    return this.communityService.getPublicHouses(query);
  }

  // 공개 집 단건 조회
  @Get('houses/:id')
  getPublicHouseById(@Param('id') id: string) {
    return this.communityService.getPublicHouseById(id);
  }

  // 집 복사 (로그인 필요)
  @Post('houses/:id/import')
  @UseGuards(JwtAuthGuard)
  importHouse(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.communityService.importHouse(id, user.userId);
  }

  // 공개 가구 목록
  @Get('furniture')
  getPublicFurniture(@Query() query: CommunityQueryDto) {
    return this.communityService.getPublicFurniture(query);
  }
}
