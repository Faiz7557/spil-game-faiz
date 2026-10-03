export async function up(knex) {
  const exists = await knex.schema.hasTable('badges');
  if (!exists) {
    return knex.schema.createTable('badges', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('badge_key', 50).notNullable();
      table.timestamp('earned_at').defaultTo(knex.fn.now());
      table.jsonb('session_context');
      table.unique(['user_id', 'badge_key']);
    });
  }
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('badges');
}
