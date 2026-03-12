import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { APP_CONFIG } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // API 프리픽스 (ex: /api/v1/...)
  app.setGlobalPrefix(APP_CONFIG.API_PREFIX);

  // DTO 유효성 검사 자동
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 필드 자동 제거
      forbidNonWhitelisted: true, // 없는 필드 있으면 에러
      transform: true, // 타입 자동 변환
    }),
  );

  // CORS (React Native 앱 + 웹 마애 요청 허용)
  app.enableCors({
    origin: '*', // 프로덕션에서는 실제 도메인으로 변경
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(APP_CONFIG.PORT);
  console.log(
    `🚀 Furniroom API running on http://localhost:${APP_CONFIG.PORT}/${APP_CONFIG.API_PREFIX}`,
  );
}
bootstrap();
