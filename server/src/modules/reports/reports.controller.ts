import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(user.userId, dto);
  }
}
