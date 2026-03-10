import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Route } from './route.entity';

@Entity('route_ratings')
export class RouteRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  routeId: string;

  @ManyToOne(() => Route, (route) => route.ratings)
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'simple-array', nullable: true })
  feedbackTags: string[]; // 'safe','scenic','accurate','too_hilly'

  @Column({ nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
