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
    // Fail the boot: running on a half-migrated schema only surfaces later as
    // confusing errors mid-game, and the platform should mark the deploy failed.
    console.error('[Database] Migration failed:', err.message);
    throw err;
  } finally {
    // Migrations only - the app's queries go through utils/db.js's pool.
    await db?.destroy();
    db = null;
  }
};
