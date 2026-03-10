import {
  Controller, Get, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsObject, IsString, IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserPreferences } from './entities/user.entity';
import { RouteService } from '../routes/route.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() profileImageUrl?: string;
}

class UpdatePreferencesDto {
  @IsOptional() @IsObject() preferences?: Partial<UserPreferences>;
}

@ApiTags('Users')
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly routeService: RouteService,
  ) {}

  // GET /api/v1/users/me
  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageUrl: user.profileImageUrl,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
      totalRuns: user.totalRuns,
      totalDistanceKm: user.totalDistanceKm,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };
  }

  // PATCH /api/v1/users/me
  @Patch('me')
  @ApiOperation({ summary: '프로필 수정' })
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    await this.userRepo.update(user.id, dto);
    return { message: '프로필이 업데이트되었습니다.' };
  }

  // PATCH /api/v1/users/preferences
  @Patch('preferences')
  @ApiOperation({ summary: '러닝 선호 설정 수정' })
  async updatePreferences(@CurrentUser() user: User, @Body() dto: UpdatePreferencesDto) {
    const merged = { ...(user.preferences || {}), ...(dto.preferences || {}) };
    await this.userRepo.update(user.id, { preferences: merged });
    return { message: '선호 설정이 저장되었습니다.', preferences: merged };
  }

  // GET /api/v1/users/history
  @Get('history')
  @ApiOperation({ summary: '나의 러닝 기록' })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.routeService.getUserHistory(user.id, page, limit);
  }

  // GET /api/v1/users/saved-routes
  @Get('saved-routes')
  @ApiOperation({ summary: '저장한 루트 목록' })
  async getSavedRoutes(@CurrentUser() user: User) {
    const saved = await this.userRepo
      .createQueryBuilder('u')
      .relation(User, 'savedRoutes')
      .of(user.id)
      .loadMany();
    return { savedRoutes: saved };
  }

  // GET /api/v1/users/stats
  @Get('stats')
  @ApiOperation({ summary: '나의 러닝 통계' })
  async getStats(@CurrentUser() user: User) {
    return {
      totalRuns: user.totalRuns,
      totalDistanceKm: Number(user.totalDistanceKm),
      avgDistanceKm:
        user.totalRuns > 0
          ? (Number(user.totalDistanceKm) / user.totalRuns).toFixed(2)
          : 0,
    };
  }

  // DELETE /api/v1/users/me
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '회원 탈퇴 (소프트 삭제)' })
  async deleteAccount(@CurrentUser() user: User) {
    await this.userRepo.update(user.id, {
      isActive: false,
      email: `deleted_${user.id}@deleted.com`,
    });
  }
}
