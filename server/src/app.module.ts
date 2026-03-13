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
import { PurchasesModule } from './modules/purchases/purchases.module';
import { UploadModule } from './modules/upload/upload.module';

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
    PurchasesModule,
    UploadModule,
  ],
})
export class AppModule {}
