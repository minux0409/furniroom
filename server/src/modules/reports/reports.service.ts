import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    // 신고 대상 존재 여부 확인
    if (dto.targetType === 'furniture') {
      const exists = await this.prisma.furniture.findUnique({
        where: { id: dto.targetId },
      });
      if (!exists) throw new NotFoundException('가구를 찾을 수 없습니다.');
    } else {
      const exists = await this.prisma.house.findUnique({
        where: { id: dto.targetId },
      });
      if (!exists) throw new NotFoundException('집을 찾을 수 없습니다.');
    }

    // 중복 신고 방지 (같은 유저가 같은 대상을 이미 신고한 경우)
    const existing = await this.prisma.report.findFirst({
      where: { reporterId, targetType: dto.targetType, targetId: dto.targetId },
    });
    if (existing) throw new ConflictException('이미 신고한 항목입니다.');

    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
      },
    });
  }
}
