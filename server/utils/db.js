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

const getConnectionString = () => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';
  const database = process.env.DB_NAME || 'spil_game';
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
};

const connectionString = getConnectionString();

console.log(`[Database] Connecting to: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Test connection on startup
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('[Database] Koneksi PostgreSQL berhasil terhubung.');
    client.release();
    return true;
  } catch (err) {
    console.error('====================================================');
    console.error('  CRITICAL ERROR: Gagal terhubung ke PostgreSQL!');
    console.error('  Pastikan server PostgreSQL Anda berjalan dan');
    console.error('  variabel DATABASE_URL di .env sudah dikonfigurasi.');
    console.error('  Detail error:', err.message || err);
    console.error('====================================================');
    return false;
  }
};

// Initial non-blocking check
testConnection();

export const query = (text, params) => pool.query(text, params);

export const closePool = async () => {
  try {
    await pool.end();
    console.log('[Database] Pool koneksi ditutup secara bersih.');
  } catch (err) {
    console.error('[Database] Error saat menutup pool:', err.message || err);
  }
};
