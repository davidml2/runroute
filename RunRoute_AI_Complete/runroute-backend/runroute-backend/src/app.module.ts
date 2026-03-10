import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { RoutesModule } from './routes/routes.module';
import { UsersModule } from './users/users.module';
import {
  appConfig, dbConfig, jwtConfig, googleConfig,
  openaiConfig, aiServiceConfig, osrmConfig, redisConfig,
} from './config/configuration';
import { User } from './users/entities/user.entity';
import { Route } from './routes/entities/route.entity';
import { RunningRecord } from './routes/entities/running-record.entity';
import { RouteRating } from './routes/entities/route-rating.entity';
import { SavedRoute } from './routes/entities/saved-route.entity';
import { NavigationSession } from './routes/entities/navigation-session.entity';

@Module({
  imports: [
    // ── 설정 ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, jwtConfig, googleConfig, openaiConfig, aiServiceConfig, osrmConfig, redisConfig],
    }),

    // ── 데이터베이스 ───────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('db.host'),
        port: config.get('db.port'),
        username: config.get('db.username'),
        password: config.get('db.password'),
        database: config.get('db.database'),
        entities: [User, Route, RunningRecord, RouteRating, SavedRoute, NavigationSession],
        synchronize: config.get('app.nodeEnv') === 'development', // 개발환경에서만 자동 동기화
        logging: config.get('app.nodeEnv') === 'development',
        ssl: config.get('app.nodeEnv') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // ── 캐시 (Redis) ──────────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: 'redis',
        host: config.get('redis.host'),
        port: config.get('redis.port'),
        password: config.get('redis.password'),
        ttl: 3600,
      }),
    }),

    // ── 레이트 리미팅 ─────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },     // 1초당 10개
      { name: 'medium', ttl: 60000, limit: 100 },   // 1분당 100개
    ]),

    // ── 도메인 모듈 ───────────────────────────────────────────
    AuthModule,
    RoutesModule,
    UsersModule,
  ],
  providers: [
    // JWT 인증을 전역 가드로 등록
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
