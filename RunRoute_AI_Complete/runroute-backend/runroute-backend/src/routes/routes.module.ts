import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { NavigationGateway } from './navigation.gateway';
import { Route } from './entities/route.entity';
import { RunningRecord } from './entities/running-record.entity';
import { RouteRating } from './entities/route-rating.entity';
import { SavedRoute } from './entities/saved-route.entity';
import { NavigationSession } from './entities/navigation-session.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RunningRecord, RouteRating, SavedRoute, NavigationSession, User]),
    HttpModule,
  ],
  controllers: [RouteController],
  providers: [RouteService, NavigationGateway],
  exports: [RouteService],
})
export class RoutesModule {}
