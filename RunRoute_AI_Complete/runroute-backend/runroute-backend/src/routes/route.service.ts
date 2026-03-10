import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { Route } from './entities/route.entity';
import { RunningRecord } from './entities/running-record.entity';
import { RouteRating } from './entities/route-rating.entity';
import { SavedRoute } from './entities/saved-route.entity';
import { NavigationSession, SessionStatus } from './entities/navigation-session.entity';
import { RecommendRouteDto, CompleteRunDto, RateRouteDto, NearbyRoutesDto } from './dto/route.dto';
import { User } from '../users/entities/user.entity';
import { encodeGeohash } from '../common/utils/geohash.util';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(RunningRecord) private readonly recordRepo: Repository<RunningRecord>,
    @InjectRepository(RouteRating) private readonly ratingRepo: Repository<RouteRating>,
    @InjectRepository(SavedRoute) private readonly savedRepo: Repository<SavedRoute>,
    @InjectRepository(NavigationSession) private readonly sessionRepo: Repository<NavigationSession>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ── 루트 추천 (핵심 기능) ──────────────────────────────────────
  async recommendRoutes(dto: RecommendRouteDto, user: User) {
    const geohash = encodeGeohash(dto.lat, dto.lng, 6);
    const cacheKey = `route:recommend:${geohash}:${dto.distanceKm}:${(dto.preferences || []).sort().join(',')}`;

    // 1. 캐시 확인
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // 2. Free 플랜 일일 한도 체크 (3회)
    if (user.plan === 'free') {
      await this.checkDailyLimit(user.id);
    }

    // 3. AI 서비스로 자연어 파싱 (자연어 입력이 있는 경우)
    let parsedParams = dto;
    if (dto.naturalQuery) {
      parsedParams = await this.parseNaturalQuery(dto);
    }

    // 4. OSRM으로 후보 루트 생성
    const candidateRoutes = await this.generateCandidateRoutes(parsedParams);

    // 5. AI 스코어링
    const scoredRoutes = await this.scoreRoutes(candidateRoutes, parsedParams, user);

    // 6. Top 3 선택 및 저장
    const topRoutes = scoredRoutes.slice(0, 3);
    const savedRoutes = await Promise.all(
      topRoutes.map((r) => this.saveRouteToDb(r, user.id, geohash)),
    );

    const result = {
      routes: savedRoutes,
      metadata: {
        location: { lat: dto.lat, lng: dto.lng },
        requestedDistanceKm: dto.distanceKm,
        generatedAt: new Date().toISOString(),
      },
    };

    // 7. 캐시 저장 (24시간)
    await this.cacheManager.set(cacheKey, result, 86400 * 1000);

    return result;
  }

  // ── 루트 단건 조회 ─────────────────────────────────────────────
  async getRouteById(routeId: string): Promise<Route> {
    const route = await this.routeRepo.findOne({
      where: { id: routeId },
      relations: ['ratings'],
    });
    if (!route) throw new NotFoundException('루트를 찾을 수 없습니다.');
    return route;
  }

  // ── 러닝 세션 시작 ─────────────────────────────────────────────
  async startNavigation(routeId: string, user: User, deviceType: string) {
    const route = await this.getRouteById(routeId);

    // 기존 활성 세션 종료
    await this.sessionRepo.update(
      { userId: user.id, status: SessionStatus.ACTIVE },
      { status: SessionStatus.CANCELLED },
    );

    const session = this.sessionRepo.create({
      userId: user.id,
      routeId: route.id,
      deviceType,
      status: SessionStatus.ACTIVE,
    });
    await this.sessionRepo.save(session);

    // 루트 사용 횟수 증가
    await this.routeRepo.increment({ id: routeId }, 'usageCount', 1);

    return {
      sessionId: session.id,
      route,
      navigationData: this.buildNavigationData(route),
    };
  }

  // ── 러닝 완료 ──────────────────────────────────────────────────
  async completeRun(sessionId: string, dto: CompleteRunDto, user: User) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId: user.id, status: SessionStatus.ACTIVE },
    });
    if (!session) throw new NotFoundException('진행 중인 세션을 찾을 수 없습니다.');

    // 세션 완료 처리
    await this.sessionRepo.update(sessionId, {
      status: SessionStatus.COMPLETED,
      completedAt: new Date(),
      progressKm: dto.actualDistanceKm,
    });

    // 러닝 기록 생성
    const record = this.recordRepo.create({
      userId: user.id,
      routeId: session.routeId,
      startedAt: session.createdAt,
      completedAt: new Date(),
      actualDistanceKm: dto.actualDistanceKm,
      durationSeconds: dto.durationSeconds,
      avgPaceSecPerKm: dto.avgPaceSecPerKm,
      avgHeartRate: dto.avgHeartRate,
      maxHeartRate: dto.maxHeartRate,
      calories: dto.calories,
      deviceType: session.deviceType,
      splits: dto.splits,
    });
    await this.recordRepo.save(record);

    // 사용자 통계 업데이트
    await this.updateUserStats(user.id, dto.actualDistanceKm);

    return {
      recordId: record.id,
      stats: {
        distanceKm: dto.actualDistanceKm,
        durationSeconds: dto.durationSeconds,
        avgPace: this.formatPace(dto.avgPaceSecPerKm),
        calories: dto.calories,
      },
    };
  }

  // ── 루트 평가 ──────────────────────────────────────────────────
  async rateRoute(routeId: string, dto: RateRouteDto, user: User) {
    await this.getRouteById(routeId);

    const existing = await this.ratingRepo.findOne({
      where: { routeId, userId: user.id },
    });

    if (existing) {
      await this.ratingRepo.update(existing.id, { ...dto });
    } else {
      const rating = this.ratingRepo.create({ routeId, userId: user.id, ...dto });
      await this.ratingRepo.save(rating);
    }

    // 평균 평점 업데이트
    const { avg } = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.routeId = :routeId', { routeId })
      .getRawOne();
    await this.routeRepo.update(routeId, { avgRating: parseFloat(avg) });

    return { message: '평가가 저장되었습니다.' };
  }

  // ── 주변 캐시된 루트 ───────────────────────────────────────────
  async getNearbyRoutes(dto: NearbyRoutesDto) {
    const geohash = encodeGeohash(dto.lat, dto.lng, 4); // 정밀도 낮춰서 넓은 범위
    const routes = await this.routeRepo
      .createQueryBuilder('r')
      .where('r.geohash LIKE :prefix', { prefix: `${geohash}%` })
      .andWhere('r.isPublic = true')
      .orderBy('r.usageCount', 'DESC')
      .limit(10)
      .getMany();
    return { routes };
  }

  // ── 사용자 러닝 기록 ───────────────────────────────────────────
  async getUserHistory(userId: string, page = 1, limit = 20) {
    const [records, total] = await this.recordRepo.findAndCount({
      where: { userId },
      relations: ['route'],
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { records, total, page, limit };
  }

  // ── 루트 즐겨찾기 저장 ─────────────────────────────────────────
  async saveRoute(routeId: string, user: User, nickname?: string) {
    await this.getRouteById(routeId);
    const existing = await this.savedRepo.findOne({ where: { routeId, userId: user.id } });
    if (existing) return { message: '이미 저장된 루트입니다.' };

    const saved = this.savedRepo.create({ routeId, userId: user.id, nickname });
    await this.savedRepo.save(saved);
    return { message: '루트가 저장되었습니다.' };
  }

  // ── 내부 헬퍼 메서드 ───────────────────────────────────────────
  private async parseNaturalQuery(dto: RecommendRouteDto): Promise<RecommendRouteDto> {
    try {
      const aiServiceUrl = this.configService.get('aiService.url');
      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/ai/parse`, {
          natural_query: dto.naturalQuery,
          context: { lat: dto.lat, lng: dto.lng },
        }),
      );
      return { ...dto, ...response.data };
    } catch {
      return dto; // AI 파싱 실패 시 원본 사용
    }
  }

  private async generateCandidateRoutes(dto: RecommendRouteDto) {
    // OSRM 기반 루프 루트 생성
    // 실제로는 출발점 기준 여러 방향으로 waypoint를 생성하여 루프 루트를 만듦
    const osrmUrl = this.configService.get('osrm.baseUrl');
    const radius = (dto.distanceKm / (2 * Math.PI)) * 1000; // 대략적인 원형 루트 반경 (m)

    // 3가지 방향으로 후보 루트 생성 (북동, 남서, 서북)
    const directions = [
      { dlat: radius * 0.7, dlng: radius * 0.7 },
      { dlat: -radius * 0.7, dlng: -radius * 0.5 },
      { dlat: radius * 0.3, dlng: -radius * 0.8 },
    ];

    const candidates = await Promise.allSettled(
      directions.map(async (dir) => {
        const midLat = dto.lat + dir.dlat / 111000;
        const midLng = dto.lng + dir.dlng / (111000 * Math.cos(dto.lat * Math.PI / 180));
        const coords = `${dto.lng},${dto.lat};${midLng},${midLat};${dto.lng},${dto.lat}`;
        const res = await firstValueFrom(
          this.httpService.get(`${osrmUrl}/route/v1/foot/${coords}?overview=full&geometries=geojson`),
        );
        return res.data.routes[0];
      }),
    );

    return candidates
      .filter((r) => r.status === 'fulfilled')
      .map((r: any) => r.value);
  }

  private async scoreRoutes(routes: any[], dto: RecommendRouteDto, user: User) {
    // 각 루트에 스코어 계산
    return routes
      .map((route) => {
        const distanceScore = this.calcDistanceAccuracy(route, dto.distanceKm);
        const safetyScore = Math.random() * 40 + 60; // TODO: 실제 안전도 데이터 연동
        const sceneryScore = Math.random() * 40 + 50; // TODO: Google Places 연동

        const totalScore =
          safetyScore * 0.3 +
          sceneryScore * 0.25 +
          distanceScore * 0.35 +
          50 * 0.1; // 개인화 점수 (기본값)

        return { ...route, safetyScore, sceneryScore, distanceScore, totalScore };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  private calcDistanceAccuracy(route: any, targetKm: number): number {
    const actualKm = (route.distance || 0) / 1000;
    const error = Math.abs(actualKm - targetKm) / targetKm;
    return Math.max(0, 100 - error * 100);
  }

  private async saveRouteToDb(routeData: any, userId: string, geohash: string): Promise<Route> {
    const route = this.routeRepo.create({
      creatorId: userId,
      geojson: {
        type: 'Feature',
        geometry: routeData.geometry || { type: 'LineString', coordinates: [] },
        properties: {},
      },
      distanceKm: (routeData.distance || 0) / 1000,
      safetyScore: routeData.safetyScore || 70,
      sceneryScore: routeData.sceneryScore || 65,
      geohash,
      startLat: 0, // TODO: 실제 좌표
      startLng: 0,
    });
    return this.routeRepo.save(route);
  }

  private buildNavigationData(route: Route) {
    // GeoJSON에서 턴-바이-턴 내비 데이터 생성
    const coords = route.geojson?.geometry?.coordinates || [];
    return {
      waypoints: coords,
      totalDistanceKm: route.distanceKm,
      estimatedMinutes: Math.round(route.distanceKm * 6), // 6분/km 기준
    };
  }

  private async checkDailyLimit(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await this.sessionRepo.count({
      where: { userId, createdAt: today as any },
    });
    if (count >= 3) {
      throw new ForbiddenException('무료 플랜은 하루 3회까지 루트 추천이 가능합니다. Pro로 업그레이드하세요!');
    }
  }

  private async updateUserStats(userId: string, distanceKm: number) {
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({
        totalRuns: () => 'total_runs + 1',
        totalDistanceKm: () => `total_distance_km + ${distanceKm}`,
      })
      .where('id = :userId', { userId })
      .execute();
  }

  private formatPace(secPerKm: number): string {
    if (!secPerKm) return '-';
    const min = Math.floor(secPerKm / 60);
    const sec = Math.round(secPerKm % 60);
    return `${min}'${sec.toString().padStart(2, '0')}"`;
  }

  // TypeORM 접근을 위한 userRepo (updateUserStats에서 사용)
  @InjectRepository(User)
  private readonly userRepo: Repository<User>;
}
