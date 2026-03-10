import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { RunningRecord } from '../../routes/entities/running-record.entity';
import { SavedRoute } from '../../routes/entities/saved-route.entity';

export enum SocialProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export interface UserPreferences {
  preferredTerrains: string[];   // 'park' | 'riverside' | 'urban' | 'mountain'
  defaultDistance: number;        // km
  difficulty: 'easy' | 'moderate' | 'hard';
  unit: 'km' | 'mile';
  language: string;
  notificationsEnabled: boolean;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({
    type: 'enum',
    enum: SocialProvider,
    default: SocialProvider.LOCAL,
  })
  socialProvider: SocialProvider;

  @Column({ nullable: true })
  socialId: string;

  @Column({ nullable: true, select: false })
  refreshToken: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: UserPreferences;

  @Column({ default: 'free' })
  plan: string; // 'free' | 'pro' | 'team'

  @Column({ nullable: true })
  planExpiresAt: Date;

  @Column({ default: 0 })
  totalRuns: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDistanceKm: number;

  @OneToMany(() => RunningRecord, (record) => record.user)
  runningRecords: RunningRecord[];

  @OneToMany(() => SavedRoute, (saved) => saved.user)
  savedRoutes: SavedRoute[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
