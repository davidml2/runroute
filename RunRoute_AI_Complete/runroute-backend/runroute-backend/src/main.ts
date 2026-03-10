import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const isProduction = configService.get('app.nodeEnv') === 'production';

  // ── 보안 미들웨어 ──────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: isProduction ? ['https://runroute.app'] : '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  // ── 글로벌 Validation Pipe ────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // DTO에 없는 속성 제거
      forbidNonWhitelisted: true, // 허용되지 않는 속성 에러
      transform: true,            // 자동 타입 변환
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger API 문서 ──────────────────────────────────────
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('RunRoute AI API')
      .setDescription('AI 기반 러닝 루트 추천 앱 백엔드 API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', '인증 / 회원가입')
      .addTag('Routes', '루트 추천 및 관리')
      .addTag('Users', '사용자 프로필 및 기록')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.log(`🚀 RunRoute API 서버 시작: http://localhost:${port}`);
  console.log(`🌍 환경: ${configService.get('app.nodeEnv')}`);
}

bootstrap();
