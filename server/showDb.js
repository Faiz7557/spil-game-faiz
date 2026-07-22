import { query } from './utils/db.js';

async function show() {
  try {
    console.log('\n=== 📋 STRUKTUR TABEL ROOMS ===');
    const roomCols = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'rooms'
      ORDER BY ordinal_position;
    `);
    console.table(roomCols.rows);

    console.log('\n=== 🏠 ISI TABEL ROOMS (Online Multiplayer) ===');
    const roomsData = await query(`
      SELECT room_code, week, current_port, is_game_over, created_at 
      FROM rooms 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    if (roomsData.rows.length === 0) {
      console.log('(Belum ada data room online di database.)');
    } else {
      console.table(roomsData.rows);
    }

    console.log('\n=== 📋 STRUKTUR TABEL SESSIONS ===');
    const sessionCols = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position;
    `);
    console.table(sessionCols.rows);

    console.log('\n=== 🎮 ISI TABEL SESSIONS (Offline / Single Player) ===');
    const sessionsData = await query(`
      SELECT session_id, week, current_port, is_game_over, updated_at 
      FROM sessions 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    
    if (sessionsData.rows.length === 0) {
      console.log('(Belum ada data sesi permainan di database.)');
    } else {
      console.table(sessionsData.rows);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Gagal menampilkan database:', err.message || err);
    process.exit(1);
  }
}

show();

