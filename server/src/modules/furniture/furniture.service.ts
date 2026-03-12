import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFurnitureDto, UpdateFurnitureDto } from './dto/furniture.dto';
import { APP_CONFIG } from '../../config/app.config';

@Injectable()
export class FurnitureService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 내 가구 목록 조회
  // ============================================================
  async findAllMine(userId: string) {
    return this.prisma.furniture.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { tags: true },
    });
  }

  // ============================================================
  // 가구 단건 조회 (본인 소유만)
  // ============================================================
  async findOne(userId: string, furnitureId: string) {
    const furniture = await this.prisma.furniture.findUnique({
      where: { id: furnitureId },
      include: { tags: true },
    });
    if (!furniture) throw new NotFoundException('가구를 찾을 수 없습니다');
    if (furniture.ownerId !== userId) throw new ForbiddenException();
    return furniture;
  }

  // ============================================================
  // 가구 생성 (슬롯 초과 시 거부)
  // ============================================================
  async create(userId: string, dto: CreateFurnitureDto) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    const maxFurniture =
      APP_CONFIG.FREE_FURNITURE_LIMIT +
      (subscription?.extraFurnitureSlots ?? 0);
    const currentCount = await this.prisma.furniture.count({
      where: { ownerId: userId },
    });

    if (currentCount >= maxFurniture) {
      throw new ForbiddenException(
        `가구는 최대 ${maxFurniture}개까지 등록할 수 있습니다. 슬롯을 구매해 주세요.`,
      );
    }

    return this.prisma.furniture.create({
      data: {
        ownerId: userId,
        name: dto.name,
        widthCm: dto.widthCm,
        depthCm: dto.depthCm,
        heightCm: dto.heightCm,
        shapeType: dto.shapeType ?? 'box',
        imageUrl: dto.imageUrl,
        modelUrl: dto.modelUrl,
        isPublic: dto.isPublic ?? false,
        tags: dto.tags?.length
          ? { create: dto.tags.map((tag) => ({ tag })) }
          : undefined,
      },
      include: { tags: true },
    });
  }

  // ============================================================
  // 가구 수정
  // ============================================================
  async update(userId: string, furnitureId: string, dto: UpdateFurnitureDto) {
    await this.findOne(userId, furnitureId); // 소유권 확인

    return this.prisma.furniture.update({
      where: { id: furnitureId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.widthCm !== undefined && { widthCm: dto.widthCm }),
        ...(dto.depthCm !== undefined && { depthCm: dto.depthCm }),
        ...(dto.heightCm !== undefined && { heightCm: dto.heightCm }),
        ...(dto.shapeType !== undefined && { shapeType: dto.shapeType }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.modelUrl !== undefined && { modelUrl: dto.modelUrl }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        // 태그 변경 시 기존 태그 전부 삭제 후 재생성
        ...(dto.tags !== undefined && {
          tags: {
            deleteMany: {},
            create: dto.tags.map((tag) => ({ tag })),
          },
        }),
      },
      include: { tags: true },
    });
  }

  // ============================================================
  // 가구 삭제
  // ============================================================
  async remove(userId: string, furnitureId: string) {
    await this.findOne(userId, furnitureId); // 소유권 확인
    await this.prisma.furniture.delete({ where: { id: furnitureId } });
    return { message: '가구가 삭제됐습니다' };
  }

  // ============================================================
  // 커뮤니티 가구 복사 (copy-on-import)
  // 공개된 타인의 가구를 내 목록으로 복사
  // ============================================================
  async importFromCommunity(userId: string, sourceFurnitureId: string) {
    const source = await this.prisma.furniture.findUnique({
      where: { id: sourceFurnitureId },
      include: { tags: true },
    });
    if (!source) throw new NotFoundException('가구를 찾을 수 없습니다');
    if (!source.isPublic)
      throw new ForbiddenException('공개된 가구가 아닙니다');

    // 슬롯 확인
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    const maxFurniture =
      APP_CONFIG.FREE_FURNITURE_LIMIT +
      (subscription?.extraFurnitureSlots ?? 0);
    const currentCount = await this.prisma.furniture.count({
      where: { ownerId: userId },
    });
    if (currentCount >= maxFurniture) {
      throw new ForbiddenException(
        `가구 슬롯이 부족합니다. 슬롯을 구매해 주세요.`,
      );
    }

    return this.prisma.furniture.create({
      data: {
        ownerId: userId,
        name: source.name,
        widthCm: source.widthCm,
        depthCm: source.depthCm,
        heightCm: source.heightCm,
        shapeType: source.shapeType,
        imageUrl: source.imageUrl,
        modelUrl: source.modelUrl,
        isPublic: false, // 복사한 가구는 기본 비공개
        originalFurnitureId: source.id,
        tags: source.tags.length
          ? { create: source.tags.map((t) => ({ tag: t.tag })) }
          : undefined,
      },
      include: { tags: true },
    });
  }
}
