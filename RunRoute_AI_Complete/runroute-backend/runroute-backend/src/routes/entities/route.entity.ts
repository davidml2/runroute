import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RunningRecord } from './running-record.entity';
import { RouteRating } from './route-rating.entity';

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
  properties: Record<string, any>;
}

export interface ElevationPoint {
  distanceKm: number;
  elevationM: number;
}

export interface PointOfInterest {
  name: string;
  type: string; // 'park' | 'landmark' | 'water' | 'photo_spot'
  lat: number;
  lng: number;
  rating?: number;
}

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  creatorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'jsonb' })
  geojson: GeoJsonFeature;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  distanceKm: number;

  @Column({ type: 'jsonb', nullable: true })
  elevationData: ElevationPoint[];

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  elevationGainM: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  safetyScore: number; // 0-100

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  sceneryScore: number; // 0-100

  @Column({ type: 'simple-array', nullable: true })
  terrainTags: string[]; // 'park','riverside','urban','hill'

  @Column({ type: 'jsonb', nullable: true })
  pointsOfInterest: PointOfInterest[];

  // 출발점
  @Column({ type: 'decimal', precision: 10, scale: 7 })
  startLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  startLng: number;

  // 지역 캐싱을 위한 geohash
  @Column({ length: 10, nullable: true })
  geohash: string;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @Column({ default: true })
  isPublic: boolean;

  @OneToMany(() => RunningRecord, (record) => record.route)
  runningRecords: RunningRecord[];

  @OneToMany(() => RouteRating, (rating) => rating.route)
  ratings: RouteRating[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
