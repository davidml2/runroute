import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RoutesModule],
  controllers: [UsersController],
  exports: [TypeOrmModule],
})
export class UsersModule {}
