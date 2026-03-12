import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHouseDto, UpdateHouseDto } from './dto/house.dto';
import { APP_CONFIG } from '../../config/app.config';

@Injectable()
export class HousesService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 내 집 목록 조회
  // ============================================================
  async findAllMine(userId: string) {
    return this.prisma.house.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ============================================================
  // 집 단건 조회 (본인만 가능)
  // ============================================================
  async findOne(userId: string, houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) throw new NotFoundException('집을 찾을 수 없습니다');
    if (house.userId !== userId) throw new ForbiddenException();
    return house;
  }

  // ============================================================
  // 집 생성 (슬롯 초과 시 거부)
  // ============================================================
  async create(userId: string, dto: CreateHouseDto) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    const maxHouses =
      APP_CONFIG.FREE_HOUSE_LIMIT + (subscription?.extraHouseSlots ?? 0);
    const currentCount = await this.prisma.house.count({ where: { userId } });

    if (currentCount >= maxHouses) {
      throw new ForbiddenException(
        `집은 최대 ${maxHouses}개까지 등록할 수 있습니다. 슬롯을 구매해 주세요.`,
      );
    }

    return this.prisma.house.create({
      data: {
        userId,
        name: dto.name,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  // ============================================================
  // 집 수정 (이름, 공개 여부, 설계도 데이터, 썸네일)
  // ============================================================
  async update(userId: string, houseId: string, dto: UpdateHouseDto) {
    await this.findOne(userId, houseId); // 소유권 확인

    return this.prisma.house.update({
      where: { id: houseId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.blueprintData !== undefined && {
          blueprintData: dto.blueprintData,
        }),
        ...(dto.thumbnailUrl !== undefined && {
          thumbnailUrl: dto.thumbnailUrl,
        }),
      },
    });
  }

  // ============================================================
  // 집 삭제
  // ============================================================
  async remove(userId: string, houseId: string) {
    await this.findOne(userId, houseId); // 소유권 확인
    await this.prisma.house.delete({ where: { id: houseId } });
    return { message: '집이 삭제됐습니다' };
  }
}
