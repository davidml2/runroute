import {
  IsNumber, IsOptional, IsString, IsArray, IsEnum, Min, Max, IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TerrainType {
  PARK = 'park',
  RIVERSIDE = 'riverside',
  URBAN = 'urban',
  MOUNTAIN = 'mountain',
  BEACH = 'beach',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MODERATE = 'moderate',
  HARD = 'hard',
}

export class RecommendRouteDto {
  @ApiProperty({ example: 37.5665 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 126.9780 })
  @IsNumber()
  lng: number;

  @ApiProperty({ example: 5, description: '목표 거리 (km)' })
  @IsNumber()
  @Min(1)
  @Max(100)
  distanceKm: number;

  @ApiPropertyOptional({ enum: TerrainType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TerrainType, { each: true })
  preferences?: TerrainType[];

  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ example: '강변 위주로 5km 뛰고 싶어' })
  @IsOptional()
  @IsString()
  naturalQuery?: string;
}

export class CompleteRunDto {
  @ApiProperty({ example: 5.2 })
  @IsNumber()
  actualDistanceKm: number;

  @ApiProperty({ example: 1800, description: '소요 시간 (초)' })
  @IsNumber()
  durationSeconds: number;

  @ApiPropertyOptional({ example: 345, description: '평균 페이스 (초/km)' })
  @IsOptional()
  @IsNumber()
  avgPaceSecPerKm?: number;

  @ApiPropertyOptional({ example: 145 })
  @IsOptional()
  @IsNumber()
  avgHeartRate?: number;

  @ApiPropertyOptional({ example: 175 })
  @IsOptional()
  @IsNumber()
  maxHeartRate?: number;

  @ApiPropertyOptional({ example: 380 })
  @IsOptional()
  @IsNumber()
  calories?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  splits?: { km: number; paceSecPerKm: number; heartRate: number }[];
}

export class RateRouteDto {
  @ApiProperty({ example: 4, description: '1-5점' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ isArray: true, example: ['scenic', 'accurate'] })
  @IsOptional()
  @IsArray()
  feedbackTags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class NearbyRoutesDto {
  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radiusKm?: number;
}
