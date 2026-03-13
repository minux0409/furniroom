import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { BuySlotDto } from './dto/purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // 슬롯 구매
  @Post('slots')
  buySlots(@CurrentUser() user: { userId: string }, @Body() dto: BuySlotDto) {
    return this.purchasesService.buySlots(user.userId, dto);
  }

  // 구매 내역 조회
  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.purchasesService.findAll(user.userId);
  }
}
