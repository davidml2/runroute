# 🏃 RunRoute AI - Backend API

NestJS 기반 러닝 루트 추천 앱 백엔드

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | NestJS 10 |
| 언어 | TypeScript 5 |
| 데이터베이스 | PostgreSQL 16 + TypeORM |
| 캐시 | Redis 7 |
| 인증 | JWT (Access 15분 + Refresh 30일) |
| WebSocket | Socket.io (실시간 내비게이션) |
| API 문서 | Swagger (개발환경 자동 생성) |
| 배포 | Docker + AWS ECS |

## 프로젝트 구조

```
src/
├── auth/                   # 인증 (로그인, JWT, 소셜)
│   ├── decorators/         # @CurrentUser, @Public
│   ├── dto/                # 요청/응답 타입
│   └── guards/             # JWT 전략 및 가드
├── routes/                 # 루트 추천 핵심 기능
│   ├── dto/                # RecommendRouteDto 등
│   ├── entities/           # Route, RunningRecord 등 DB 엔티티
│   ├── route.controller.ts
│   ├── route.service.ts
│   └── navigation.gateway.ts  # WebSocket 내비게이션
├── users/                  # 사용자 프로필 및 기록
├── common/utils/           # Geohash 등 유틸
├── config/                 # 환경변수 설정
├── database/migrations/    # DB 마이그레이션
├── app.module.ts
└── main.ts
```

## 빠른 시작

### 1. 환경변수 설정
```bash
cp .env.example .env
# .env 파일에서 API 키 입력
```

### 2. Docker로 실행 (권장)
```bash
docker-compose up -d
```

### 3. 로컬 개발 실행
```bash
npm install
npm run start:dev
```

### 4. DB 마이그레이션 실행
```bash
npm run migration:run
```

## API 엔드포인트

### Auth
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/v1/auth/register | 회원가입 |
| POST | /api/v1/auth/login | 이메일 로그인 |
| POST | /api/v1/auth/social | 소셜 로그인 |
| POST | /api/v1/auth/refresh | 토큰 갱신 |
| POST | /api/v1/auth/logout | 로그아웃 |
| GET | /api/v1/auth/me | 현재 유저 정보 |

### Routes
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/v1/routes/recommend | **AI 루트 추천 (핵심)** |
| GET | /api/v1/routes/nearby | 주변 루트 조회 |
| GET | /api/v1/routes/:id | 루트 상세 |
| POST | /api/v1/routes/:id/start | 러닝 시작 |
| PATCH | /api/v1/routes/sessions/:id/complete | 러닝 완료 |
| POST | /api/v1/routes/:id/rate | 루트 평가 |
| POST | /api/v1/routes/:id/save | 즐겨찾기 저장 |

### Users
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/v1/users/me | 내 프로필 |
| PATCH | /api/v1/users/me | 프로필 수정 |
| PATCH | /api/v1/users/preferences | 선호 설정 |
| GET | /api/v1/users/history | 러닝 기록 |
| GET | /api/v1/users/stats | 통계 |
| GET | /api/v1/users/saved-routes | 저장한 루트 |

### WebSocket (실시간 내비게이션)
- 연결: `ws://localhost:3000/navigation`
- 이벤트: `location:update` → `navigation:update`, `navigation:off_route`

## 테스트

```bash
npm test              # 단위 테스트
npm run test:cov      # 커버리지
npm run test:e2e      # E2E 테스트
```

## Swagger 문서

개발 서버 실행 후: http://localhost:3000/api/docs

## 다음 개발 단계

1. **AI 서비스** (Python FastAPI): `/ai-service` 디렉토리에 별도 구현
2. **iOS 앱** (SwiftUI): 이 API를 소비하는 클라이언트
3. **Android 앱** (Jetpack Compose)
4. **Apple Watch / WearOS 앱**
