import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityQueryDto } from './dto/community-query.dto';
import { APP_CONFIG } from '../../config/app.config';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  // 공개 집 목록
  async getPublicHouses(query: CommunityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isPublic: true };
    if (query.search) {
      where['name'] = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy =
      query.sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.house.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          thumbnailUrl: true,
          createdAt: true,
          user: { select: { id: true, name: true, profileImageUrl: true } },
        },
      }),
      this.prisma.house.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // 공개 집 단건 조회
  async getPublicHouseById(id: string) {
    const house = await this.prisma.house.findFirst({
      where: { id, isPublic: true },
      include: {
        user: { select: { id: true, name: true, profileImageUrl: true } },
        placements: {
          include: {
            furniture: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                modelUrl: true,
                shapeType: true,
              },
            },
          },
        },
      },
    });

    if (!house) throw new NotFoundException('공개된 집을 찾을 수 없습니다.');
    return house;
  }

  // 집 복사 (copy-on-import)
  async importHouse(houseId: string, userId: string) {
    const source = await this.prisma.house.findFirst({
      where: { id: houseId, isPublic: true },
      include: { placements: true },
    });

    if (!source) throw new NotFoundException('공개된 집을 찾을 수 없습니다.');

    // 슬롯 체크
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    const houseCount = await this.prisma.house.count({ where: { userId } });
    const maxHouses =
      APP_CONFIG.FREE_HOUSE_LIMIT + (subscription?.extraHouseSlots ?? 0);
    if (houseCount >= maxHouses) {
      throw new ForbiddenException(
        `집은 최대 ${maxHouses}개까지 등록할 수 있습니다. 슬롯을 구매해 주세요.`,
      );
    }

    // 집 복사 (placements 포함)
    const copied = await this.prisma.house.create({
      data: {
        userId,
        name: `${source.name} (복사)`,
        blueprintData: source.blueprintData ?? undefined,
        thumbnailUrl: source.thumbnailUrl,
        isPublic: false,
        originalHouseId: source.id,
        placements: {
          create: source.placements.map((p) => ({
            furnitureId: p.furnitureId,
            posX: p.posX,
            posY: p.posY,
            posZ: p.posZ,
            rotY: p.rotY,
          })),
        },
      },
    });

    return copied;
  }

  // 공개 가구 목록
  async getPublicFurniture(query: CommunityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isPublic: true };
    if (query.search) {
      where['name'] = { contains: query.search, mode: 'insensitive' };
    }
    if (query.tag) {
      where['tags'] = { some: { tag: query.tag } };
    }

    const orderBy =
      query.sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.furniture.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          shapeType: true,
          createdAt: true,
          tags: { select: { tag: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
      this.prisma.furniture.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
