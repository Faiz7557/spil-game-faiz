export async function up(knex) {
  // Safe idempotent index creation using PostgreSQL IF NOT EXISTS
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_rooms_is_game_over ON rooms (is_game_over);');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_sessions_is_game_over ON sessions (is_game_over);');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_leaderboard_cash ON leaderboard_entries (cash DESC);');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_leaderboard_mode_cash ON leaderboard_entries (mode, cash DESC);');

  const hasChat = await knex.schema.hasTable('chat_messages');
  if (hasChat) {
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_chat_room_created ON chat_messages (room_code, created_at);');
  }

  const hasBadges = await knex.schema.hasTable('badges');
  if (hasBadges) {
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges (user_id);');
  }
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_rooms_is_game_over;');
  await knex.raw('DROP INDEX IF EXISTS idx_sessions_is_game_over;');
  await knex.raw('DROP INDEX IF EXISTS idx_leaderboard_cash;');
  await knex.raw('DROP INDEX IF EXISTS idx_leaderboard_mode_cash;');
  await knex.raw('DROP INDEX IF EXISTS idx_chat_room_created;');
  await knex.raw('DROP INDEX IF EXISTS idx_badges_user_id;');
}
