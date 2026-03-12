import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { APP_CONFIG } from '../../config/app.config';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 내 정보 조회
  // ============================================================
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        authProvider: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');
    return user;
  }

  // ============================================================
  // 내 정보 수정 (이름, 프로필 이미지)
  // ============================================================
  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.profileImageUrl !== undefined && {
          profileImageUrl: dto.profileImageUrl,
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        updatedAt: true,
      },
    });
  }

  // ============================================================
  // 슬롯 현황 조회
  // 집/가구 사용량 + 구매한 추가 슬롯 + 최대 허용치
  // ============================================================
  async getMySlots(userId: string) {
    const [houseCount, furnitureCount, subscription] = await Promise.all([
      this.prisma.house.count({ where: { userId } }),
      this.prisma.furniture.count({ where: { ownerId: userId } }),
      this.prisma.userSubscription.findUnique({ where: { userId } }),
    ]);

    const extraHouseSlots = subscription?.extraHouseSlots ?? 0;
    const extraFurnitureSlots = subscription?.extraFurnitureSlots ?? 0;

    return {
      house: {
        used: houseCount,
        max: APP_CONFIG.FREE_HOUSE_LIMIT + extraHouseSlots,
        freeLimit: APP_CONFIG.FREE_HOUSE_LIMIT,
        extraSlots: extraHouseSlots,
      },
      furniture: {
        used: furnitureCount,
        max: APP_CONFIG.FREE_FURNITURE_LIMIT + extraFurnitureSlots,
        freeLimit: APP_CONFIG.FREE_FURNITURE_LIMIT,
        extraSlots: extraFurnitureSlots,
      },
    };
  }

  // ============================================================
  // 회원 탈퇴 (soft delete — ACCOUNT_DELETION_GRACE_DAYS일 후 실제 삭제)
  // ============================================================
  async deleteMe(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), refreshToken: null },
    });
    return {
      message: `계정이 탈퇴 처리됐습니다. ${APP_CONFIG.ACCOUNT_DELETION_GRACE_DAYS}일 이내 재로그인 시 복구됩니다.`,
    };
  }
}
