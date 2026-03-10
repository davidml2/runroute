import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RouteService } from './route.service';
import { RecommendRouteDto, CompleteRunDto, RateRouteDto, NearbyRoutesDto } from './dto/route.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Routes')
@Controller('api/v1/routes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  // POST /api/v1/routes/recommend
  @Post('recommend')
  @ApiOperation({ summary: 'AI 루트 추천 (핵심 기능)' })
  async recommend(
    @Body() dto: RecommendRouteDto,
    @CurrentUser() user: User,
  ) {
    return this.routeService.recommendRoutes(dto, user);
  }

  // GET /api/v1/routes/nearby
  @Get('nearby')
  @ApiOperation({ summary: '주변 캐시된 루트 목록' })
  async nearby(@Query() dto: NearbyRoutesDto) {
    return this.routeService.getNearbyRoutes(dto);
  }

  // GET /api/v1/routes/:id
  @Get(':id')
  @ApiOperation({ summary: '루트 상세 조회' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.routeService.getRouteById(id);
  }

  // POST /api/v1/routes/:id/start
  @Post(':id/start')
  @ApiOperation({ summary: '러닝 세션 시작 / 내비게이션 데이터 수신' })
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('deviceType') deviceType: string = 'mobile',
    @CurrentUser() user: User,
  ) {
    return this.routeService.startNavigation(id, user, deviceType);
  }

  // PATCH /api/v1/routes/sessions/:sessionId/complete
  @Patch('sessions/:sessionId/complete')
  @ApiOperation({ summary: '러닝 완료 및 기록 저장' })
  async complete(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: CompleteRunDto,
    @CurrentUser() user: User,
  ) {
    return this.routeService.completeRun(sessionId, dto, user);
  }

  // POST /api/v1/routes/:id/rate
  @Post(':id/rate')
  @ApiOperation({ summary: '루트 평가 (1-5점)' })
  @HttpCode(HttpStatus.OK)
  async rate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RateRouteDto,
    @CurrentUser() user: User,
  ) {
    return this.routeService.rateRoute(id, dto, user);
  }

  // POST /api/v1/routes/:id/save
  @Post(':id/save')
  @ApiOperation({ summary: '루트 즐겨찾기 저장' })
  @HttpCode(HttpStatus.OK)
  async save(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('nickname') nickname: string,
    @CurrentUser() user: User,
  ) {
    return this.routeService.saveRoute(id, user, nickname);
  }
}
