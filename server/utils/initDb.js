import knex from 'knex';
import knexConfig from '../knexfile.js';

let db = null;

export const initializeDatabase = async () => {
  try {
    if (!db) {
      db = knex(knexConfig);
    }
    console.log('[Database] Running Knex migrations...');
    const [batchNo, migrations] = await db.migrate.latest();
    if (migrations.length > 0) {
      console.log(`[Database] Batch ${batchNo}: Applied ${migrations.length} migration(s):`);
      migrations.forEach(m => console.log(`  - ${m}`));
    } else {
      console.log('[Database] All migrations are up to date.');
    }
  } catch (err) {
    console.error('[Database] Migration failed:', err.message);
  }
};
