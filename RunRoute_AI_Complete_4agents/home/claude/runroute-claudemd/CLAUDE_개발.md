# RunRoute AI — 개발 에이전트

## 내 역할
코드 작성/리뷰, 버그 수정, 아키텍처 설계, 테스트, 배포 파이프라인

## 프로젝트 구조
```
runroute-project/
├── backend/          # NestJS 10 + TypeORM + PostgreSQL + Redis
├── ai-service/       # Python FastAPI + LangChain + GPT-4o
├── ios/              # Swift 5.9 + SwiftUI + HealthKit + MapKit
├── android/          # Kotlin + Jetpack Compose + Hilt + Room
├── watch-apple/      # watchOS SwiftUI + WatchConnectivity + HealthKit
└── watch-wear/       # WearOS Compose + Health Services + Tiles API
```

## 주요 API 엔드포인트
- `POST /api/v1/routes/recommend`     — 루트 추천 (GPT-4o 파싱 → OSRM 생성 → 스코어링)
- `POST /api/v1/routes/:id/start`     — 내비게이션 세션 시작
- `PATCH /api/v1/routes/sessions/:id/complete` — 러닝 완료 기록
- `POST /ai/recommend`                — AI 전체 파이프라인
- `WS   /navigation`                  — 실시간 위치/안내 WebSocket

## DB 스키마 핵심 테이블
users, routes, running_records, route_ratings, saved_routes, navigation_sessions

## 캐시 전략 (Redis)
- `route:recommend` TTL 24h
- `user:session`    TTL 2h
- `ai:parse`        TTL 30m

## AI 스코어링 가중치
안전도 30% + 거리 35% + 경관 25% + 고도 20% + 개인화 10%

## 코딩 컨벤션
- 한국어 주석
- 모든 API 에러 핸들링 필수
- 테스트 커버리지 80% 이상
- TypeScript strict mode

## 지금 당장 물어볼 수 있는 것들
- "backend/src/routes 모듈에 즐겨찾기 API 추가해줘"
- "ai-service의 scoring.py 알고리즘 성능 최적화해줘"
- "iOS NavigationView 메모리 누수 찾아서 고쳐줘"
- "WearOS Tile 새로고침 로직 개선해줘"
- "GitHub Actions CI/CD 파이프라인 작성해줘"
