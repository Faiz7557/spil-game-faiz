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

  try {
    await query(createRoomsTableSql);
    await query(createSessionsTableSql);
    console.log('[Database] Tabel `rooms` dan `sessions` berhasil diinisialisasi di PostgreSQL.');
  } catch (error) {
    console.error('[Database] Kesalahan saat menginisialisasi database:', error.message || error);
  }
};

