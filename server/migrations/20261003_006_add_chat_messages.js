export async function up(knex) {
  const exists = await knex.schema.hasTable('chat_messages');
  if (!exists) {
    return knex.schema.createTable('chat_messages', (table) => {
      table.increments('id').primary();
      table.string('room_code', 10).notNullable();
      table.string('player_id', 255).notNullable();
      table.string('player_name', 100);
      table.text('message').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index('room_code', 'idx_chat_room');
    });
  }
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('chat_messages');
}
