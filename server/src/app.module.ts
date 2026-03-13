import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HousesModule } from './modules/houses/houses.module';
import { FurnitureModule } from './modules/furniture/furniture.module';
import { PlacementsModule } from './modules/placements/placements.module';
import { CommunityModule } from './modules/community/community.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HousesModule,
    FurnitureModule,
    PlacementsModule,
    CommunityModule,
    ReportsModule,
    // 각 모듈은 개발하면서 여기에 연결합니다
    // PurchasesModule,
    // UploadModule,
  ],
})
export class AppModule {}
