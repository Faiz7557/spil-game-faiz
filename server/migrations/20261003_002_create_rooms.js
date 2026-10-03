export async function up(knex) {
  const exists = await knex.schema.hasTable('rooms');
  if (!exists) {
    return knex.schema.createTable('rooms', (table) => {
      table.string('room_code', 10).primary();
      table.integer('week').notNullable().defaultTo(1);
      table.string('current_port', 10).notNullable().defaultTo('SBY');
      table.jsonb('global_cargo_pool').notNullable().defaultTo('[]');
      table.boolean('is_game_over').notNullable().defaultTo(false);
      table.jsonb('players').notNullable().defaultTo('{}');
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('rooms');
}
