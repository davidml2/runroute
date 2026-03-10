import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Route } from './route.entity';

@Entity('saved_routes')
export class SavedRoute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.savedRoutes)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  routeId: string;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column({ nullable: true })
  nickname: string; // 사용자 커스텀 이름

  @Column({ default: false })
  isOfflineCached: boolean;

  @CreateDateColumn()
  savedAt: Date;
}
