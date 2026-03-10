import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // UUID 확장
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── users 테이블 ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "social_provider_enum" AS ENUM ('local', 'google', 'apple')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "email"            VARCHAR UNIQUE,
        "password_hash"    VARCHAR,
        "name"             VARCHAR,
        "profile_image_url" VARCHAR,
        "social_provider"  "social_provider_enum" NOT NULL DEFAULT 'local',
        "social_id"        VARCHAR,
        "refresh_token"    VARCHAR,
        "preferences"      JSONB,
        "plan"             VARCHAR NOT NULL DEFAULT 'free',
        "plan_expires_at"  TIMESTAMP,
        "total_runs"       INTEGER NOT NULL DEFAULT 0,
        "total_distance_km" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "is_active"        BOOLEAN NOT NULL DEFAULT true,
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "idx_users_social" ON "users" ("social_provider", "social_id")`);

    // ── routes 테이블 ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "routes" (
        "id"              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "creator_id"      UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "geojson"         JSONB NOT NULL,
        "distance_km"     DECIMAL(6,2) NOT NULL,
        "elevation_data"  JSONB,
        "elevation_gain_m" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "safety_score"    DECIMAL(5,2) NOT NULL DEFAULT 0,
        "scenery_score"   DECIMAL(5,2) NOT NULL DEFAULT 0,
        "terrain_tags"    TEXT,
        "points_of_interest" JSONB,
        "start_lat"       DECIMAL(10,7) NOT NULL DEFAULT 0,
        "start_lng"       DECIMAL(10,7) NOT NULL DEFAULT 0,
        "geohash"         VARCHAR(10),
        "usage_count"     INTEGER NOT NULL DEFAULT 0,
        "avg_rating"      DECIMAL(3,2) NOT NULL DEFAULT 0,
        "is_public"       BOOLEAN NOT NULL DEFAULT true,
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_routes_geohash" ON "routes" ("geohash")`);
    await queryRunner.query(`CREATE INDEX "idx_routes_creator" ON "routes" ("creator_id")`);
    await queryRunner.query(`CREATE INDEX "idx_routes_public" ON "routes" ("is_public", "usage_count" DESC)`);

    // ── running_records 테이블 ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "running_records" (
        "id"                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "user_id"           UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "route_id"          UUID REFERENCES "routes"("id") ON DELETE SET NULL,
        "started_at"        TIMESTAMP NOT NULL,
        "completed_at"      TIMESTAMP,
        "actual_distance_km" DECIMAL(6,2) NOT NULL,
        "duration_seconds"  INTEGER,
        "avg_pace_sec_per_km" DECIMAL(6,2),
        "avg_heart_rate"    INTEGER,
        "max_heart_rate"    INTEGER,
        "calories"          INTEGER,
        "elevation_gain_m"  DECIMAL(6,2),
        "device_type"       VARCHAR NOT NULL DEFAULT 'mobile',
        "watch_model"       VARCHAR,
        "splits"            JSONB,
        "created_at"        TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_records_user" ON "running_records" ("user_id", "started_at" DESC)`);

    // ── route_ratings 테이블 ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "route_ratings" (
        "id"            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "user_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "route_id"      UUID NOT NULL REFERENCES "routes"("id") ON DELETE CASCADE,
        "rating"        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        "feedback_tags" TEXT,
        "comment"       VARCHAR,
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE ("user_id", "route_id")
      )
    `);

    // ── saved_routes 테이블 ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "saved_routes" (
        "id"                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "user_id"           UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "route_id"          UUID NOT NULL REFERENCES "routes"("id") ON DELETE CASCADE,
        "nickname"          VARCHAR,
        "is_offline_cached" BOOLEAN NOT NULL DEFAULT false,
        "saved_at"          TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE ("user_id", "route_id")
      )
    `);

    // ── navigation_sessions 테이블 ────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "session_status_enum" AS ENUM ('active', 'completed', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "navigation_sessions" (
        "id"            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "user_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "route_id"      UUID NOT NULL REFERENCES "routes"("id") ON DELETE CASCADE,
        "status"        "session_status_enum" NOT NULL DEFAULT 'active',
        "device_type"   VARCHAR NOT NULL DEFAULT 'mobile',
        "ws_channel_id" VARCHAR,
        "progress_km"   DECIMAL(6,2) NOT NULL DEFAULT 0,
        "completed_at"  TIMESTAMP,
        "created_at"    TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_sessions_user_active" ON "navigation_sessions" ("user_id", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "navigation_sessions"`);
    await queryRunner.query(`DROP TYPE "session_status_enum"`);
    await queryRunner.query(`DROP TABLE "saved_routes"`);
    await queryRunner.query(`DROP TABLE "route_ratings"`);
    await queryRunner.query(`DROP TABLE "running_records"`);
    await queryRunner.query(`DROP TABLE "routes"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "social_provider_enum"`);
  }
}
