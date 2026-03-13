import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BuySlotDto, SlotType } from './dto/purchase.dto';
import { APP_CONFIG } from '../../config/app.config';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  // 슬롯 구매
  async buySlots(userId: string, dto: BuySlotDto) {
    const slotsToAdd = dto.units * APP_CONFIG.PAID_SLOT_UNIT;
    const isHouse = dto.slotType === SlotType.house;
    const pricePerUnit = isHouse
      ? APP_CONFIG.PAID_HOUSE_SLOT_PRICE_USD
      : APP_CONFIG.PAID_FURNITURE_SLOT_PRICE_USD;
    const totalAmount = dto.units * pricePerUnit;

    // 트랜잭션: 구매 기록 + 구독 슬롯 누적
    const [purchase] = await this.prisma.$transaction([
      this.prisma.purchase.create({
        data: {
          userId,
          extraHouseSlots: isHouse ? slotsToAdd : 0,
          extraFurnitureSlots: isHouse ? 0 : slotsToAdd,
          amountUsd: totalAmount,
        },
      }),
      this.prisma.userSubscription.upsert({
        where: { userId },
        create: {
          userId,
          extraHouseSlots: isHouse ? slotsToAdd : 0,
          extraFurnitureSlots: isHouse ? 0 : slotsToAdd,
        },
        update: isHouse
          ? { extraHouseSlots: { increment: slotsToAdd } }
          : { extraFurnitureSlots: { increment: slotsToAdd } },
      }),
    ]);

    return {
      purchase,
      message: `${dto.slotType === SlotType.house ? '집' : '가구'} 슬롯 ${slotsToAdd}개가 추가되었습니다.`,
    };
  }

  // 구매 내역 조회
  async findAll(userId: string) {
    return this.prisma.purchase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
