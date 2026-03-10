import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Route } from './route.entity';

@Entity('running_records')
export class RunningRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.runningRecords)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  routeId: string;

  @ManyToOne(() => Route, (route) => route.runningRecords, { nullable: true })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column()
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  actualDistanceKm: number;

  @Column({ nullable: true })
  durationSeconds: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgPaceSecPerKm: number; // seconds per km

  @Column({ nullable: true })
  avgHeartRate: number;

  @Column({ nullable: true })
  maxHeartRate: number;

  @Column({ nullable: true })
  calories: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  elevationGainM: number;

  @Column({ default: 'mobile' })
  deviceType: string; // 'mobile' | 'watch'

  @Column({ nullable: true })
  watchModel: string;

  @Column({ type: 'jsonb', nullable: true })
  splits: { km: number; paceSecPerKm: number; heartRate: number }[];

  @CreateDateColumn()
  createdAt: Date;
}
