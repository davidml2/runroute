import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Route } from '../../routes/entities/route.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('navigation_sessions')
export class NavigationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  routeId: string;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Column({ default: 'mobile' })
  deviceType: string;

  @Column({ nullable: true })
  wsChannelId: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  progressKm: number;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
