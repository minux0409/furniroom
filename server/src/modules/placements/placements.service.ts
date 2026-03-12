import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePlacementDto,
  UpdatePlacementDto,
  BulkUpdatePlacementsDto,
} from './dto/placement.dto';

@Injectable()
export class PlacementsService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 집 안의 가구 배치 목록 조회
  // ============================================================
  async findAll(userId: string, houseId: string) {
    await this.verifyHouseOwner(userId, houseId);

    return this.prisma.houseFurniturePlacement.findMany({
      where: { houseId },
      include: {
        furniture: {
          select: {
            id: true,
            name: true,
            widthCm: true,
            depthCm: true,
            heightCm: true,
            shapeType: true,
            imageUrl: true,
            modelUrl: true,
          },
        },
      },
    });
  }

  // ============================================================
  // 가구 배치 추가
  // ============================================================
  async create(userId: string, houseId: string, dto: CreatePlacementDto) {
    await this.verifyHouseOwner(userId, houseId);

    // 가구 존재 확인
    const furniture = await this.prisma.furniture.findUnique({
      where: { id: dto.furnitureId },
    });
    if (!furniture) throw new NotFoundException('가구를 찾을 수 없습니다');

    return this.prisma.houseFurniturePlacement.create({
      data: {
        houseId,
        furnitureId: dto.furnitureId,
        posX: dto.posX ?? 0,
        posY: dto.posY ?? 0,
        posZ: dto.posZ ?? 0,
        rotY: dto.rotY ?? 0,
      },
    });
  }

  // ============================================================
  // 가구 위치/회전 수정
  // ============================================================
  async update(
    userId: string,
    houseId: string,
    placementId: string,
    dto: UpdatePlacementDto,
  ) {
    await this.verifyHouseOwner(userId, houseId);

    const placement = await this.prisma.houseFurniturePlacement.findUnique({
      where: { id: placementId },
    });
    if (!placement) throw new NotFoundException('배치 정보를 찾을 수 없습니다');
    if (placement.houseId !== houseId) throw new ForbiddenException();

    return this.prisma.houseFurniturePlacement.update({
      where: { id: placementId },
      data: {
        ...(dto.posX !== undefined && { posX: dto.posX }),
        ...(dto.posY !== undefined && { posY: dto.posY }),
        ...(dto.posZ !== undefined && { posZ: dto.posZ }),
        ...(dto.rotY !== undefined && { rotY: dto.rotY }),
      },
    });
  }

  // ============================================================
  // 여러 가구 위치 일괄 저장 (3D 에디터 저장 버튼)
  // ============================================================
  async bulkUpdate(
    userId: string,
    houseId: string,
    dto: BulkUpdatePlacementsDto,
  ) {
    await this.verifyHouseOwner(userId, houseId);

    await Promise.all(
      dto.placements.map((p) =>
        this.prisma.houseFurniturePlacement.update({
          where: { id: p.id },
          data: { posX: p.posX, posY: p.posY, posZ: p.posZ, rotY: p.rotY },
        }),
      ),
    );

    return { message: `${dto.placements.length}개 배치가 저장됐습니다` };
  }

  // ============================================================
  // 가구 배치 삭제 (집에서 가구 제거)
  // ============================================================
  async remove(userId: string, houseId: string, placementId: string) {
    await this.verifyHouseOwner(userId, houseId);

    const placement = await this.prisma.houseFurniturePlacement.findUnique({
      where: { id: placementId },
    });
    if (!placement) throw new NotFoundException('배치 정보를 찾을 수 없습니다');
    if (placement.houseId !== houseId) throw new ForbiddenException();

    await this.prisma.houseFurniturePlacement.delete({
      where: { id: placementId },
    });
    return { message: '가구 배치가 제거됐습니다' };
  }

  // ============================================================
  // 내부 유틸 — 집 소유권 검증
  // ============================================================
  private async verifyHouseOwner(userId: string, houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) throw new NotFoundException('집을 찾을 수 없습니다');
    if (house.userId !== userId) throw new ForbiddenException();
  }
}
