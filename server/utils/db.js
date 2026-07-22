import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Parse PostgreSQL BIGINT (INT8) as JavaScript Number
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value, 10));

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/spil_game';

console.log(`[Database] Connecting to: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('====================================================');
    console.error('  CRITICAL ERROR: Gagal terhubung ke PostgreSQL!');
    console.error('  Pastikan server PostgreSQL Anda berjalan dan');
    console.error('  variabel DATABASE_URL di .env sudah dikonfigurasi.');
    console.error('  Detail error:', err.message || err);
    console.error('====================================================');
  } else {
    console.log('[Database] Koneksi PostgreSQL berhasil terhubung.');
    release();
  }
});

export const query = (text, params) => pool.query(text, params);
