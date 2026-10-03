export async function up(knex) {
  const exists = await knex.schema.hasTable('sessions');
  if (!exists) {
    return knex.schema.createTable('sessions', (table) => {
      table.string('session_id', 100).primary();
      table.integer('week').notNullable().defaultTo(1);
      table.string('current_port', 10).notNullable().defaultTo('SBY');
      table.jsonb('active_ports').notNullable().defaultTo('["SBY", "MKS", "JYP", "MDN"]');
      table.integer('vessel_level').notNullable().defaultTo(1);
      table.jsonb('shared_grid').nullable();
      table.jsonb('global_cargo_pool').notNullable().defaultTo('[]');
      table.jsonb('players').nullable();
      table.boolean('is_game_over').notNullable().defaultTo(false);
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
      
      table.bigInteger('cash').nullable();
      table.bigInteger('accumulated_penalties').nullable();
      table.jsonb('grid').nullable();
      table.jsonb('orders').nullable();
      table.jsonb('performance_log').nullable();
    });
  }
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('sessions');
}
