import {
  Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, SocialLoginDto, TokenResponseDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('api/v1/auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이메일 로그인' })
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('social')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '소셜 로그인 (Google / Apple)' })
  async socialLogin(@Body() dto: SocialLoginDto): Promise<TokenResponseDto> {
    return this.authService.socialLogin(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '액세스 토큰 갱신' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '로그아웃' })
  async logout(@CurrentUser() user: User): Promise<void> {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 로그인 사용자 정보' })
  async me(@CurrentUser() user: User) {
    return { id: user.id, email: user.email, name: user.name, plan: user.plan };
  }
}
