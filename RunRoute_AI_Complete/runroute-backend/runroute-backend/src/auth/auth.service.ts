import {
  Injectable, UnauthorizedException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, SocialProvider } from '../../users/entities/user.entity';
import { RegisterDto, LoginDto, SocialLoginDto, TokenResponseDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── 회원가입 ─────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      socialProvider: SocialProvider.LOCAL,
    });
    await this.userRepo.save(user);
    return this.generateTokens(user);
  }

  // ── 로컬 로그인 ────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
      select: ['id', 'email', 'name', 'passwordHash', 'plan', 'socialProvider'],
    });
    if (!user || user.socialProvider !== SocialProvider.LOCAL) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    return this.generateTokens(user);
  }

  // ── 소셜 로그인 ────────────────────────────────────────────────
  async socialLogin(dto: SocialLoginDto): Promise<TokenResponseDto> {
    // 실제 구현에서는 각 provider의 토큰을 검증하여 사용자 정보를 가져옴
    // Google: google-auth-library로 idToken 검증
    // Apple: apple-signin-auth로 identityToken 검증
    const socialUserInfo = await this.verifySocialToken(dto.provider, dto.token);

    let user = await this.userRepo.findOne({
      where: { socialId: socialUserInfo.id, socialProvider: dto.provider as SocialProvider },
    });

    if (!user) {
      // 같은 이메일로 가입된 계정이 있으면 연결
      user = await this.userRepo.findOne({ where: { email: socialUserInfo.email } });
      if (user) {
        user.socialId = socialUserInfo.id;
        user.socialProvider = dto.provider as SocialProvider;
      } else {
        user = this.userRepo.create({
          email: socialUserInfo.email,
          name: socialUserInfo.name,
          profileImageUrl: socialUserInfo.picture,
          socialId: socialUserInfo.id,
          socialProvider: dto.provider as SocialProvider,
        });
      }
      await this.userRepo.save(user);
    }

    return this.generateTokens(user);
  }

  // ── Refresh Token ──────────────────────────────────────────────
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
      const user = await this.userRepo.findOne({
        where: { id: payload.sub, isActive: true },
        select: ['id', 'email', 'plan', 'refreshToken'],
      });
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
      }
      const accessToken = this.signAccessToken(user);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('토큰이 만료되었습니다. 다시 로그인해주세요.');
    }
  }

  // ── 로그아웃 ────────────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshToken: null });
  }

  // ── 내부 헬퍼 ───────────────────────────────────────────────────
  private signAccessToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, plan: user.plan },
      {
        secret: this.configService.get('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiresIn'),
      },
    );
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      },
    );
    // refresh token 저장 (해시 저장 권장, 여기서는 단순화)
    await this.userRepo.update(user.id, { refreshToken });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    };
  }

  private async verifySocialToken(provider: string, token: string) {
    // TODO: 실제 소셜 토큰 검증 로직 구현
    // Google: https://oauth2.googleapis.com/tokeninfo?id_token=TOKEN
    // Apple: apple-signin-auth 라이브러리 사용
    throw new BadRequestException('소셜 로그인 구현 필요');
  }
}
