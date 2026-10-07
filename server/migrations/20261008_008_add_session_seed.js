// Seeded offline sessions regenerate their cargo orders from the seed every
// port call (rngForPortCall). It was never persisted, so after a restart a
// seeded session silently fell back to Math.random. jsonb keeps the seed's
// original type (number vs string hash to different RNG streams).
export async function up(knex) {
  const has = await knex.schema.hasColumn('sessions', 'seed');
  if (!has) {
    return knex.schema.alterTable('sessions', (table) => {
      table.jsonb('seed').nullable();
    });
  }
}

export async function down(knex) {
  return knex.schema.alterTable('sessions', (table) => {
    table.dropColumn('seed');
  });
}
