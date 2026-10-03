export async function up(knex) {
  const exists = await knex.schema.hasTable('leaderboard_entries');
  if (!exists) {
    return knex.schema.createTable('leaderboard_entries', (table) => {
      table.increments('id').primary();
      table.string('player_name', 100).notNullable();
      table.bigInteger('cash').notNullable();
      table.bigInteger('accumulated_penalties').notNullable().defaultTo(0);
      table.string('player_rating', 100);
      table.string('mode', 10).notNullable();
      table.timestamp('completed_at', { useTz: true }).defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('leaderboard_entries');
}
