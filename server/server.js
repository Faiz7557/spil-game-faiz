import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  PORTS,
  BAYS,
  getBayConfig,
  createEmptyGrid,
  generateOrders,
  calculateRestows,
  validateGridPhysics,
  calculateRollingPenalties,
  calculateDischargeRevenue,
  calculateDischargeCount,
  processSailingTransition,
  rngForPortCall,
  OFFLINE_BAYS_BY_LEVEL
} from './utils/gameEngine.js';
import { query } from './utils/db.js';
import { initializeDatabase } from './utils/initDb.js';
import { processBotTurn, DEFAULT_BOT_PROFILES } from './utils/botEngine.js';
import { hashPassword, verifyPassword, signToken, resolveIdentity, tokenWasRejected } from './utils/auth.js';



const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory multiplayer room store
const ROOMS = {};

// In-memory offline (pass-and-play vs bots) session store, keyed by the
// browser's persistent client id (see CLIENT_ID in client/src/App.jsx). The
// server owns cash/grid/cargo state entirely from here on - the client only
// sends discrete actions (claim/decline/place/remove/upgrade/depart) and
// renders whatever state the server hands back. Nothing about a player's
// economy is read from the request body anymore.
const OFFLINE_SESSIONS = {};

const OFFLINE_START_CASH = 150000000;
const OFFLINE_UPGRADE_COST = { 2: 50000000, 3: 100000000 };

// Helper to generate a unique 4-character room code.
// Math.random().toString(36) can yield fewer than 4 chars (e.g. leading zero
// digits get dropped), so pad before truncating. Retries against the live
// ROOMS map to avoid silently overwriting an active room on collision.
const generateRoomCode = () => {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, '0');
  } while (ROOMS[code]);
  return code;
};

// Helper to clean up empty rooms or send status updates
const broadcastRoomState = (roomCode) => {
  const room = ROOMS[roomCode];
  if (!room) return;
  room.lastActiveAt = Date.now();
  io.to(roomCode).emit('room_state', room);
  upsertRoomToDb(roomCode);
};

// Database CRUD Helpers for Multiplayer Rooms & Sessions
const loadRoomsFromDb = async () => {
  try {
    const res = await query(`SELECT * FROM rooms WHERE is_game_over = FALSE`);
    res.rows.forEach(row => {
      const players = typeof row.players === 'string' ? JSON.parse(row.players) : row.players;
      // No socket is actually connected to any of these players right after
      // a restart, whatever `connected` said when the row was last saved.
      // Force it false so allReady-style checks correctly wait for a real
      // join_room reconnect instead of trusting stale state.
      Object.values(players).forEach(p => { p.connected = false; });

      ROOMS[row.room_code] = {
        roomCode: row.room_code,
        week: row.week,
        currentPort: row.current_port,
        globalCargoPool: typeof row.global_cargo_pool === 'string' ? JSON.parse(row.global_cargo_pool) : row.global_cargo_pool,
        isGameOver: row.is_game_over,
        players
      };
    });
    console.log(`[Database] Loaded ${res.rows.length} active room(s) from PostgreSQL into memory.`);
  } catch (err) {
    console.error('[Database] Failed loading active rooms from DB:', err.message || err);
  }
};

const loadSessionsFromDb = async () => {
  try {
    const res = await query(`SELECT * FROM sessions WHERE is_game_over = FALSE`);
    let loaded = 0;
    res.rows.forEach(row => {
      const players = typeof row.players === 'string' ? JSON.parse(row.players) : row.players;
      // Rows saved before the sessions-table migration (see initDb.js) have
      // no usable players/shared_grid - skip rather than resurrect a
      // half-shaped session that would crash the first action against it.
      if (!Array.isArray(players) || players.length === 0 || !row.shared_grid) return;

      OFFLINE_SESSIONS[row.session_id] = {
        sessionId: row.session_id,
        week: row.week,
        currentPort: row.current_port,
        activePorts: typeof row.active_ports === 'string' ? JSON.parse(row.active_ports) : row.active_ports,
        vesselLevel: row.vessel_level || 1,
        sharedGrid: typeof row.shared_grid === 'string' ? JSON.parse(row.shared_grid) : row.shared_grid,
        players,
        isGameOver: row.is_game_over,
        seed: null
      };
      loaded++;
    });
    console.log(`[Database] Loaded ${loaded} active offline session(s) from PostgreSQL into memory.`);
  } catch (err) {
    console.error('[Database] Failed loading offline sessions from DB:', err.message || err);
  }
};

const persistOfflineSession = (session) => {
  session.lastActiveAt = Date.now();
  upsertSessionToDb(session.sessionId, {
    week: session.week,
    currentPort: session.currentPort,
    activePorts: session.activePorts,
    vesselLevel: session.vesselLevel,
    sharedGrid: session.sharedGrid,
    globalCargoPool: [],
    players: session.players,
    isGameOver: session.isGameOver
  });
};

// Periodic cleanup for abandoned rooms and sessions in memory (runs every 30 minutes)
const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  const now = Date.now();
  // 1. Clean inactive rooms where all players are disconnected
  Object.keys(ROOMS).forEach(roomCode => {
    const room = ROOMS[roomCode];
    if (!room) return;
    const allDisconnected = Object.values(room.players).every(p => !p.connected);
    const lastActive = room.lastActiveAt || 0;
    if (allDisconnected && (now - lastActive > ROOM_TTL_MS)) {
      console.log(`[TTL Cleanup] Evicting stale inactive Room ${roomCode}`);
      stopTurnTimer(roomCode);
      delete ROOMS[roomCode];
      deleteRoomFromDb(roomCode);
    }
  });

  // 2. Clean inactive in-memory offline sessions (persisted in DB)
  Object.keys(OFFLINE_SESSIONS).forEach(sessionId => {
    const session = OFFLINE_SESSIONS[sessionId];
    if (!session) return;
    const lastActive = session.lastActiveAt || 0;
    if (now - lastActive > SESSION_TTL_MS) {
      console.log(`[TTL Cleanup] Evicting stale Offline Session ${sessionId} from memory`);
      delete OFFLINE_SESSIONS[sessionId];
    }
  });
}, 30 * 60 * 1000);

// In Chief Stowage Planner mode, the human player (index 0) manages stowage across all 4 ports
const getOfflineActivePlayerIndex = (session) => 0;

const computePlayerRating = (cash) => {
  if (cash >= 300000000) return 'VP Operasi Logistik & Stowage';
  if (cash >= 200000000) return 'Spesialis Stowage Pelabuhan Senior';
  if (cash >= 100000000) return 'Koordinator Logistik Standar';
  if (cash < 0) return 'Supervisor Terminal Bangkrut';
  return 'Perwira Logistik Junior';
};

// Writes one row per completed game. Called only at game-over, from the
// server's own final state - never from a client-submitted value.
const recordLeaderboardEntry = async (playerName, cash, accumulatedPenalties, playerRating, mode) => {
  try {
    await query(
      `INSERT INTO leaderboard_entries (player_name, cash, accumulated_penalties, player_rating, mode)
       VALUES ($1, $2, $3, $4, $5)`,
      [playerName || 'Kapten Anonim', cash, accumulatedPenalties || 0, playerRating, mode]
    );
  } catch (err) {
    console.error('[Leaderboard] Failed recording entry:', err.message || err);
  }
};

const upsertRoomToDb = async (roomCode) => {
  const room = ROOMS[roomCode];
  if (!room) return;
  try {
    const sql = `
      INSERT INTO rooms (room_code, week, current_port, global_cargo_pool, is_game_over, players, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (room_code) DO UPDATE SET
        week = EXCLUDED.week,
        current_port = EXCLUDED.current_port,
        global_cargo_pool = EXCLUDED.global_cargo_pool,
        is_game_over = EXCLUDED.is_game_over,
        players = EXCLUDED.players,
        updated_at = CURRENT_TIMESTAMP;
    `;
    await query(sql, [
      room.roomCode,
      room.week,
      room.currentPort,
      JSON.stringify(room.globalCargoPool),
      room.isGameOver,
      JSON.stringify(room.players)
    ]);
  } catch (err) {
    console.error(`[Database] Error saving room ${roomCode}:`, err.message || err);
  }
};

const deleteRoomFromDb = async (roomCode) => {
  try {
    await query(`DELETE FROM rooms WHERE room_code = $1`, [roomCode]);
  } catch (err) {
    console.error(`[Database] Error deleting room ${roomCode}:`, err.message || err);
  }
};

const upsertSessionToDb = async (sessionId, sessionData) => {
  try {
    const sql = `
      INSERT INTO sessions (session_id, week, current_port, active_ports, vessel_level, shared_grid, global_cargo_pool, players, is_game_over, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (session_id) DO UPDATE SET
        week = EXCLUDED.week,
        current_port = EXCLUDED.current_port,
        active_ports = EXCLUDED.active_ports,
        vessel_level = EXCLUDED.vessel_level,
        shared_grid = EXCLUDED.shared_grid,
        global_cargo_pool = EXCLUDED.global_cargo_pool,
        players = EXCLUDED.players,
        is_game_over = EXCLUDED.is_game_over,
        updated_at = CURRENT_TIMESTAMP;
    `;
    await query(sql, [
      sessionId,
      sessionData.week || 1,
      sessionData.currentPort || 'SBY',
      JSON.stringify(sessionData.activePorts || ['SBY', 'MKS', 'JYP', 'MDN']),
      sessionData.vesselLevel || 1,
      JSON.stringify(sessionData.sharedGrid || {}),
      JSON.stringify(sessionData.globalCargoPool || []),
      JSON.stringify(sessionData.players || []),
      sessionData.isGameOver ?? false
    ]);
  } catch (err) {
    console.error(`[Database] Error saving session ${sessionId}:`, err.message || err);
  }
};


// Express REST API fallback (optional health checks)
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', roomsConnected: Object.keys(ROOMS).length });
});

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// Login/register have no other protection against brute-forcing a password
// or spamming account creation - cap attempts per IP rather than leaving
// them uncapped.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.' }
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      return res.status(400).json({ success: false, message: 'Nama pengguna harus 3-20 karakter (huruf, angka, underscore).' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter.' });
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Nama pengguna sudah dipakai.' });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, passwordHash]
    );
    const userId = inserted.rows[0].id;
    const token = signToken(userId, username);
    res.json({ success: true, data: { token, userId, username } });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'Internal server error registering user.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Nama pengguna dan kata sandi wajib diisi.' });
    }

    const result = await query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    // Same generic message whether the username doesn't exist or the
    // password is wrong, so a login attempt can't be used to enumerate
    // which usernames are registered.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Nama pengguna atau kata sandi salah.' });
    }

    const token = signToken(user.id, user.username);
    res.json({ success: true, data: { token, userId: user.id, username: user.username } });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ success: false, message: 'Internal server error logging in.' });
  }
});

// Top captains by final cash across all completed games (offline + online).
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const result = await query(
      `SELECT player_name, cash, accumulated_penalties, player_rating, mode, completed_at
       FROM leaderboard_entries
       ORDER BY cash DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Internal server error fetching leaderboard.' });
  }
});

// WebSocket Real-time controllers
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // 1. Create Room (Host)
  socket.on('create_room', ({ playerName, playerId, authToken }) => {
    try {
      if (tokenWasRejected(authToken)) {
        return socket.emit('error_message', 'auth_expired:Sesi login Anda telah kedaluwarsa. Silakan login kembali.');
      }
      const roomCode = generateRoomCode();
      const initialPort = 'SBY';
      // Players are keyed by a persistent client id (from the browser's
      // localStorage), not socket.id - socket.id changes on every reconnect,
      // which used to make the server forget who a player was on refresh or
      // after a server restart. Fall back to a random id defensively if an
      // older client doesn't send one, rather than crashing the room. A
      // verified authToken always wins over the claimed playerId - same
      // reasoning as resolveOfflineSessionId above.
      const id = resolveIdentity(authToken, playerId, () => crypto.randomUUID());

      ROOMS[roomCode] = {
        roomCode,
        week: 1,
        currentPort: initialPort,
        globalCargoPool: generateOrders(initialPort, 1),
        isGameOver: false,
        players: {
          [id]: {
            id,
            name: playerName || 'Host',
            cash: 150000000,
            accumulatedPenalties: 0,
            grid: createEmptyGrid(),
            pendingContainers: [],
            ready: false,
            connected: true,
            performanceLog: [],
            playerRating: null,
            lastWeeklyEvaluation: null
          }
        }
      };

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.playerId = id;

      console.log(`[Room Created] Code: ${roomCode} by ${playerName}`);
      upsertRoomToDb(roomCode);
      socket.emit('room_created', { roomCode, state: ROOMS[roomCode] });
      startTurnTimer(roomCode);

    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('error_message', 'Gagal membuat kamar baru.');
    }
  });

  // 2. Join Room (Players) - also handles reconnects: if this playerId
  // already has a seat in the room (page refresh, dropped connection,
  // server restart that reloaded the room from the database), restore it
  // instead of creating a second player.
  socket.on('join_room', ({ roomCode, playerName, playerId, authToken }) => {
    try {
      if (tokenWasRejected(authToken)) {
        return socket.emit('error_message', 'auth_expired:Sesi login Anda telah kedaluwarsa. Silakan login kembali.');
      }
      const code = roomCode.toUpperCase();
      const room = ROOMS[code];
      const id = resolveIdentity(authToken, playerId, () => crypto.randomUUID());

      if (!room) {
        return socket.emit('error_message', 'Kamar tidak ditemukan. Silakan periksa kembali kode kamar.');
      }
      if (room.isGameOver) {
        return socket.emit('error_message', 'Kamar ini telah menyelesaikan permainan.');
      }

      socket.join(code);
      socket.roomCode = code;
      socket.playerId = id;

      if (room.players[id]) {
        // Reconnect: same player slot, don't touch their cash/grid/progress.
        room.players[id].connected = true;
        console.log(`[Player Reconnected] ${room.players[id].name} rejoined Room ${code}`);
        upsertRoomToDb(code);
      } else {
        if (Object.keys(room.players).length >= 8) {
          return socket.emit('error_message', 'Kamar sudah penuh (maksimal 8 pemain).');
        }
        // New player joining for the first time
        room.players[id] = {
          id,
          name: playerName || `Pemain_${id.substring(0, 4)}`,
          cash: 150000000,
          accumulatedPenalties: 0,
          grid: createEmptyGrid(),
          pendingContainers: [],
          ready: false,
          connected: true,
          performanceLog: [],
          playerRating: null,
          lastWeeklyEvaluation: null
        };
        console.log(`[Player Joined] ${playerName} joined Room ${code}`);
      }

      // Tell the joining/reconnecting socket its own state directly (so it
      // can seed localGrid from `me.grid`, same as create_room's flow) -
      // the room-wide 'room_state' broadcast below carries the full room but
      // doesn't imply "this is you" to the client.
      socket.emit('room_joined', { roomCode: code, state: room });
      broadcastRoomState(code);

      // Sync active countdown timer to the newly connected/reconnected player
      if (ROOM_TIMERS[code]) {
        socket.emit('turn_timer_tick', {
          remainingSeconds: ROOM_TIMERS[code].timerState.remainingSeconds,
          totalSeconds: ROOM_TIMERS[code].timerState.totalSeconds
        });
      }
    } catch (err) {
      console.error('Error joining room:', err);
      socket.emit('error_message', 'Gagal bergabung dengan kamar.');
    }
  });

  // 3. Claim Cargo from Shared Cargo Pool
  socket.on('claim_cargo', ({ orderId }) => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room) return;
    const player = room.players[socket.playerId];
    if (!player) return;

    const orderIndex = room.globalCargoPool.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return socket.emit('error_message', 'Kargo sudah diambil oleh pemain lain.');
    }

    const order = room.globalCargoPool[orderIndex];
    if (order.accepted) {
      return socket.emit('error_message', 'Kargo sudah diambil oleh pemain lain.');
    }

    // Assign kargo to this player (Mark accepted)
    order.accepted = true;
    order.claimedBy = socket.playerId;

    // Remove from shared pool
    room.globalCargoPool.splice(orderIndex, 1);

    // Unpack into containers server-side, from the server's own order data -
    // never trust a client to hand back tariff/type/destination later. This
    // is the same reasoning as the offline claim-cargo endpoint.
    const newContainers = [];
    for (let q = 0; q < order.quantity; q++) {
      newContainers.push({
        id: `${order.id}_cont_${q}`,
        orderId: order.id,
        containerType: order.containerType,
        origin: order.origin,
        destination: order.destination,
        tariff: order.tariff,
        customerType: order.customerType,
        customerName: order.customerName
      });
    }
    player.pendingContainers.push(...newContainers);

    console.log(`[Cargo Claimed] Room: ${roomCode}, Player: ${player.name}, Order: ${orderId}`);

    broadcastRoomState(roomCode);
  });

  // 4. Decline Cargo from Shared Pool (Regular contracts only)
  socket.on('decline_cargo', ({ orderId }) => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room) return;

    const orderIndex = room.globalCargoPool.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = room.globalCargoPool[orderIndex];
    if (order.customerType === 'Committed') {
      return socket.emit('error_message', 'Kontrak Committed wajib diperebutkan, tidak bisa dihapus.');
    }

    // Remove from global pool so no one can take it
    room.globalCargoPool.splice(orderIndex, 1);
    broadcastRoomState(roomCode);
  });

  // 5. Place a claimed container into the acting player's own grid. Mirrors
  // /api/game/offline/place-container's validation exactly - the server
  // owns each player's grid end to end, the client only ever says "place
  // this one container here" and re-renders from the broadcast that follows.
  socket.on('place_container', ({ containerId, bay, row, tier }) => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room) return;
    const player = room.players[socket.playerId];
    if (!player) return;

    const container = player.pendingContainers.find(c => c.id === containerId);
    if (!container) {
      return socket.emit('error_message', 'Kontainer tidak ditemukan di buffer Anda.');
    }
    if (!player.grid[bay] || !player.grid[bay][row] || !(tier in player.grid[bay][row])) {
      return socket.emit('error_message', 'Slot tidak valid.');
    }

    const bayConfig = getBayConfig(bay);
    const stack = player.grid[bay][row];

    if (bayConfig.containerType === 'REEFER' && container.containerType !== 'REEFER') {
      return socket.emit('error_message', `Gagal Memuat: Bay ${bay} khusus slot REEFER.`);
    }
    if (bayConfig.containerType === 'DRY' && container.containerType !== 'DRY') {
      return socket.emit('error_message', `Gagal Memuat: Bay ${bay} khusus slot DRY.`);
    }
    if (stack[tier] !== null) {
      return socket.emit('error_message', 'Slot sudah terisi.');
    }
    if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) {
      return socket.emit('error_message', 'Gagal Memuat: Tidak dapat mengakses underdeck (Tier 02) karena hatch cover terhalang kontainer di atas dek (Tier 82/84).');
    }
    if (tier === '84' && stack['82'] === null) {
      return socket.emit('error_message', 'Kontainer melayang! Anda harus memuat Tier 82 terlebih dahulu.');
    }

    stack[tier] = container;
    player.pendingContainers = player.pendingContainers.filter(c => c.id !== containerId);
    broadcastRoomState(roomCode);
  });

  // 6. Remove a container from the acting player's own grid back into the buffer
  socket.on('remove_container', ({ bay, row, tier }) => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room) return;
    const player = room.players[socket.playerId];
    if (!player) return;
    if (!player.grid[bay] || !player.grid[bay][row]) {
      return socket.emit('error_message', 'Slot tidak valid.');
    }

    const stack = player.grid[bay][row];
    const container = stack[tier];
    if (!container) return;

    if (container.origin !== room.currentPort) {
      return socket.emit('error_message', `Gagal: Kontainer transit dari ${container.origin} dikunci di kapal.`);
    }
    if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) {
      return socket.emit('error_message', 'Tidak dapat membongkar underdeck (Tier 02) saat hatch cover terhalang kontainer di atas dek (Tier 82/84).');
    }
    if (tier === '82' && stack['84'] !== null) {
      return socket.emit('error_message', 'Tidak dapat membongkar Tier 82 saat Tier 84 menampung kontainer di atasnya.');
    }

    stack[tier] = null;
    player.pendingContainers.push(container);
    broadcastRoomState(roomCode);
  });

  // 7. Player Ready - the client sends no grid/pendingContainers anymore;
  // both already live server-side from place_container/remove_container/
  // claim_cargo, so there is nothing left to trust from the request body.
  socket.on('player_ready', () => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room) return;

    const player = room.players[socket.playerId];
    if (!player) return;

    // Defensive final check - every individual placement was already
    // validated, so this should always pass; kept as a safety net.
    const physicsCheck = validateGridPhysics(player.grid);
    if (!physicsCheck.valid) {
      return socket.emit('error_message', `Gagal Berangkat: ${physicsCheck.errors[0]}`);
    }

    player.ready = true;

    console.log(`[Player Ready] ${player.name} in Room ${roomCode}`);

    // Check if all CONNECTED players are ready to sail. A disconnected
    // player no longer gets deleted (see the disconnect handler), so
    // excluding them here is what keeps the room from blocking forever on
    // someone who dropped without leaving.
    const connectedPlayers = Object.values(room.players).filter(p => p.connected);
    const allReady = connectedPlayers.length > 0 && connectedPlayers.every(p => p.ready);

    if (allReady) {
      stopTurnTimer(roomCode);
      executeSailingTransition(roomCode);
    } else {
      broadcastRoomState(roomCode);
    }
  });

  // 8. Player Unready (Cancels ready state)
  socket.on('player_unready', () => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room) return;

    const player = room.players[socket.playerId];
    if (player) {
      player.ready = false;
      broadcastRoomState(roomCode);
    }
  });

  // 9. Leave Room (explicit exit - permanently removes the player, unlike a
  // bare disconnect which keeps their seat for a possible reconnect). Takes
  // an ack callback: emitting this and immediately calling socket.disconnect()
  // can close the transport before the packet is flushed, silently dropping
  // the leave and leaving a "ghost" occupied seat - the client must wait for
  // this ack before disconnecting.
  socket.on('leave_room', (ack) => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room || !socket.playerId) {
      if (typeof ack === 'function') ack();
      return;
    }

    delete room.players[socket.playerId];
    socket.leave(roomCode);
    socket.roomCode = null;

    if (Object.keys(room.players).length === 0) {
      stopTurnTimer(roomCode);
      delete ROOMS[roomCode];
      deleteRoomFromDb(roomCode);
      console.log(`[Room Cleaned] Deleted empty Room ${roomCode}`);
    } else {
      const connectedPlayers = Object.values(room.players).filter(p => p.connected);
      if (connectedPlayers.length > 0 && connectedPlayers.every(p => p.ready)) {
        stopTurnTimer(roomCode);
        executeSailingTransition(roomCode);
      } else {
        broadcastRoomState(roomCode);
      }
    }
    if (typeof ack === 'function') ack();
  });

  // 10. Disconnection handler - a dropped connection (network blip, tab
  // close, refresh) is NOT the same as leaving: it only marks the player
  // disconnected so their cash/grid/progress survive a reconnect (see
  // join_room). Intentional exits go through leave_room instead, which does
  // the actual removal.
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    const roomCode = socket.roomCode;
    if (roomCode && ROOMS[roomCode] && socket.playerId) {
      const room = ROOMS[roomCode];
      const player = room.players[socket.playerId];
      if (!player) return;

      player.connected = false;
      console.log(`[Player Disconnected] ${player.name} in Room ${roomCode} (seat kept for reconnect)`);
      upsertRoomToDb(roomCode);

      // A disconnected player no longer blocks sailing on their own
      // unreadiness, matching the old "removed on disconnect" behaviour.
      const connectedPlayers = Object.values(room.players).filter(p => p.connected);
      if (connectedPlayers.length > 0 && connectedPlayers.every(p => p.ready)) {
        stopTurnTimer(roomCode);
        executeSailingTransition(roomCode);
      } else {
        broadcastRoomState(roomCode);
      }
    }
  });
});

// In-memory multiplayer room turn countdown timers (60s turn limit)
const TURN_DURATION_SECONDS = 60;
const ROOM_TIMERS = {};

const stopTurnTimer = (roomCode) => {
  if (ROOM_TIMERS[roomCode]) {
    clearInterval(ROOM_TIMERS[roomCode].intervalId);
    delete ROOM_TIMERS[roomCode];
  }
};

const startTurnTimer = (roomCode) => {
  stopTurnTimer(roomCode);
  const room = ROOMS[roomCode];
  if (!room || room.isGameOver) return;

  const timerState = {
    remainingSeconds: TURN_DURATION_SECONDS,
    totalSeconds: TURN_DURATION_SECONDS
  };

  io.to(roomCode).emit('turn_timer_tick', {
    remainingSeconds: timerState.remainingSeconds,
    totalSeconds: timerState.totalSeconds
  });

  const intervalId = setInterval(() => {
    const currentRoom = ROOMS[roomCode];
    if (!currentRoom || currentRoom.isGameOver) {
      stopTurnTimer(roomCode);
      return;
    }

    timerState.remainingSeconds -= 1;
    io.to(roomCode).emit('turn_timer_tick', {
      remainingSeconds: timerState.remainingSeconds,
      totalSeconds: timerState.totalSeconds
    });

    if (timerState.remainingSeconds <= 0) {
      console.log(`[Turn Timer Expired] Auto-sailing Room ${roomCode}`);
      stopTurnTimer(roomCode);

      // Auto-ready any connected player who has not clicked ready
      Object.values(currentRoom.players).forEach(p => {
        if (p.connected && !p.ready) {
          p.ready = true;
        }
      });

      executeSailingTransition(roomCode);
    }
  }, 1000);

  ROOM_TIMERS[roomCode] = { intervalId, timerState };
};

// Main integrated sailing physics calculator for multiplayer
const executeSailingTransition = (roomCode) => {
  stopTurnTimer(roomCode);
  const room = ROOMS[roomCode];
  if (!room || room.isGameOver || room.isTransitioning) return;
  room.isTransitioning = true;

  try {
    const currentPort = room.currentPort;
  const currentWeek = room.week;
  const currentPortIndex = PORTS.indexOf(currentPort);
  const nextPort = PORTS[(currentPortIndex + 1) % PORTS.length];

  console.log(`[Sailing Room ${roomCode}] Translating week ${currentWeek} to ${currentWeek + 1}`);

  // Loop through all players to evaluate performance and transition grids
  Object.values(room.players).forEach(player => {
    // 1. Compute Restows
    const restowCheck = calculateRestows(player.grid, currentPort);
    const restowPenaltyTotal = restowCheck.restowMovementsCount * 3000000;

    // 2. Compute Rolling Penalties
    // Unloaded client buffer containers trigger rolling penalty.
    // Also, committed orders that weren't accepted by ANYONE in this port
    // will trigger a penalty divided or applied?
    // In Konsep A: Committed orders are global. If a committed order is left behind in the global pool,
    // who gets penalized?
    // Rules of Konsep A: Committed is a priority contract. To keep it competitive and fair,
    // if a committed order is left in the global pool (unclaimed by anyone), ALL players share the penalty!
    // Or if a player claims a committed order but fails to load it, that specific player gets the penalty.
    // Let's implement:
    // - If player claimed an order (committed/accepted regular) but left some units in player.pendingContainers,
    //   that player gets the rolling penalty.
    // - If a committed order was completely IGNORED (remained in the global pool), all players receive the penalty share,
    //   or the host gets it. To make it a fun competition, let's distribute the ignored committed penalty equally to ALL players!
    
    // Personal rolling checks
    // We construct a mock orders array for calculateRollingPenalties.
    // We only pass orders that this player accepted.
    const personalAcceptedOrders = [];
    
    // Find matching order configurations that this player accepted
    // Since global pool orders were spliced out, we look at the player's pending buffer
    // and grid containers origin.
    // We can reconstruct the order list based on what was claimed.
    // Let's calculate rolling penalties directly:
    let personalRollingPenalty = 0;
    let personalRolledCount = 0;
    const personalRolledList = [];

    // Let's check player.pendingContainers (leftovers)
    if (player.pendingContainers && player.pendingContainers.length > 0) {
      // Group by orderId
      const grouped = {};
      player.pendingContainers.forEach(c => {
        grouped[c.orderId] = (grouped[c.orderId] || 0) + 1;
      });

      Object.keys(grouped).forEach(orderId => {
        const missingCount = grouped[orderId];
        const isCommitted = orderId.includes('Committed') || player.pendingContainers.find(c => c.orderId === orderId)?.customerType === 'Committed';
        const containerType = player.pendingContainers.find(c => c.orderId === orderId)?.containerType || 'DRY';
        
        let penaltyPerUnit = 0;
        if (isCommitted) {
          penaltyPerUnit = containerType === 'DRY' ? 16000000 : 24000000;
        } else {
          // Non-Committed accepted but not loaded
          penaltyPerUnit = containerType === 'DRY' ? 8000000 : 16000000;
        }

        const penalty = missingCount * penaltyPerUnit;
        personalRollingPenalty += penalty;
        personalRolledCount += missingCount;

        personalRolledList.push({
          orderId,
          customerName: player.pendingContainers.find(c => c.orderId === orderId)?.customerName || 'Pelanggan',
          customerType: isCommitted ? 'Committed' : 'Non-Committed',
          containerType,
          missingCount,
          penaltyPerUnit,
          totalPenalty: penalty
        });
      });
    }

    // Shared ignored Committed penalty:
    // Look at room.globalCargoPool for any Committed cargo left behind.
    let sharedCommittedPenalty = 0;
    room.globalCargoPool.forEach(order => {
      if (order.customerType === 'Committed') {
        const penaltyPerUnit = order.containerType === 'DRY' ? 16000000 : 24000000;
        const totalPenalty = order.quantity * penaltyPerUnit;
        // Share equally among all players
        const numPlayers = Object.keys(room.players).length;
        const share = Math.floor(totalPenalty / numPlayers);
        sharedCommittedPenalty += share;

        personalRolledList.push({
          orderId: order.id,
          customerName: `${order.customerName} (Bersama)`,
          customerType: 'Committed (Terabaikan)',
          containerType: order.containerType,
          missingCount: order.quantity,
          penaltyPerUnit: Math.floor(penaltyPerUnit / numPlayers),
          totalPenalty: share
        });
      }
    });

    const totalRollingPenalty = personalRollingPenalty + sharedCommittedPenalty;
    const totalWeeklyPenalties = restowPenaltyTotal + totalRollingPenalty;

    // 3. Compute Gross Revenue (discharge recognition - paid when a container
    // reaches its destination, matching the offline path; see gameEngine.js)
    const grossRevenue = calculateDischargeRevenue(player.grid, nextPort);
    const netIncome = grossRevenue - totalWeeklyPenalties;

    // Calculate terminal handling moves (Bongkar, Muat, Shifting)
    const dischargedCount = calculateDischargeCount(player.grid, nextPort);
    let loadedCount = 0;
    Object.keys(player.grid).forEach(b => {
      Object.keys(player.grid[b]).forEach(r => {
        Object.keys(player.grid[b][r]).forEach(t => {
          const c = player.grid[b][r][t];
          if (c && c.origin === currentPort) loadedCount++;
        });
      });
    });
    const restowMovements = restowCheck.restowContainersCount * 2;
    const totalCraneMoves = dischargedCount + loadedCount + restowMovements;

    // 4. Update player state
    player.cash += netIncome;
    player.accumulatedPenalties += totalWeeklyPenalties;

    // 5. Unload next port containers and execute slide-down
    const transitionedGrid = processSailingTransition(player.grid, nextPort);
    player.grid = transitionedGrid;
    player.ready = false; // Reset ready state

    // 6. Record Weekly Evaluation
    const weeklyEvaluation = {
      week: currentWeek,
      port: currentPort,
      rolledCount: personalRolledCount,
      rollingPenalty: totalRollingPenalty,
      restowCount: restowCheck.restowContainersCount,
      restowMovements,
      restowPenalty: restowPenaltyTotal,
      dischargedCount,
      loadedCount,
      totalCraneMoves,
      grossRevenue,
      netIncome,
      cashSnapshot: player.cash,
      accumulatedPenaltiesSnapshot: player.accumulatedPenalties,
      rolledDetails: personalRolledList,
      restowDetails: restowCheck.restowedList
    };

    player.performanceLog.push(weeklyEvaluation);
    player.lastWeeklyEvaluation = weeklyEvaluation;
    player.pendingContainers = []; // Clear pending buffer
  });

  // Advance Room State
  room.week += 1;
  room.currentPort = nextPort;

  // Check game over
  if (room.week > 8) {
    room.isGameOver = true;
    
    // Evaluate rating for all players and record each on the leaderboard -
    // online has no bots, so every player here is a real captain.
    Object.values(room.players).forEach(player => {
      const rating = computePlayerRating(player.cash);
      player.playerRating = rating;
      recordLeaderboardEntry(player.name, player.cash, player.accumulatedPenalties, rating, 'ONLINE');
    });

    console.log(`[Game Over Room ${roomCode}] Closed sirkuit.`);
  } else {
    // Generate new shared orders for the room
    room.globalCargoPool = generateOrders(room.currentPort, room.week);
  }

  // Broadcast the fresh room state & tell clients sailing is complete
  upsertRoomToDb(roomCode);
  io.to(roomCode).emit('sailing_completed', room);

  // Restart turn countdown for the next week if game is still active
  if (!room.isGameOver) {
    startTurnTimer(roomCode);
  }
  } finally {
    room.isTransitioning = false;
  }
};


/**
 * REST API Endpoints for Mabar Offline (Pass-and-Play vs Bots).
 *
 * The server owns the session end to end: cash, grid, cargo pools and
 * pending buffers all live in OFFLINE_SESSIONS, keyed by the browser's
 * persistent client id. Every route below reads and mutates that server-side
 * copy - none of them accept cash, tariffs, or grid contents from the
 * client. The client only ever sends "do this one action" and renders
 * whatever session state comes back.
 */

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

// Distinguishes "a token was sent but is expired/tampered" from "no token at
// all" (a guest). The former means the client THINKS it's logged in and
// will otherwise just see confusing "session not found" errors on every
// action forever - this lets it detect the real cause and prompt a
// re-login instead. Returns true once it has already sent the response.
const rejectIfAuthExpired = (req, res) => {
  if (tokenWasRejected(getBearerToken(req))) {
    res.status(401).json({ success: false, authExpired: true, message: 'Sesi login Anda telah kedaluwarsa. Silakan login kembali.' });
    return true;
  }
  return false;
};

// A logged-in user's Authorization: Bearer token always determines the
// session id (as `user_<id>`), overriding whatever sessionId the client body
// claims - otherwise anyone could act as "user_5"'s saved game by simply
// sending that string, no password required. Guests fall back to their
// client-generated anonymous id, exactly as before accounts existed.
const resolveOfflineSessionId = (req) => resolveIdentity(getBearerToken(req), req.body?.sessionId || null);

const findOfflineSession = (req, res) => {
  if (rejectIfAuthExpired(req, res)) return null;
  const sessionId = resolveOfflineSessionId(req);
  const session = sessionId ? OFFLINE_SESSIONS[sessionId] : null;
  if (!session) {
    res.status(404).json({ success: false, message: 'Sesi permainan tidak ditemukan. Silakan mulai permainan baru.' });
    return null;
  }
  return session;
};

// 0. Resume check - looks up an in-progress session without creating one.
// "Keluar" only resets the client's local view; it never deletes the
// server-side session, so leaving mid-game and coming back finds it here.
app.post('/api/game/offline/resume', (req, res) => {
  try {
    if (rejectIfAuthExpired(req, res)) return;
    const sessionId = resolveOfflineSessionId(req);
    const session = sessionId ? OFFLINE_SESSIONS[sessionId] : null;
    if (!session || session.isGameOver) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error checking offline resume:', error);
    res.status(500).json({ success: false, message: 'Internal server error checking session.' });
  }
});

// 1. Start - always creates a fresh session under this sessionId, overwriting
// any in-progress one. This is the deliberate "Mulai Baru" action; resuming
// an abandoned session goes through /resume above instead.
app.post('/api/game/offline/start', (req, res) => {
  try {
    if (rejectIfAuthExpired(req, res)) return;
    const { playerName, seed } = req.body || {};
    const sessionId = resolveOfflineSessionId(req);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId wajib dikirim.' });
    }

    const bays = OFFLINE_BAYS_BY_LEVEL[1];
    const orders = generateOrders('SBY', 1, PORTS, rngForPortCall(seed, 1, 'SBY'));

    const players = [
      {
        id: 0,
        name: playerName || 'Kapten User',
        isBot: false,
        cash: OFFLINE_START_CASH,
        accumulatedPenalties: 0,
        cumulativeGrossRevenue: 0,
        pendingContainers: [],
        ready: false,
        performanceLog: [],
        playerRating: null,
        lastWeeklyEvaluation: null,
        cargoPool: orders
      },
      ...DEFAULT_BOT_PROFILES.map((bot, idx) => ({
        id: idx + 1,
        name: bot.name,
        isBot: true,
        personality: bot.personality,
        avatar: bot.avatar,
        description: bot.description,
        cash: OFFLINE_START_CASH,
        accumulatedPenalties: 0,
        cumulativeGrossRevenue: 0,
        pendingContainers: [],
        ready: false,
        performanceLog: [],
        playerRating: null,
        lastWeeklyEvaluation: null,
        cargoPool: [],
        grid: createEmptyGrid(bays)
      }))
    ];

    const session = {
      sessionId,
      week: 1,
      currentPort: 'SBY',
      activePorts: [...PORTS],
      vesselLevel: 1,
      sharedGrid: createEmptyGrid(bays),
      players,
      isGameOver: false,
      seed: seed ?? null
    };

    OFFLINE_SESSIONS[sessionId] = session;
    persistOfflineSession(session);

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error starting offline game:', error);
    res.status(500).json({ success: false, message: 'Internal server error starting game.' });
  }
});

// 2. Claim cargo from the active (human) player's private pool
app.post('/api/game/offline/claim-cargo', (req, res) => {
  try {
    const session = findOfflineSession(req, res);
    if (!session) return;
    if (session.isGameOver) {
      return res.status(400).json({ success: false, message: 'Permainan sudah selesai.' });
    }
    const { orderId } = req.body || {};

    const player = session.players[getOfflineActivePlayerIndex(session)];
    if (player.isBot) {
      return res.status(400).json({ success: false, message: 'Giliran bot - tidak bisa mengklaim kargo secara manual.' });
    }

    const orderIndex = player.cargoPool.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(400).json({ success: false, message: 'Kontrak tidak ditemukan di pasar kargo Anda.' });
    }
    const order = player.cargoPool[orderIndex];

    const newContainers = [];
    for (let q = 0; q < order.quantity; q++) {
      newContainers.push({
        id: `${order.id}_cont_${q}`,
        orderId: order.id,
        containerType: order.containerType,
        origin: order.origin,
        destination: order.destination,
        tariff: order.tariff,
        customerType: order.customerType,
        customerName: order.customerName
      });
    }
    player.pendingContainers.push(...newContainers);
    player.cargoPool.splice(orderIndex, 1);

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error claiming offline cargo:', error);
    res.status(500).json({ success: false, message: 'Internal server error claiming cargo.' });
  }
});

// 3. Decline cargo from the active (human) player's private pool
app.post('/api/game/offline/decline-cargo', (req, res) => {
  try {
    const session = findOfflineSession(req, res);
    if (!session) return;
    if (session.isGameOver) {
      return res.status(400).json({ success: false, message: 'Permainan sudah selesai.' });
    }
    const { orderId } = req.body || {};

    const player = session.players[getOfflineActivePlayerIndex(session)];
    if (player.isBot) {
      return res.status(400).json({ success: false, message: 'Giliran bot - tidak bisa menolak kargo secara manual.' });
    }

    const orderIndex = player.cargoPool.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return res.json({ success: true, data: session });

    const order = player.cargoPool[orderIndex];
    if (order.customerType === 'Committed') {
      return res.status(400).json({ success: false, message: 'Kontrak Committed wajib dikerjakan.' });
    }
    player.cargoPool.splice(orderIndex, 1);

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error declining offline cargo:', error);
    res.status(500).json({ success: false, message: 'Internal server error declining cargo.' });
  }
});

// 4. Place a claimed container into the shared grid
app.post('/api/game/offline/place-container', (req, res) => {
  try {
    const session = findOfflineSession(req, res);
    if (!session) return;
    if (session.isGameOver) {
      return res.status(400).json({ success: false, message: 'Permainan sudah selesai.' });
    }
    const { containerId, bay, row, tier } = req.body || {};

    const player = session.players[getOfflineActivePlayerIndex(session)];
    if (player.isBot) {
      return res.status(400).json({ success: false, message: 'Giliran bot - tidak bisa menyusun kontainer secara manual.' });
    }

    const container = player.pendingContainers.find(c => c.id === containerId);
    if (!container) {
      return res.status(400).json({ success: false, message: 'Kontainer tidak ditemukan di buffer Anda.' });
    }
    if (!session.sharedGrid[bay] || !session.sharedGrid[bay][row] || !(tier in session.sharedGrid[bay][row])) {
      return res.status(400).json({ success: false, message: 'Slot tidak valid.' });
    }

    const bayConfig = getBayConfig(bay);
    const stack = session.sharedGrid[bay][row];

    if (bayConfig.containerType === 'REEFER' && container.containerType !== 'REEFER') {
      return res.status(400).json({ success: false, message: `Gagal Memuat: Bay ${bay} khusus slot REEFER.` });
    }
    if (bayConfig.containerType === 'DRY' && container.containerType !== 'DRY') {
      return res.status(400).json({ success: false, message: `Gagal Memuat: Bay ${bay} khusus slot DRY.` });
    }
    if (stack[tier] !== null) {
      return res.status(400).json({ success: false, message: 'Slot sudah terisi.' });
    }
    if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) {
      return res.status(400).json({ success: false, message: 'Gagal Memuat: Tidak dapat mengakses underdeck (Tier 02) karena hatch cover terhalang kontainer di atas dek (Tier 82/84).' });
    }
    if (tier === '84' && stack['82'] === null) {
      return res.status(400).json({ success: false, message: 'Kontainer melayang! Anda harus memuat Tier 82 terlebih dahulu.' });
    }

    stack[tier] = container;
    player.pendingContainers = player.pendingContainers.filter(c => c.id !== containerId);

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error placing offline container:', error);
    res.status(500).json({ success: false, message: 'Internal server error placing container.' });
  }
});

// 5. Remove a container from the shared grid back into the buffer
app.post('/api/game/offline/remove-container', (req, res) => {
  try {
    const session = findOfflineSession(req, res);
    if (!session) return;
    if (session.isGameOver) {
      return res.status(400).json({ success: false, message: 'Permainan sudah selesai.' });
    }
    const { bay, row, tier } = req.body || {};

    const player = session.players[getOfflineActivePlayerIndex(session)];
    if (player.isBot) {
      return res.status(400).json({ success: false, message: 'Giliran bot - tidak bisa membongkar kontainer secara manual.' });
    }
    if (!session.sharedGrid[bay] || !session.sharedGrid[bay][row]) {
      return res.status(400).json({ success: false, message: 'Slot tidak valid.' });
    }

    const stack = session.sharedGrid[bay][row];
    const container = stack[tier];
    if (!container) {
      return res.json({ success: true, data: session });
    }
    if (container.origin !== session.currentPort) {
      return res.status(400).json({ success: false, message: `Gagal: Kontainer transit dari ${container.origin} dikunci di kapal.` });
    }
    if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) {
      return res.status(400).json({ success: false, message: 'Tidak dapat membongkar underdeck (Tier 02) saat hatch cover terhalang kontainer di atas dek (Tier 82/84).' });
    }
    if (tier === '82' && stack['84'] !== null) {
      return res.status(400).json({ success: false, message: 'Tidak dapat membongkar Tier 82 saat Tier 84 menampung kontainer di atasnya.' });
    }

    stack[tier] = null;
    player.pendingContainers.push(container);

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error removing offline container:', error);
    res.status(500).json({ success: false, message: 'Internal server error removing container.' });
  }
});

// 6. Upgrade vessel - cash check and deduction now happen against the
// server's own ledger, not a number the client sent.
app.post('/api/game/offline/upgrade-vessel', (req, res) => {
  try {
    const session = findOfflineSession(req, res);
    if (!session) return;
    if (session.isGameOver) {
      return res.status(400).json({ success: false, message: 'Permainan sudah selesai.' });
    }

    const nextLevel = session.vesselLevel + 1;
    if (nextLevel > 3) {
      return res.status(400).json({ success: false, message: 'Kapal Anda sudah mencapai ukuran maksimal (Besar)!' });
    }
    const cost = OFFLINE_UPGRADE_COST[nextLevel];

    const player = session.players[getOfflineActivePlayerIndex(session)];
    if (player.cash < cost) {
      return res.status(400).json({ success: false, message: `Saldo tidak cukup! Biaya upgrade ke Kapal Level ${nextLevel} adalah Rp ${cost.toLocaleString('id-ID')}.` });
    }

    player.cash -= cost;

    const nextBays = OFFLINE_BAYS_BY_LEVEL[nextLevel];
    const newGrid = createEmptyGrid(nextBays);
    Object.keys(session.sharedGrid).forEach(bay => {
      if (newGrid[bay]) newGrid[bay] = session.sharedGrid[bay];
    });

    session.sharedGrid = newGrid;
    session.vesselLevel = nextLevel;

    // Synchronize bot benchmark vessel grids to the upgraded capacity
    session.players.slice(1).forEach(bot => {
      if (bot.grid) {
        const botNewGrid = createEmptyGrid(nextBays);
        Object.keys(bot.grid).forEach(bay => {
          if (botNewGrid[bay]) botNewGrid[bay] = bot.grid[bay];
        });
        bot.grid = botNewGrid;
      }
    });

    persistOfflineSession(session);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error upgrading offline vessel:', error);
    res.status(500).json({ success: false, message: 'Internal server error upgrading vessel.' });
  }
});

// 7. Depart - processes the sailing transition for the whole session. Takes
// only a sessionId; every figure it uses (cash, grid, cargo, penalties)
// comes from the server's own OFFLINE_SESSIONS entry.
app.post('/api/game/offline/depart', (req, res) => {
  try {
    const session = findOfflineSession(req, res);
    if (!session) return;
    if (session.isGameOver) {
      return res.status(400).json({ success: false, message: 'Permainan sudah selesai.' });
    }

    const { week, currentPort, players, activePorts: currentActivePorts, seed } = session;
    const sharedGrid = session.sharedGrid;

    const currentPortIndex = currentActivePorts.indexOf(currentPort);
    const nextPort = currentActivePorts[(currentPortIndex + 1) % currentActivePorts.length];
    const nextWeek = week + 1;
    const isGameOver = nextWeek > 8;
    const nextOrders = isGameOver
      ? []
      : generateOrders(nextPort, nextWeek, currentActivePorts, rngForPortCall(seed, nextWeek, nextPort));

    // Current port orders for AI benchmarks
    const currentPortOrders = generateOrders(currentPort, week, currentActivePorts, rngForPortCall(seed, week, currentPort));

    // 1. Validate physics for Human player's sharedGrid
    const physicsCheck = validateGridPhysics(sharedGrid);
    if (!physicsCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `Kesalahan Fisika Kapal: ${physicsCheck.errors[0]}`
      });
    }

    const humanPlayer = players[0];

    // 2. Compute Restows on human's grid
    const humanRestowCheck = calculateRestows(sharedGrid, currentPort, currentActivePorts);
    const humanRestowMovements = humanRestowCheck.restowMovementsCount;
    const humanRestowPenalty = humanRestowMovements * 3000000;

    // 3. Compute Personal Rolling Penalties for human player
    let humanRollingPenalty = 0;
    let humanRolledCount = 0;
    const humanRolledList = [];

    const humanPending = humanPlayer.pendingContainers || [];
    if (humanPending.length > 0) {
      const grouped = {};
      humanPending.forEach(c => {
        grouped[c.orderId] = (grouped[c.orderId] || 0) + 1;
      });

      Object.keys(grouped).forEach(orderId => {
        const missingCount = grouped[orderId];
        const isCommitted = orderId.includes('Committed') || humanPending.find(c => c.orderId === orderId)?.customerType === 'Committed';
        const containerType = humanPending.find(c => c.orderId === orderId)?.containerType || 'DRY';
        
        let penaltyPerUnit = 0;
        if (isCommitted) {
          penaltyPerUnit = containerType === 'DRY' ? 16000000 : 24000000;
        } else {
          penaltyPerUnit = containerType === 'DRY' ? 8000000 : 16000000;
        }

        const penalty = missingCount * penaltyPerUnit;
        humanRollingPenalty += penalty;
        humanRolledCount += missingCount;

        humanRolledList.push({
          orderId,
          customerName: humanPending.find(c => c.orderId === orderId)?.customerName || 'Pelanggan',
          customerType: isCommitted ? 'Committed' : 'Non-Committed',
          containerType,
          missingCount,
          penaltyPerUnit,
          totalPenalty: penalty
        });
      });
    }

    // Check ignored committed orders in human's cargoPool
    const humanPool = humanPlayer.cargoPool || [];
    humanPool.forEach(order => {
      if (order.customerType === 'Committed') {
        const penaltyPerUnit = order.containerType === 'DRY' ? 16000000 : 24000000;
        const totalPenalty = order.quantity * penaltyPerUnit;
        humanRollingPenalty += totalPenalty;

        humanRolledList.push({
          orderId: order.id,
          customerName: `${order.customerName}`,
          customerType: 'Committed (Terabaikan)',
          containerType: order.containerType,
          missingCount: order.quantity,
          penaltyPerUnit,
          totalPenalty
        });
      }
    });

    const humanTotalWeeklyPenalties = humanRestowPenalty + humanRollingPenalty;

    // 4. Calculate earned discharge revenue and crane moves for human player
    const humanDischargedCount = calculateDischargeCount(sharedGrid, nextPort);
    const humanDischargeRevenue = calculateDischargeRevenue(sharedGrid, nextPort);

    let humanLoadedCount = 0;
    Object.keys(sharedGrid).forEach(b => {
      Object.keys(sharedGrid[b]).forEach(r => {
        Object.keys(sharedGrid[b][r]).forEach(t => {
          const c = sharedGrid[b][r][t];
          if (c && c.origin === currentPort) humanLoadedCount++;
        });
      });
    });

    const humanTotalCraneMoves = humanDischargedCount + humanLoadedCount + humanRestowMovements;
    const humanNetIncome = humanDischargeRevenue - humanTotalWeeklyPenalties;

    const humanNewCash = humanPlayer.cash + humanNetIncome;
    const humanNewPenalties = humanPlayer.accumulatedPenalties + humanTotalWeeklyPenalties;
    const humanNewRevenue = (humanPlayer.cumulativeGrossRevenue || 0) + humanDischargeRevenue;

    const humanEvaluation = {
      week,
      port: currentPort,
      rolledCount: humanRolledCount,
      rollingPenalty: humanRollingPenalty,
      restowCount: humanRestowCheck.restowContainersCount,
      restowMovements: humanRestowMovements,
      restowPenalty: humanRestowPenalty,
      dischargedCount: humanDischargedCount,
      loadedCount: humanLoadedCount,
      totalCraneMoves: humanTotalCraneMoves,
      grossRevenue: humanDischargeRevenue,
      netIncome: humanNetIncome,
      cashSnapshot: humanNewCash,
      accumulatedPenaltiesSnapshot: humanNewPenalties,
      rolledDetails: humanRolledList,
      restowDetails: humanRestowCheck.restowedList
    };

    const updatedHumanPlayer = {
      ...humanPlayer,
      cash: humanNewCash,
      accumulatedPenalties: humanNewPenalties,
      cumulativeGrossRevenue: humanNewRevenue,
      ready: false,
      pendingContainers: [],
      performanceLog: [...(humanPlayer.performanceLog || []), humanEvaluation],
      lastWeeklyEvaluation: humanEvaluation,
      cargoPool: isGameOver ? [] : JSON.parse(JSON.stringify(nextOrders))
    };

    // Transition human grid (discharge nextPort + slide down)
    const transitionedHumanGrid = processSailingTransition(sharedGrid, nextPort);

    // 5. Simulate AI Benchmark Bots in parallel on their own vessels
    const bays = OFFLINE_BAYS_BY_LEVEL[session.vesselLevel || 1];
    const updatedBotPlayers = players.slice(1).map((bot, idx) => {
      let botGrid = bot.grid ? JSON.parse(JSON.stringify(bot.grid)) : createEmptyGrid(bays);
      bot.cargoPool = JSON.parse(JSON.stringify(currentPortOrders));
      bot.pendingContainers = bot.pendingContainers || [];

      // Process bot cargo selection & stowage
      botGrid = processBotTurn(
        bot,
        botGrid,
        currentPort,
        currentActivePorts,
        rngForPortCall(seed, week, `bot_${bot.personality}_${idx}`)
      );

      // Evaluate bot restows
      const bRestowCheck = calculateRestows(botGrid, currentPort, currentActivePorts);
      const bRestowMovements = bRestowCheck.restowMovementsCount;
      const bRestowPenalty = bRestowMovements * 3000000;

      // Evaluate bot rolling penalties
      let bRollingPenalty = 0;
      (bot.pendingContainers || []).forEach(c => {
        const isComm = c.customerType === 'Committed';
        bRollingPenalty += isComm ? (c.containerType === 'DRY' ? 16000000 : 24000000) : (c.containerType === 'DRY' ? 8000000 : 16000000);
      });
      (bot.cargoPool || []).forEach(o => {
        if (o.customerType === 'Committed') {
          bRollingPenalty += o.quantity * (o.containerType === 'DRY' ? 16000000 : 24000000);
        }
      });

      const bTotalPenalties = bRestowPenalty + bRollingPenalty;
      const bDischargeRev = calculateDischargeRevenue(botGrid, nextPort);
      const bNetIncome = bDischargeRev - bTotalPenalties;
      const bNewCash = bot.cash + bNetIncome;
      const bNewPenalties = bot.accumulatedPenalties + bTotalPenalties;
      const bNewRevenue = (bot.cumulativeGrossRevenue || 0) + bDischargeRev;

      // Transition bot grid
      const bTransitionedGrid = processSailingTransition(botGrid, nextPort);

      const bEvaluation = {
        week,
        port: currentPort,
        grossRevenue: bDischargeRev,
        restowPenalty: bRestowPenalty,
        rollingPenalty: bRollingPenalty,
        netIncome: bNetIncome,
        cashSnapshot: bNewCash
      };

      return {
        ...bot,
        cash: bNewCash,
        accumulatedPenalties: bNewPenalties,
        cumulativeGrossRevenue: bNewRevenue,
        pendingContainers: [],
        cargoPool: [],
        grid: bTransitionedGrid,
        performanceLog: [...(bot.performanceLog || []), bEvaluation],
        lastWeeklyEvaluation: bEvaluation
      };
    });

    let finalPlayers = [updatedHumanPlayer, ...updatedBotPlayers];

    if (isGameOver) {
      finalPlayers = finalPlayers.map(player => {
        const rating = computePlayerRating(player.cash);
        if (!player.isBot) {
          recordLeaderboardEntry(player.name, player.cash, player.accumulatedPenalties, rating, 'OFFLINE');
        }
        return {
          ...player,
          playerRating: rating
        };
      });
    }

    // Write the results back into the server's own session and persist.
    session.week = nextWeek;
    session.currentPort = nextPort;
    session.activePorts = PORTS;
    session.sharedGrid = transitionedHumanGrid;
    session.players = finalPlayers;
    session.isGameOver = isGameOver;

    persistOfflineSession(session);

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Error processing offline sail:', error);
    res.status(500).json({ success: false, message: 'Internal server error processing sailing.' });
  }
});

// Start listening
httpServer.listen(PORT, async () => {
  console.log(`===================================================`);
  console.log(`  SPIL Multiplayer Server running on port ${PORT} `);
  console.log(`===================================================`);
  await initializeDatabase();
  await loadRoomsFromDb();
  await loadSessionsFromDb();
});

