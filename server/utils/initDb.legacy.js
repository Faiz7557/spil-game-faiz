import { query } from './db.js';

/**
 * Membuat tabel 'sessions' jika belum ada di PostgreSQL database
 */
export const initializeDatabase = async () => {
  const createRoomsTableSql = `
    CREATE TABLE IF NOT EXISTS rooms (
      room_code VARCHAR(10) PRIMARY KEY,
      week INT NOT NULL DEFAULT 1,
      current_port VARCHAR(10) NOT NULL DEFAULT 'SBY',
      global_cargo_pool JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_game_over BOOLEAN NOT NULL DEFAULT FALSE,
      players JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSessionsTableSql = `
    CREATE TABLE IF NOT EXISTS sessions (
      session_id VARCHAR(100) PRIMARY KEY,
      week INT NOT NULL DEFAULT 1,
      current_port VARCHAR(10) NOT NULL DEFAULT 'SBY',
      active_ports JSONB NOT NULL DEFAULT '["SBY", "MKS", "JYP", "MDN"]'::jsonb,
      vessel_level INT NOT NULL DEFAULT 1,
      shared_grid JSONB NOT NULL,
      global_cargo_pool JSONB NOT NULL DEFAULT '[]'::jsonb,
      players JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_game_over BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // `sessions` existed in some databases from an earlier iteration of this
  // schema (session_id/week/current_port/cash/accumulated_penalties/
  // player_rating/grid/orders/performance_log) that predates the shape the
  // app writes to today (active_ports/vessel_level/shared_grid/
  // global_cargo_pool/players). CREATE TABLE IF NOT EXISTS is a no-op
  // against an existing table, so on a database like that every offline save
  // was silently failing with "column ... does not exist", swallowed by the
  // try/catch in upsertSessionToDb. This brings an old table up to the
  // current shape without touching any row already in it: it adds the
  // columns the app now uses, and drops NOT NULL from the columns the app
  // no longer populates so inserts don't fail on them.
  const migrateSessionsTableSql = `
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_ports JSONB NOT NULL DEFAULT '["SBY", "MKS", "JYP", "MDN"]'::jsonb;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vessel_level INT NOT NULL DEFAULT 1;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS shared_grid JSONB;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS global_cargo_pool JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS players JSONB;
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'cash') THEN
        ALTER TABLE sessions ALTER COLUMN cash DROP NOT NULL;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'accumulated_penalties') THEN
        ALTER TABLE sessions ALTER COLUMN accumulated_penalties DROP NOT NULL;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'grid') THEN
        ALTER TABLE sessions ALTER COLUMN grid DROP NOT NULL;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'orders') THEN
        ALTER TABLE sessions ALTER COLUMN orders DROP NOT NULL;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'performance_log') THEN
        ALTER TABLE sessions ALTER COLUMN performance_log DROP NOT NULL;
      END IF;
    END $$;
  `;

  // One row per completed game (offline campaign finished, or an online
  // room's 8-week circuit ended). Written once, at game-over time, from the
  // server's own session/room state - never from anything a client submits
  // directly, same trust boundary as everything else in this file.
  const createLeaderboardTableSql = `
    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      id SERIAL PRIMARY KEY,
      player_name VARCHAR(100) NOT NULL,
      cash BIGINT NOT NULL,
      accumulated_penalties BIGINT NOT NULL DEFAULT 0,
      player_rating VARCHAR(100),
      mode VARCHAR(10) NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUsersTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(30) UNIQUE NOT NULL,
      password_hash VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(createRoomsTableSql);
    await query(createSessionsTableSql);
    await query(migrateSessionsTableSql);
    await query(createLeaderboardTableSql);
    await query(createUsersTableSql);
    console.log('[Database] Tabel `rooms`, `sessions`, `leaderboard_entries`, dan `users` berhasil diinisialisasi/disinkronkan di PostgreSQL.');
  } catch (error) {
    console.error('[Database] Kesalahan saat menginisialisasi database:', error.message || error);
  }
};

