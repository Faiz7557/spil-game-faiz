import express from 'express';
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
  calculateGrossRevenue,
  processSailingTransition
} from './utils/gameEngine.js';
import { query } from './utils/db.js';
import { initializeDatabase } from './utils/initDb.js';


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

// Helper to generate a unique 4-character room code
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

// Helper to clean up empty rooms or send status updates
const broadcastRoomState = (roomCode) => {
  const room = ROOMS[roomCode];
  if (!room) return;
  io.to(roomCode).emit('room_state', room);
  upsertRoomToDb(roomCode);
};

// Database CRUD Helpers for Multiplayer Rooms & Sessions
const loadRoomsFromDb = async () => {
  try {
    const res = await query(`SELECT * FROM rooms WHERE is_game_over = FALSE`);
    res.rows.forEach(row => {
      ROOMS[row.room_code] = {
        roomCode: row.room_code,
        week: row.week,
        currentPort: row.current_port,
        globalCargoPool: typeof row.global_cargo_pool === 'string' ? JSON.parse(row.global_cargo_pool) : row.global_cargo_pool,
        isGameOver: row.is_game_over,
        players: typeof row.players === 'string' ? JSON.parse(row.players) : row.players
      };
    });
    console.log(`[Database] Loaded ${res.rows.length} active room(s) from PostgreSQL into memory.`);
  } catch (err) {
    console.error('[Database] Failed loading active rooms from DB:', err.message || err);
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
      sessionData.isGameOver || false
    ]);
  } catch (err) {
    console.error(`[Database] Error saving session ${sessionId}:`, err.message || err);
  }
};


// Express REST API fallback (optional health checks)
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', roomsConnected: Object.keys(ROOMS).length });
});

// WebSocket Real-time controllers
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // 1. Create Room (Host)
  socket.on('create_room', ({ playerName }) => {
    try {
      const roomCode = generateRoomCode();
      const initialPort = 'SBY';
      
      ROOMS[roomCode] = {
        roomCode,
        week: 1,
        currentPort: initialPort,
        globalCargoPool: generateOrders(initialPort, 1),
        isGameOver: false,
        players: {
          [socket.id]: {
            id: socket.id,
            name: playerName || 'Host',
            cash: 150000000,
            accumulatedPenalties: 0,
            grid: createEmptyGrid(),
            ready: false,
            performanceLog: [],
            playerRating: null,
            lastWeeklyEvaluation: null
          }
        }
      };

      socket.join(roomCode);
      socket.roomCode = roomCode;
      
      console.log(`[Room Created] Code: ${roomCode} by ${playerName}`);
      upsertRoomToDb(roomCode);
      socket.emit('room_created', { roomCode, state: ROOMS[roomCode] });

    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('error_message', 'Gagal membuat kamar baru.');
    }
  });

  // 2. Join Room (Players)
  socket.on('join_room', ({ roomCode, playerName }) => {
    try {
      const code = roomCode.toUpperCase();
      const room = ROOMS[code];
      
      if (!room) {
        return socket.emit('error_message', 'Kamar tidak ditemukan. Silakan periksa kembali kode kamar.');
      }
      if (room.isGameOver) {
        return socket.emit('error_message', 'Kamar ini telah menyelesaikan permainan.');
      }
      if (Object.keys(room.players).length >= 8) {
        return socket.emit('error_message', 'Kamar sudah penuh (maksimal 8 pemain).');
      }

      // Add player to the room state
      room.players[socket.id] = {
        id: socket.id,
        name: playerName || `Pemain_${socket.id.substring(0, 4)}`,
        cash: 150000000,
        accumulatedPenalties: 0,
        grid: createEmptyGrid(),
        ready: false,
        performanceLog: [],
        playerRating: null,
        lastWeeklyEvaluation: null
      };

      socket.join(code);
      socket.roomCode = code;

      console.log(`[Player Joined] ${playerName} joined Room ${code}`);
      broadcastRoomState(code);
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
    order.claimedBy = socket.id;

    // Remove from shared pool
    room.globalCargoPool.splice(orderIndex, 1);

    console.log(`[Cargo Claimed] Room: ${roomCode}, Player: ${room.players[socket.id].name}, Order: ${orderId}`);
    
    // Notify claimant and update others
    socket.emit('cargo_claimed_success', order);
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

  // 5. Player Ready (Sends current grid configuration & pending buffer leftovers)
  socket.on('player_ready', ({ grid, pendingContainers }) => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    // Validate physical constraints first
    const physicsCheck = validateGridPhysics(grid);
    if (!physicsCheck.valid) {
      return socket.emit('error_message', `Gagal Berangkat: ${physicsCheck.errors[0]}`);
    }

    // Commit state
    player.grid = grid;
    player.pendingContainers = pendingContainers; // Kept in memory to compute rolling penalties
    player.ready = true;

    console.log(`[Player Ready] ${player.name} in Room ${roomCode}`);

    // Check if ALL players are ready to sail
    const allPlayers = Object.values(room.players);
    const allReady = allPlayers.every(p => p.ready);

    if (allReady) {
      executeSailingTransition(roomCode);
    } else {
      broadcastRoomState(roomCode);
    }
  });

  // 6. Player Unready (Cancels ready state)
  socket.on('player_unready', () => {
    const roomCode = socket.roomCode;
    const room = ROOMS[roomCode];
    if (!room) return;

    const player = room.players[socket.id];
    if (player) {
      player.ready = false;
      broadcastRoomState(roomCode);
    }
  });

  // 7. Disconnection handler
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    const roomCode = socket.roomCode;
    if (roomCode && ROOMS[roomCode]) {
      const room = ROOMS[roomCode];
      delete room.players[socket.id];
      console.log(`[Player Left] Removed player from Room ${roomCode}`);

      // If room is empty, clean it up
      if (Object.keys(room.players).length === 0) {
        delete ROOMS[roomCode];
        deleteRoomFromDb(roomCode);
        console.log(`[Room Cleaned] Deleted empty Room ${roomCode}`);
      } else {

        // Check if remaining players are all ready
        const allPlayers = Object.values(room.players);
        const allReady = allPlayers.every(p => p.ready);
        if (allReady) {
          executeSailingTransition(roomCode);
        } else {
          broadcastRoomState(roomCode);
        }
      }
    }
  });
});

// Main integrated sailing physics calculator for multiplayer
const executeSailingTransition = (roomCode) => {
  const room = ROOMS[roomCode];
  if (!room) return;

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
          // Regular accepted but not loaded
          penaltyPerUnit = containerType === 'DRY' ? 8000000 : 16000000;
        }

        const penalty = missingCount * penaltyPerUnit;
        personalRollingPenalty += penalty;
        personalRolledCount += missingCount;

        personalRolledList.push({
          orderId,
          customerName: player.pendingContainers.find(c => c.orderId === orderId)?.customerName || 'Pelanggan',
          customerType: isCommitted ? 'Committed' : 'Regular',
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

    // 3. Compute Gross Revenue
    const grossRevenue = calculateGrossRevenue(player.grid, currentPort);
    const netIncome = grossRevenue - totalWeeklyPenalties;

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
      restowPenalty: restowPenaltyTotal,
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
    
    // Evaluate rating for all players
    Object.values(room.players).forEach(player => {
      let rating = 'Perwira Logistik Junior';
      if (player.cash >= 300000000) {
        rating = 'VP Operasi Logistik & Stowage';
      } else if (player.cash >= 200000000) {
        rating = 'Spesialis Stowage Pelabuhan Senior';
      } else if (player.cash >= 100000000) {
        rating = 'Koordinator Logistik Standar';
      } else if (player.cash < 0) {
        rating = 'Supervisor Terminal Bangkrut';
      }
      player.playerRating = rating;
    });
    
    console.log(`[Game Over Room ${roomCode}] Closed sirkuit.`);
  } else {
    // Generate new shared orders for the room
    room.globalCargoPool = generateOrders(room.currentPort, room.week);
  }

  // Broadcast the fresh room state & tell clients sailing is complete
  upsertRoomToDb(roomCode);
  io.to(roomCode).emit('sailing_completed', room);
};


/**
 * REST API Endpoint to initialize/start an offline session.
 * Generates and returns the initial cargo orders for SBY Week 1.
 */
app.post('/api/game/start', (req, res) => {
  try {
    const orders = generateOrders('SBY', 1);
    res.json({
      success: true,
      data: {
        orders
      }
    });
  } catch (error) {
    console.error('Error starting offline game:', error);
    res.status(500).json({ success: false, message: 'Internal server error starting game.' });
  }
});

/**
 * REST API Endpoint for Mabar Offline (Pass-and-Play)
 * Receives the current offline room state and processes sailing transitions for all 4 local players.
 */
app.post('/api/game/depart-offline', (req, res) => {
  try {
    const { week, currentPort, players, sharedGrid, activePorts } = req.body;
    
    if (!players || !Array.isArray(players) || players.length === 0 || !sharedGrid) {
      return res.status(400).json({ success: false, message: 'Data permainan tidak valid.' });
    }

    // Validate physics for the shared grid
    const physicsCheck = validateGridPhysics(sharedGrid);
    if (!physicsCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `Kesalahan Fisika Kapal: ${physicsCheck.errors[0]}`
      });
    }

    const currentActivePorts = activePorts || PORTS;
    const currentPortIndex = currentActivePorts.indexOf(currentPort);
    const nextPort = currentActivePorts[(currentPortIndex + 1) % currentActivePorts.length];
    const nextWeek = week + 1;
    const isGameOver = nextWeek > 8;
    const nextOrders = isGameOver ? [] : generateOrders(nextPort, nextWeek, currentActivePorts);

    const activePlayerIndex = currentPortIndex % players.length; // Surabaya is 0, Makassar is 1, etc.
    const activePlayer = players[activePlayerIndex];

    // 1. Compute Restows on the shared grid
    const restowCheck = calculateRestows(sharedGrid, currentPort, currentActivePorts);
    const restowPenaltyTotal = restowCheck.restowMovementsCount * 3000000;

    // 2. Compute Personal Rolling Penalties for the active player
    let personalRollingPenalty = 0;
    let personalRolledCount = 0;
    const personalRolledList = [];

    const pendingContainers = activePlayer.pendingContainers || [];
    if (pendingContainers.length > 0) {
      const grouped = {};
      pendingContainers.forEach(c => {
        grouped[c.orderId] = (grouped[c.orderId] || 0) + 1;
      });

      Object.keys(grouped).forEach(orderId => {
        const missingCount = grouped[orderId];
        const isCommitted = orderId.includes('Committed') || pendingContainers.find(c => c.orderId === orderId)?.customerType === 'Committed';
        const containerType = pendingContainers.find(c => c.orderId === orderId)?.containerType || 'DRY';
        
        let penaltyPerUnit = 0;
        if (isCommitted) {
          penaltyPerUnit = containerType === 'DRY' ? 16000000 : 24000000;
        } else {
          penaltyPerUnit = containerType === 'DRY' ? 8000000 : 16000000;
        }

        const penalty = missingCount * penaltyPerUnit;
        personalRollingPenalty += penalty;
        personalRolledCount += missingCount;

        personalRolledList.push({
          orderId,
          customerName: pendingContainers.find(c => c.orderId === orderId)?.customerName || 'Pelanggan',
          customerType: isCommitted ? 'Committed' : 'Regular',
          containerType,
          missingCount,
          penaltyPerUnit,
          totalPenalty: penalty
        });
      });
    }

    // 3. Compute Ignored Committed Penalty for the active player (from their own private cargoPool)
    let ignoredCommittedPenalty = 0;
    const poolToEvaluate = activePlayer.cargoPool || [];
    poolToEvaluate.forEach(order => {
      if (order.customerType === 'Committed') {
        const penaltyPerUnit = order.containerType === 'DRY' ? 16000000 : 24000000;
        const totalPenalty = order.quantity * penaltyPerUnit;
        ignoredCommittedPenalty += totalPenalty;

        personalRolledList.push({
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

    const totalRollingPenalty = personalRollingPenalty + ignoredCommittedPenalty;
    const totalWeeklyPenalties = restowPenaltyTotal + totalRollingPenalty;

    // 4. Calculate earned revenue for ALL players from unloaded containers destined for nextPort
    const revenueByPlayer = Array(players.length).fill(0);
    const bays = Object.keys(sharedGrid);
    bays.forEach(bay => {
      const config = getBayConfig(bay);
      config.rows.forEach(row => {
        config.tiers.forEach(tier => {
          const container = sharedGrid[bay][row][tier];
          if (container && container.destination === nextPort) {
            const originPort = container.origin;
            const originPlayerIndex = currentActivePorts.indexOf(originPort) % players.length;
            if (originPlayerIndex !== -1 && originPlayerIndex < players.length) {
              revenueByPlayer[originPlayerIndex] += container.tariff;
            }
          }
        });
      });
    });

    // 5. Update cash & penalties & cumulative gross revenue for all players
    const nextActivePlayerIndex = currentActivePorts.indexOf(nextPort) % players.length;
    const updatedPlayers = players.map((player, idx) => {
      const isCurrentActive = idx === activePlayerIndex;
      const earnedRevenue = revenueByPlayer[idx];
      
      let netIncome = earnedRevenue;
      if (isCurrentActive) {
        netIncome = earnedRevenue - totalWeeklyPenalties;
      }

      const newCash = player.cash + netIncome;
      const newAccumulatedPenalties = player.accumulatedPenalties + (isCurrentActive ? totalWeeklyPenalties : 0);
      const newCumulativeGrossRevenue = (player.cumulativeGrossRevenue || 0) + earnedRevenue;

      // Record Weekly Evaluation ONLY for the active player
      let weeklyEvaluation = player.lastWeeklyEvaluation;
      let updatedHistory = player.performanceLog || [];
      
      if (isCurrentActive) {
        weeklyEvaluation = {
          week,
          port: currentPort,
          rolledCount: personalRolledCount,
          rollingPenalty: totalRollingPenalty,
          restowCount: restowCheck.restowContainersCount,
          restowPenalty: restowPenaltyTotal,
          grossRevenue: earnedRevenue,
          netIncome,
          cashSnapshot: newCash,
          accumulatedPenaltiesSnapshot: newAccumulatedPenalties,
          rolledDetails: personalRolledList,
          restowDetails: restowCheck.restowedList
        };
        updatedHistory = [...updatedHistory, weeklyEvaluation];
      }

      return {
        ...player,
        cash: newCash,
        accumulatedPenalties: newAccumulatedPenalties,
        cumulativeGrossRevenue: newCumulativeGrossRevenue,
        ready: false,
        pendingContainers: isCurrentActive ? [] : player.pendingContainers, // Clear pending containers only for active player
        performanceLog: updatedHistory,
        lastWeeklyEvaluation: weeklyEvaluation,
        // If it is next player's turn, initialize their cargoPool for the next port
        cargoPool: (idx === nextActivePlayerIndex) ? JSON.parse(JSON.stringify(nextOrders)) : player.cargoPool
      };
    });

    // Check for route unlocks based on player cumulative revenue
    const updatedActivePorts = [...currentActivePorts];
    const unlockedPortMessages = [];
    
    // Check Banjarmasin (BJM) - unlocks at Rp 200,000,000 cumulative revenue
    if (!updatedActivePorts.includes('BJM')) {
      const anyQualified = updatedPlayers.some(p => (p.cumulativeGrossRevenue || 0) >= 200000000);
      if (anyQualified) {
        updatedActivePorts.push('BJM');
        unlockedPortMessages.push('Pelabuhan Banjarmasin (BJM) telah berhasil dibuka untuk pelayaran!');
      }
    }
    // Check Jakarta (JKT) - unlocks at Rp 350,000,000 cumulative revenue
    if (!updatedActivePorts.includes('JKT') && updatedActivePorts.includes('BJM')) {
      const anyQualified = updatedPlayers.some(p => (p.cumulativeGrossRevenue || 0) >= 350000000);
      if (anyQualified) {
        updatedActivePorts.push('JKT');
        unlockedPortMessages.push('Pelabuhan Jakarta (JKT) telah berhasil dibuka untuk pelayaran!');
      }
    }
    // Check Bali (BLI) - unlocks at Rp 500,000,000 cumulative revenue
    if (!updatedActivePorts.includes('BLI') && updatedActivePorts.includes('JKT')) {
      const anyQualified = updatedPlayers.some(p => (p.cumulativeGrossRevenue || 0) >= 500000000);
      if (anyQualified) {
        updatedActivePorts.push('BLI');
        unlockedPortMessages.push('Pelabuhan Bali (BLI) telah berhasil dibuka untuk pelayaran!');
      }
    }

    // Regenerate nextOrders if a new port was unlocked just now so it is included in destinations
    const finalNextOrders = (isGameOver || unlockedPortMessages.length === 0) 
      ? nextOrders 
      : generateOrders(nextPort, nextWeek, updatedActivePorts);

    // Update next player's cargo pool again if we regenerated it with the new port destinations
    if (unlockedPortMessages.length > 0 && !isGameOver) {
      updatedPlayers[nextActivePlayerIndex].cargoPool = JSON.parse(JSON.stringify(finalNextOrders));
    }

    // 6. Unload next port containers and slide-down on the shared grid
    const transitionedGrid = processSailingTransition(sharedGrid, nextPort);

    let finalPlayers = updatedPlayers;

    if (isGameOver) {
      finalPlayers = updatedPlayers.map(player => {
        let rating = 'Perwira Logistik Junior';
        if (player.cash >= 300000000) {
          rating = 'VP Operasi Logistik & Stowage';
        } else if (player.cash >= 200000000) {
          rating = 'Spesialis Stowage Pelabuhan Senior';
        } else if (player.cash >= 100000000) {
          rating = 'Koordinator Logistik Standar';
        } else if (player.cash < 0) {
          rating = 'Supervisor Terminal Bangkrut';
        }
        return {
          ...player,
          playerRating: rating
        };
      });
    }

    // Persist offline session to PostgreSQL database
    upsertSessionToDb('OFFLINE_SESSION', {
      week: nextWeek,
      currentPort: nextPort,
      activePorts: updatedActivePorts,
      vesselLevel: 1,
      sharedGrid: transitionedGrid,
      globalCargoPool: finalNextOrders,
      players: finalPlayers,
      isGameOver
    });

    res.json({
      success: true,
      data: {
        week: nextWeek,
        currentPort: nextPort,
        globalCargoPool: finalNextOrders,
        isGameOver,
        players: finalPlayers,
        sharedGrid: transitionedGrid,
        activePorts: updatedActivePorts,
        unlockMessages: unlockedPortMessages
      }
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
});

