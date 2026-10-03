export async function up(knex) {
  const exists = await knex.schema.hasTable('users');
  if (!exists) {
    return knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username', 30).unique().notNullable();
      table.string('password_hash', 100).notNullable();
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('users');
}
