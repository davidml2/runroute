import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RouteService } from './route.service';
import { Route } from './entities/route.entity';
import { RunningRecord } from './entities/running-record.entity';
import { RouteRating } from './entities/route-rating.entity';
import { SavedRoute } from './entities/saved-route.entity';
import { NavigationSession } from './entities/navigation-session.entity';
import { User } from '../users/entities/user.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({ avg: '4.0' }),
    relation: jest.fn().mockReturnThis(),
    of: jest.fn().mockReturnThis(),
    loadMany: jest.fn().mockResolvedValue([]),
  }),
});

const mockUser: Partial<User> = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: '테스트유저',
  plan: 'pro',
};

describe('RouteService', () => {
  let service: RouteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        { provide: getRepositoryToken(Route), useFactory: mockRepo },
        { provide: getRepositoryToken(RunningRecord), useFactory: mockRepo },
        { provide: getRepositoryToken(RouteRating), useFactory: mockRepo },
        { provide: getRepositoryToken(SavedRoute), useFactory: mockRepo },
        { provide: getRepositoryToken(NavigationSession), useFactory: mockRepo },
        { provide: getRepositoryToken(User), useFactory: mockRepo },
        { provide: HttpService, useValue: { post: jest.fn(), get: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') } },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn() } },
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
  });

  it('서비스가 정상적으로 생성되어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('getRouteById', () => {
    it('존재하지 않는 루트는 NotFoundException을 던져야 한다', async () => {
      jest.spyOn(service['routeRepo'], 'findOne').mockResolvedValue(null);
      await expect(service.getRouteById('non-existent-id')).rejects.toThrow('루트를 찾을 수 없습니다.');
    });

    it('존재하는 루트를 반환해야 한다', async () => {
      const mockRoute = { id: 'route-1', distanceKm: 5 } as Route;
      jest.spyOn(service['routeRepo'], 'findOne').mockResolvedValue(mockRoute);
      const result = await service.getRouteById('route-1');
      expect(result).toEqual(mockRoute);
    });
  });

  describe('rateRoute', () => {
    it('루트 평가를 저장해야 한다', async () => {
      const mockRoute = { id: 'route-1' } as Route;
      jest.spyOn(service['routeRepo'], 'findOne').mockResolvedValue(mockRoute);
      jest.spyOn(service['ratingRepo'], 'findOne').mockResolvedValue(null);
      jest.spyOn(service['ratingRepo'], 'create').mockReturnValue({} as any);
      jest.spyOn(service['ratingRepo'], 'save').mockResolvedValue({} as any);

      const result = await service.rateRoute('route-1', { rating: 4 }, mockUser as User);
      expect(result.message).toBe('평가가 저장되었습니다.');
    });
  });
});
