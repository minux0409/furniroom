import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HousesModule } from './modules/houses/houses.module';
import { FurnitureModule } from './modules/furniture/furniture.module';
import { PlacementsModule } from './modules/placements/placements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HousesModule,
    FurnitureModule,
    PlacementsModule,
    // 각 모듈은 개발하면서 여기에 연결합니다
    // CommunityModule,
    // ReportsModule,
    // PurchasesModule,
    // UploadModule,
  ],
})
export class AppModule {}
