import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NavigationSession, SessionStatus } from '../routes/entities/navigation-session.entity';
import { Route } from '../routes/entities/route.entity';

interface LocationUpdate {
  sessionId: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/navigation',
})
export class NavigationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeConnections = new Map<string, string>(); // socketId → userId

  constructor(
    @InjectRepository(NavigationSession)
    private readonly sessionRepo: Repository<NavigationSession>,
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
  ) {}

  handleConnection(client: Socket) {
    console.log(`클라이언트 연결: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.activeConnections.delete(client.id);
    console.log(`클라이언트 연결 해제: ${client.id}`);
  }

  // 클라이언트 → 서버: 위치 업데이트 (1초마다)
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @MessageBody() data: LocationUpdate,
    @ConnectedSocket() client: Socket,
  ) {
    const session = await this.sessionRepo.findOne({
      where: { id: data.sessionId, status: SessionStatus.ACTIVE },
      relations: ['route'],
    });
    if (!session) return;

    // 루트 이탈 감지
    const isOffRoute = this.checkOffRoute(
      data.lat, data.lng,
      session.route.geojson?.geometry?.coordinates || [],
    );

    if (isOffRoute) {
      client.emit('navigation:off_route', {
        deviationMeters: 50,
        recalculating: true,
      });
      // TODO: 실제 재탐색 로직
      setTimeout(() => {
        client.emit('navigation:rerouted', {
          message: '새 루트를 계산했습니다.',
          eta: Math.round(session.route.distanceKm * 6),
        });
      }, 2000);
      return;
    }

    // 다음 방향 계산
    const nextTurn = this.calcNextTurn(
      data.lat, data.lng,
      session.route.geojson?.geometry?.coordinates || [],
      session.progressKm,
    );

    // 내비게이션 업데이트 전송
    client.emit('navigation:update', {
      currentPos: { lat: data.lat, lng: data.lng },
      nextTurn,
      progressKm: session.progressKm,
      totalKm: session.route.distanceKm,
    });
  }

  // 클라이언트 → 서버: 세션 완료
  @SubscribeMessage('session:complete')
  async handleSessionComplete(
    @MessageBody() data: { sessionId: string; distance: number; duration: number },
    @ConnectedSocket() client: Socket,
  ) {
    await this.sessionRepo.update(data.sessionId, {
      status: SessionStatus.COMPLETED,
      completedAt: new Date(),
      progressKm: data.distance,
    });
    client.emit('session:completed', { message: '러닝을 완료했습니다! 🎉' });
  }

  // ── 내부 헬퍼 ────────────────────────────────────────────────
  private checkOffRoute(lat: number, lng: number, routeCoords: number[][]): boolean {
    // 루트 좌표들과의 최소 거리 계산 (50m 이상이면 이탈)
    const THRESHOLD_M = 50;
    for (const [rLng, rLat] of routeCoords) {
      const dist = this.haversineDistance(lat, lng, rLat, rLng);
      if (dist < THRESHOLD_M) return false;
    }
    return true;
  }

  private calcNextTurn(lat: number, lng: number, coords: number[][], progressKm: number) {
    // 가장 가까운 루트 포인트 이후의 방향 변화 감지
    // 실제 구현에서는 더 정교한 알고리즘 사용
    return {
      direction: 'straight',
      distanceM: 200,
      instruction: '200m 직진',
    };
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
