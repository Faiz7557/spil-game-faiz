import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import BayplanSimulator from './components/BayplanSimulator';
import PerformanceModal from './components/PerformanceModal';
import GameOverModal from './components/GameOverModal';
import { getBayConfig, createEmptyGrid, validateGridPhysics } from './utils/gameHelpers';
import { formatRupiah, PORT_NAMES } from './utils/gameHelpers';
import { AlertCircle, HelpCircle, Anchor, Play, ShieldAlert, Award, Ship, Users, LogIn, ArrowRight, Monitor, Network } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5050';

export default function App() {
  const [gameMode, setGameMode] = useState(null); // 'OFFLINE' | 'ONLINE' | null

  // --- COMMON MULTIPLAYER STATES ---
  const [playerName, setPlayerName] = useState('');
  const [alertMessage, setAlertMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- ONLINE MODE STATES ---
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomState, setRoomState] = useState(null);
  
  // Local active simulation states (allows smooth drag-drop/click actions before committing via ready)
  const [localGrid, setLocalGrid] = useState(null);
  const [localPendingContainers, setLocalPendingContainers] = useState([]);
  
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [lastWeeklyEvaluation, setLastWeeklyEvaluation] = useState(null);
  const socketRef = useRef(null);

  // --- OFFLINE MODE STATES ---
  const [offlinePlayersNames, setOfflinePlayersNames] = useState(['Kapten 1', 'Kapten 2', 'Kapten 3', 'Kapten 4']);
  const [offlineWeek, setOfflineWeek] = useState(1);
  const [offlineCurrentPort, setOfflineCurrentPort] = useState('SBY');
  const [offlineCargoPool, setOfflineCargoPool] = useState([]);
  const [offlinePlayers, setOfflinePlayers] = useState([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [offlineIsGameOver, setOfflineIsGameOver] = useState(false);
  const [isOfflineGameStarted, setIsOfflineGameStarted] = useState(false);
  const [offlineSharedGrid, setOfflineSharedGrid] = useState(null);
  const [offlineBays, setOfflineBays] = useState(['10', '06', '02']);
  const [offlinePorts, setOfflinePorts] = useState(['SBY', 'MKS', 'JYP', 'MDN']);
  const [offlineVesselLevel, setOfflineVesselLevel] = useState(1);

  // Connect socket for Online Mode
  const connectSocket = () => {
    if (socketRef.current) return socketRef.current;
    
    const socket = io(API_BASE_URL);
    socketRef.current = socket;

    socket.on('room_created', ({ roomCode, state }) => {
      setRoomCode(roomCode);
      setRoomState(state);
      setIsInRoom(true);
      const me = state.players[socket.id];
      if (me) {
        setLocalGrid(me.grid);
        setLocalPendingContainers([]);
      }
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
    });

    socket.on('cargo_claimed_success', (order) => {
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
      setLocalPendingContainers(prev => [...prev, ...newContainers]);
    });

    socket.on('sailing_completed', (state) => {
      setRoomState(state);
      const me = state.players[socket.id];
      if (me) {
        setLocalGrid(me.grid);
        setLocalPendingContainers([]);
        setLastWeeklyEvaluation(me.lastWeeklyEvaluation);
        setShowWeeklyModal(true);
      }
      setLoading(false);
    });

    socket.on('error_message', (msg) => {
      showTemporaryAlert(msg);
      setLoading(false);
    });

    return socket;
  };

  const showTemporaryAlert = (msg) => {
    setAlertMessage(msg);
    setTimeout(() => {
      setAlertMessage(null);
    }, 6000);
  };

  // --- ONLINE EVENT HANDLERS ---
  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      return showTemporaryAlert('Silakan masukkan nama Anda terlebih dahulu.');
    }
    const socket = connectSocket();
    socket.emit('create_room', { playerName });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      return showTemporaryAlert('Silakan masukkan nama Anda terlebih dahulu.');
    }
    if (!roomCodeInput.trim()) {
      return showTemporaryAlert('Silakan masukkan kode kamar.');
    }
    const socket = connectSocket();
    socket.emit('join_room', { roomCode: roomCodeInput, playerName });
    setIsInRoom(true);
    setRoomCode(roomCodeInput.toUpperCase());
  };

  const handleClaimCargoOnline = (orderId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('claim_cargo', { orderId });
  };

  const handleDeclineCargoOnline = (orderId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('decline_cargo', { orderId });
  };

  const handleToggleReadyOnline = () => {
    if (!socketRef.current || !roomState) return;

    const me = roomState.players[socketRef.current.id];
    if (!me) return;

    if (me.ready) {
      socketRef.current.emit('player_unready');
    } else {
      const physicsCheck = validateGridPhysics(localGrid);
      if (!physicsCheck.valid) {
        showTemporaryAlert(`Kesalahan Fisika: ${physicsCheck.errors[0]}`);
        return;
      }

      setLoading(true);
      socketRef.current.emit('player_ready', {
        grid: localGrid,
        pendingContainers: localPendingContainers
      });
    }
  };

  // --- OFFLINE (PASS-AND-PLAY) EVENT HANDLERS ---
  const handleStartOfflineGame = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Fetch initial cargo orders for Surabaya Week 1
      const response = await fetch(`${API_BASE_URL}/api/game/start`, { method: 'POST' });
      const resData = await response.json();
      
      if (resData.success) {
        setOfflineCargoPool(resData.data.orders);
        
        const initializedPlayers = offlinePlayersNames.map((name, idx) => ({
          id: idx,
          name: name || `Kapten ${idx + 1}`,
          cash: 150000000,
          accumulatedPenalties: 0,
          cumulativeGrossRevenue: 0,
          grid: createEmptyGrid(['10', '06', '02']),
          pendingContainers: [],
          ready: false,
          performanceLog: [],
          playerRating: null,
          lastWeeklyEvaluation: null,
          cargoPool: idx === 0 ? JSON.parse(JSON.stringify(resData.data.orders)) : []
        }));

        setOfflinePlayers(initializedPlayers);
        setOfflineSharedGrid(createEmptyGrid(['10', '06', '02']));
        setOfflineBays(['10', '06', '02']);
        setOfflinePorts(['SBY', 'MKS', 'JYP', 'MDN']);
        setOfflineVesselLevel(1);
        setOfflineWeek(1);
        setOfflineCurrentPort('SBY');
        setActivePlayerIndex(0);
        setOfflineIsGameOver(false);
        setIsOfflineGameStarted(true);
      } else {
        showTemporaryAlert('Gagal memulai sesi permainan offline.');
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      showTemporaryAlert('Tidak dapat terhubung ke backend. Pastikan server aktif di port 5050.');
    } finally {
      setLoading(false);
    }
  };

  // Claim cargo from player's private pool (Offline)
  const handleClaimCargoOffline = (orderId) => {
    const player = offlinePlayers[activePlayerIndex];
    const orderIndex = player.cargoPool.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = player.cargoPool[orderIndex];
    
    // Unpack containers to active player pending containers
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

    const updatedPlayers = [...offlinePlayers];
    // Update player buffer
    updatedPlayers[activePlayerIndex].pendingContainers = [
      ...updatedPlayers[activePlayerIndex].pendingContainers,
      ...newContainers
    ];

    // Remove order from active player's private pool
    updatedPlayers[activePlayerIndex].cargoPool.splice(orderIndex, 1);

    setOfflinePlayers(updatedPlayers);
  };

  // Decline cargo from private pool (Offline)
  const handleDeclineCargoOffline = (orderId) => {
    const player = offlinePlayers[activePlayerIndex];
    const orderIndex = player.cargoPool.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = player.cargoPool[orderIndex];
    if (order.customerType === 'Committed') {
      return showTemporaryAlert('Kontrak Committed wajib dikerjakan.');
    }

    const updatedPlayers = [...offlinePlayers];
    updatedPlayers[activePlayerIndex].cargoPool.splice(orderIndex, 1);
    setOfflinePlayers(updatedPlayers);
  };

  // Toggle ready status for active player (Offline)
  const handleToggleReadyOffline = () => {
    const updatedPlayers = [...offlinePlayers];
    const player = updatedPlayers[activePlayerIndex];

    if (player.ready) {
      player.ready = false;
    } else {
      // Validate local physics constraints
      const physicsCheck = validateGridPhysics(player.grid);
      if (!physicsCheck.valid) {
        showTemporaryAlert(`Kesalahan Fisika: ${physicsCheck.errors[0]}`);
        return;
      }
      player.ready = true;
    }

    setOfflinePlayers(updatedPlayers);
  };

  const handleUpgradeVesselOffline = () => {
    if (offlineIsGameOver) return;
    
    const nextLevel = offlineVesselLevel + 1;
    if (nextLevel > 3) {
      showTemporaryAlert('Kapal Anda sudah mencapai ukuran maksimal (Besar)!');
      return;
    }

    const upgradeCosts = {
      2: 50000000,   // Level 2: Rp 50M
      3: 100000000   // Level 3: Rp 100M
    };
    const cost = upgradeCosts[nextLevel];
    
    // The active player pays for the upgrade
    const player = offlinePlayers[activePlayerIndex];
    if (player.cash < cost) {
      showTemporaryAlert(`Saldo tidak cukup! Biaya upgrade ke Kapal Level ${nextLevel} adalah ${formatRupiah(cost)}.`);
      return;
    }

    // Deduct cash and upgrade
    const updatedPlayers = offlinePlayers.map((p, idx) => {
      if (idx === activePlayerIndex) {
        return {
          ...p,
          cash: p.cash - cost
        };
      }
      return p;
    });

    // Bays mapping for each level
    const levelBays = {
      2: ['18', '14', '10', '06', '02'],
      3: ['26', '22', '18', '14', '10', '06', '02']
    };
    const nextBays = levelBays[nextLevel];

    // Expand shared grid
    const newGrid = createEmptyGrid(nextBays);
    // Copy old grid slots over
    Object.keys(offlineSharedGrid).forEach(bay => {
      if (newGrid[bay]) {
        newGrid[bay] = offlineSharedGrid[bay];
      }
    });

    setOfflinePlayers(updatedPlayers);
    setOfflineSharedGrid(newGrid);
    setOfflineBays(nextBays);
    setOfflineVesselLevel(nextLevel);

    showTemporaryAlert(`🚢 Kapal berhasil di-upgrade ke Level ${nextLevel} (${nextBays.length} Bay)! Saldo Anda dipotong ${formatRupiah(cost)}.`);
  };

  // Submit and Sail (Offline)
  const handleDepartOffline = async () => {
    if (loading) return;

    // Validate physical constraints on the shared grid
    const physicsCheck = validateGridPhysics(offlineSharedGrid);
    if (!physicsCheck.valid) {
      showTemporaryAlert(`Kesalahan Fisika: ${physicsCheck.errors[0]}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/depart-offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: offlineWeek,
          currentPort: offlineCurrentPort,
          players: offlinePlayers,
          sharedGrid: offlineSharedGrid,
          activePorts: offlinePorts
        })
      });

      const resData = await response.json();
      if (resData.success) {
        const result = resData.data;
        setOfflineWeek(result.week);
        setOfflineCurrentPort(result.currentPort);
        setOfflineCargoPool(result.globalCargoPool);
        setOfflineIsGameOver(result.isGameOver);
        setOfflinePlayers(result.players);
        setOfflineSharedGrid(result.sharedGrid);
        
        if (result.activePorts) {
          setOfflinePorts(result.activePorts);
        }

        // Show weekly performance sheet for current active player
        if (result.players[activePlayerIndex]) {
          setLastWeeklyEvaluation(result.players[activePlayerIndex].lastWeeklyEvaluation);
          setShowWeeklyModal(true);
        }

        // Show alerts if a new port was unlocked
        if (result.unlockMessages && result.unlockMessages.length > 0) {
          showTemporaryAlert(`🔓 UNLOCK RUTE BARU: ${result.unlockMessages.join('\n')}`);
        }

        // Update active player index to match the new current port using round-robin on active ports
        const currentActivePorts = result.activePorts || offlinePorts;
        const nextActiveIndex = currentActivePorts.indexOf(result.currentPort) % result.players.length;
        if (nextActiveIndex !== -1) {
          setActivePlayerIndex(nextActiveIndex);
        }
      } else {
        showTemporaryAlert(resData.message || 'Transisi keberangkatan offline gagal.');
      }
    } catch (error) {
      console.error('Error departing offline:', error);
      showTemporaryAlert('Koneksi server gagal saat mengirim data pelayaran.');
    } finally {
      setLoading(false);
    }
  };

  // Leave room or reset lobby
  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsInRoom(false);
    setRoomCode('');
    setRoomState(null);
    setLocalGrid(null);
    setLocalPendingContainers([]);
    setIsOfflineGameStarted(false);
    setOfflinePlayers([]);
    setGameMode(null);
  };

  // --- LOCAL EDITORS FOR ONLINE GRID STOWAGE ---
  const handlePlaceContainer = (containerId, bay, row, tier) => {
    const container = localPendingContainers.find(c => c.id === containerId);
    if (!container) return;

    const bayConfig = getBayConfig(bay);
    const stack = localGrid[bay][row];

    if (bayConfig.containerType === 'REEFER' && container.containerType !== 'REEFER') {
      showTemporaryAlert(`Gagal Memuat: Bay ${bay} khusus slot REEFER.`);
      return;
    }
    if (bayConfig.containerType === 'DRY' && container.containerType !== 'DRY') {
      showTemporaryAlert(`Gagal Memuat: Bay ${bay} khusus slot DRY.`);
      return;
    }
    if (stack[tier] !== null) {
      showTemporaryAlert(`Slot sudah terisi.`);
      return;
    }
    if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) {
      showTemporaryAlert(`Gagal Memuat: Tidak dapat mengakses underdeck (Tier 02) karena hatch cover terhalang kontainer di atas dek (Tier 82/84).`);
      return;
    }
    if (tier === '84' && stack['82'] === null) {
      showTemporaryAlert(`Kontainer melayang! Anda harus memuat Tier 82 terlebih dahulu.`);
      return;
    }

    const updatedGrid = JSON.parse(JSON.stringify(localGrid));
    updatedGrid[bay][row][tier] = container;
    setLocalGrid(updatedGrid);

    setLocalPendingContainers(prev => prev.filter(c => c.id !== containerId));
  };

  const handleRemoveContainer = (bay, row, tier) => {
    const stack = localGrid[bay][row];
    const container = stack[tier];
    if (!container) return;

    if (container.origin !== currentPort) {
      showTemporaryAlert(`Gagal: Kontainer transit dari ${container.origin} dikunci di kapal.`);
      return;
    }
    if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) {
      showTemporaryAlert(`Tidak dapat membongkar underdeck (Tier 02) saat hatch cover terhalang kontainer di atas dek (Tier 82/84).`);
      return;
    }
    if (tier === '82' && stack['84'] !== null) {
      showTemporaryAlert(`Tidak dapat membongkar Tier 82 saat Tier 84 menampung kontainer di atasnya.`);
      return;
    }

    const updatedGrid = JSON.parse(JSON.stringify(localGrid));
    updatedGrid[bay][row][tier] = null;
    setLocalGrid(updatedGrid);

    setLocalPendingContainers(prev => [...prev, container]);
  };

  // --- LOCAL EDITORS FOR OFFLINE GRID STOWAGE ---
  const handlePlaceContainerOffline = (containerId, bay, row, tier) => {
    const player = offlinePlayers[activePlayerIndex];
    const container = player.pendingContainers.find(c => c.id === containerId);
    if (!container) return;

    const bayConfig = getBayConfig(bay);
    const stack = offlineSharedGrid[bay][row];

    if (bayConfig.containerType === 'REEFER' && container.containerType !== 'REEFER') {
      showTemporaryAlert(`Gagal Memuat: Bay ${bay} khusus slot REEFER.`);
      return;
    }
    if (bayConfig.containerType === 'DRY' && container.containerType !== 'DRY') {
      showTemporaryAlert(`Gagal Memuat: Bay ${bay} khusus slot DRY.`);
      return;
    }
    if (stack[tier] !== null) {
      showTemporaryAlert(`Slot sudah terisi.`);
      return;
    }
    if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) {
      showTemporaryAlert(`Gagal Memuat: Tidak dapat mengakses underdeck (Tier 02) karena hatch cover terhalang kontainer di atas dek (Tier 82/84).`);
      return;
    }
    if (tier === '84' && stack['82'] === null) {
      showTemporaryAlert(`Kontainer melayang! Anda harus memuat Tier 82 terlebih dahulu.`);
      return;
    }

    const updatedSharedGrid = JSON.parse(JSON.stringify(offlineSharedGrid));
    updatedSharedGrid[bay][row][tier] = container;
    setOfflineSharedGrid(updatedSharedGrid);

    const updatedPlayers = [...offlinePlayers];
    updatedPlayers[activePlayerIndex].pendingContainers = player.pendingContainers.filter(c => c.id !== containerId);
    setOfflinePlayers(updatedPlayers);
  };

  const handleRemoveContainerOffline = (bay, row, tier) => {
    const player = offlinePlayers[activePlayerIndex];
    const stack = offlineSharedGrid[bay][row];
    const container = stack[tier];
    if (!container) return;

    if (container.origin !== offlineCurrentPort) {
      showTemporaryAlert(`Gagal: Kontainer transit dari ${container.origin} dikunci di kapal.`);
      return;
    }
    if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) {
      showTemporaryAlert(`Tidak dapat membongkar underdeck (Tier 02) saat hatch cover terhalang kontainer di atas dek (Tier 82/84).`);
      return;
    }
    if (tier === '82' && stack['84'] !== null) {
      showTemporaryAlert(`Tidak dapat membongkar Tier 82 saat Tier 84 menampung kontainer di atasnya.`);
      return;
    }

    const updatedSharedGrid = JSON.parse(JSON.stringify(offlineSharedGrid));
    updatedSharedGrid[bay][row][tier] = null;
    setOfflineSharedGrid(updatedSharedGrid);

    const updatedPlayers = [...offlinePlayers];
    updatedPlayers[activePlayerIndex].pendingContainers = [
      ...player.pendingContainers,
      container
    ];
    setOfflinePlayers(updatedPlayers);
  };

  // --- RENDER 1: MODE SELECTION ---
  if (gameMode === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-slide-up" style={{ backgroundImage: "linear-gradient(to bottom, #103b22, #2E7D4E, #103b22)" }}>
        <div className="glass-panel max-w-2xl w-full p-8 md:p-10 text-center border-slate-200 shadow-2xl relative overflow-hidden">
          {/* Subtle branding decorative background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>

          {/* SPIL Corporate SVG Waving Red Flag Header */}
          <div className="w-24 h-16 flex items-center justify-center mx-auto mb-6 shrink-0">
            <svg viewBox="0 0 100 65" className="w-full h-full drop-shadow-md select-none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" fill="#D21E20" stroke="#B5181A" strokeWidth="1.5" />
              <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
              <circle cx="5" cy="2" r="3" fill="#64748b" />
              <text x="45" y="30" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="'Outfit', 'Inter', sans-serif" textAnchor="middle" transform="rotate(6, 45, 30)" letterSpacing="1">SPIL</text>
            </svg>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800 mb-2 font-display">
            SPIL GAME: 4 JALUR
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mb-10 font-bold uppercase tracking-widest border-b border-slate-100 pb-6">
            Simulator Logistik, Stowage & Pelayaran Kontainer
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Opsi 1: Mabar Offline */}
            <button
              onClick={() => setGameMode('OFFLINE')}
              className="glass-panel-interactive p-6 flex flex-col items-center text-center gap-4 border border-slate-200/80 hover:border-spil-green hover:shadow-xl transition-all duration-300 rounded-2xl group bg-slate-50/50 hover:bg-white"
            >
              <div className="w-14 h-14 rounded-2xl bg-spil-green-light flex items-center justify-center text-spil-green group-hover:scale-110 transition-transform duration-300">
                <Monitor className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1.5 group-hover:text-spil-green transition-colors">Mabar Offline (Lokal)</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Bermain bergantian (Pass & Play) bersama **4 pemain di satu layar** secara bergilir tanpa butuh internet.
                </p>
              </div>
            </button>

            {/* Opsi 2: Mabar Online */}
            <button
              onClick={() => setGameMode('ONLINE')}
              className="glass-panel-interactive p-6 flex flex-col items-center text-center gap-4 border border-slate-200/80 hover:border-spil-red hover:shadow-xl transition-all duration-300 rounded-2xl group bg-slate-50/50 hover:bg-white"
            >
              <div className="w-14 h-14 rounded-2xl bg-spil-red-light flex items-center justify-center text-spil-red group-hover:scale-110 transition-transform duration-300">
                <Network className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1.5 group-hover:text-spil-red transition-colors">Mabar Online (Room)</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Buat atau gabung kamar online kompetitif secara **real-time bersama teman** di perangkat yang berbeda.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 2: LOBBY FORM ---
  if (gameMode === 'ONLINE' && (!isInRoom || !roomState || !localGrid)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-slide-up animate-fade-in" style={{ backgroundImage: "linear-gradient(to bottom, #450a0a, #991b1b, #450a0a)" }}>
        <div className="glass-panel max-w-md w-full p-8 text-center border-slate-200 shadow-2xl relative overflow-hidden">
          <button onClick={() => setGameMode(null)} className="text-[10px] text-slate-400 font-extrabold hover:text-slate-600 uppercase mb-6 flex items-center gap-1 mx-auto">&larr; Kembali ke Pemilihan Mode</button>
          
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-spil-red mx-auto mb-4 animate-bounce">
            <Network className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-wider">Mabar Online (Open Room)</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Mode Kompetisi Real-Time</p>
          
          <form className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Nama Planner / Kapten</label>
              <input
                type="text"
                placeholder="Masukkan nama kapten..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-spil-red font-bold text-sm bg-slate-50/50"
                maxLength={12}
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleCreateRoom}
                className="w-full flex items-center justify-center gap-2 bg-spil-red hover:bg-spil-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-95 transition-all duration-200"
              >
                <Users className="w-4 h-4" />
                Buat Kamar Baru (Host)
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">ATAU GABUNG</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Kode Kamar..."
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-spil-red font-bold text-sm uppercase text-center tracking-widest bg-slate-50/50"
                maxLength={4}
              />
              <button
                onClick={handleJoinRoom}
                className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-6 rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                Gabung
              </button>
            </div>
          </form>

          {alertMessage && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-spil-red text-[11px] font-bold">
              {alertMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameMode === 'OFFLINE' && !isOfflineGameStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-slide-up" style={{ backgroundImage: "linear-gradient(to bottom, #103b22, #2E7D4E, #103b22)" }}>
        <div className="glass-panel max-w-xl w-full p-8 text-center border-slate-200 shadow-2xl relative overflow-hidden">
          <button onClick={() => setGameMode(null)} className="text-[10px] text-slate-400 font-extrabold hover:text-slate-600 uppercase mb-6 flex items-center gap-1 mx-auto">&larr; Kembali ke Pemilihan Mode</button>
          
          <div className="w-14 h-14 rounded-2xl bg-spil-green-light border border-green-100 flex items-center justify-center text-spil-green mx-auto mb-4 animate-bounce">
            <Monitor className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-wider">Mabar Offline (Pass & Play)</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Mode Giliran Satu Komputer</p>
          
          <form className="space-y-5 text-left">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2 border-l-2 border-spil-green pl-2">DAFTAR NAMA KAPTEN / PLANNER:</span>
            
            {/* 2x2 Grid input for 4 captains */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {offlinePlayersNames.map((name, idx) => (
                <div key={idx} className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Kapten {idx + 1}</label>
                  <input
                    type="text"
                    placeholder={`Nama Kapten ${idx + 1}...`}
                    value={name}
                    onChange={(e) => {
                      const newNames = [...offlinePlayersNames];
                      newNames[idx] = e.target.value;
                      setOfflinePlayersNames(newNames);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-spil-green font-bold text-sm bg-white"
                    maxLength={12}
                  />
                </div>
              ))}
            </div>

            <div className="pt-3">
              <button
                onClick={handleStartOfflineGame}
                disabled={loading}
                className="w-full bg-spil-green hover:bg-spil-green-hover text-white font-extrabold py-3.5 px-6 rounded-xl uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                {loading ? 'Menyiapkan Pelabuhan...' : 'Mulai Permainan Offline'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }


  // --- RENDER 3: ACTIVE GAME WORKSPACE (ONLINE & OFFLINE) ---
  const myPlayerId = socketRef.current ? socketRef.current.id : null;
  const activeOnlinePlayer = (gameMode === 'ONLINE' && roomState && myPlayerId) ? roomState.players[myPlayerId] : null;
  const activeOfflinePlayer = (gameMode === 'OFFLINE' && offlinePlayers.length > 0) ? offlinePlayers[activePlayerIndex] : null;

  // Map room data based on mode
  const activePlayerName = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.name : '') : (activeOfflinePlayer ? activeOfflinePlayer.name : '');
  const activePlayerCash = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.cash : 0) : (activeOfflinePlayer ? activeOfflinePlayer.cash : 0);
  const activePlayerPenalties = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.accumulatedPenalties : 0) : (activeOfflinePlayer ? activeOfflinePlayer.accumulatedPenalties : 0);
  const isReadyCurrent = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.ready : false) : (activeOfflinePlayer ? activeOfflinePlayer.ready : false);
  
  const currentWeek = gameMode === 'ONLINE' ? roomState.week : offlineWeek;
  const currentPort = gameMode === 'ONLINE' ? roomState.currentPort : offlineCurrentPort;
  const cargoPool = gameMode === 'ONLINE' ? roomState.globalCargoPool : (activeOfflinePlayer ? activeOfflinePlayer.cargoPool : []);
  const isGameOver = gameMode === 'ONLINE' ? roomState.isGameOver : offlineIsGameOver;

  // Map grid & pending list
  const activeGrid = gameMode === 'ONLINE' ? localGrid : offlineSharedGrid;
  const activePendingList = gameMode === 'ONLINE' ? localPendingContainers : (activeOfflinePlayer ? activeOfflinePlayer.pendingContainers : []);

  // Leaderboard formatting
  const formattedPlayersList = gameMode === 'ONLINE' ? roomState.players : offlinePlayers.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const currentSocketOrIndexId = gameMode === 'ONLINE' ? myPlayerId : activePlayerIndex;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 flex flex-col items-center max-w-[1400px] mx-auto">
      {/* 1. Global Alert Banner */}
      {alertMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-bounce">
          <div className="bg-rose-50 border border-rose-200 text-spil-red px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 font-semibold">
            <AlertCircle className="w-5 h-5 text-spil-red shrink-0" />
            <span className="text-xs font-bold leading-relaxed">{alertMessage}</span>
          </div>
        </div>
      )}

      {/* 2. Top Dashboard & Leaderboard */}
      <Dashboard 
        week={currentWeek}
        currentPort={currentPort}
        cash={activePlayerCash}
        accumulatedPenalties={activePlayerPenalties}
        roomCode={gameMode === 'ONLINE' ? roomCode : 'LOCAL PLAY'}
        players={formattedPlayersList}
        socketId={currentSocketOrIndexId}
        activePorts={gameMode === 'ONLINE' ? (roomState ? roomState.activePorts : null) : offlinePorts}
      />

      {/* 3. Bar Status Giliran Kapten (Hanya muncul di Mode Offline) */}
      {gameMode === 'OFFLINE' && (
        <div className="w-full glass-panel p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white border-l-4 border-l-spil-green shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-spil-green" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Representatif Pelabuhan (Turn-based):</span>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {offlinePlayers.map((player, idx) => {
              const isActive = idx === activePlayerIndex;
              // Map dynamic starting ports dynamically based on activePorts
              const portCode = offlinePorts[idx] || ['SBY', 'MKS', 'JYP', 'MDN'][idx];
              return (
                <div
                  key={player.id}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-xl uppercase tracking-wider border transition-all duration-300 ${
                    isActive 
                      ? 'bg-spil-green text-white border-spil-green shadow-md scale-[1.02]' 
                      : 'bg-slate-50 border-slate-200/60 text-slate-400 opacity-60'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-white animate-pulse' : 'bg-slate-300'}`}></span>
                  <span>{player.name} ({portCode})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Main Simulator workspace grid */}
      <div className="w-full flex-1">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              🚢 {gameMode === 'ONLINE' ? `Grid Stowage Bayplan Lokal - ${activePlayerName}` : `Grid Stowage Bayplan Bersama (Giliran: ${activePlayerName})`}
            </h2>
            <p className="text-xs text-emerald-100/90 font-bold mt-0.5">
              {gameMode === 'ONLINE' 
                ? 'Tata kargo klaiman Anda. Pelayaran akan diproses setelah seluruh kapten menekan tombol Siap Berlayar.'
                : 'Susun kontainer pada kapal bersama. Pelayaran ke pelabuhan berikutnya akan memicu bongkar muat dan giliran otomatis.'}
            </p>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleLeaveRoom}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-350 text-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider shadow-sm hover:scale-[1.02] ml-auto animate-fade-in"
            >
              Keluar
            </button>
          </div>
        </div>

        <BayplanSimulator 
          grid={activeGrid}
          currentPort={currentPort}
          pendingContainers={activePendingList}
          onPlaceContainer={gameMode === 'ONLINE' ? handlePlaceContainer : handlePlaceContainerOffline}
          onRemoveContainer={gameMode === 'ONLINE' ? handleRemoveContainer : handleRemoveContainerOffline}
          activePorts={gameMode === 'ONLINE' ? (roomState ? roomState.activePorts : null) : offlinePorts}
          // Sidebar Overhaul Props:
          gameMode={gameMode}
          cargoPool={cargoPool}
          onAcceptCargo={gameMode === 'ONLINE' ? handleClaimCargoOnline : handleClaimCargoOffline}
          onDeclineCargo={gameMode === 'ONLINE' ? handleDeclineCargoOnline : handleDeclineCargoOffline}
          vesselLevel={offlineVesselLevel}
          onUpgradeVessel={handleUpgradeVesselOffline}
          cumulativeGrossRevenue={offlinePlayers[activePlayerIndex]?.cumulativeGrossRevenue || 0}
          activeOfflinePlayerName={activePlayerName}
          onDepart={handleDepartOffline}
          loading={loading}
          isGameOver={isGameOver}
          isReadyCurrent={isReadyCurrent}
          onToggleReadyOnline={handleToggleReadyOnline}
        />
      </div>

      {/* 6. Lembar Kinerja Mingguan modal popup */}
      <PerformanceModal 
        isOpen={showWeeklyModal}
        evaluation={lastWeeklyEvaluation}
        history={
          gameMode === 'ONLINE' 
            ? (activeOnlinePlayer ? activeOnlinePlayer.performanceLog : [])
            : (activeOfflinePlayer ? activeOfflinePlayer.performanceLog : [])
        }
        onClose={() => setShowWeeklyModal(false)}
      />

      {/* 7. Game Over Modal */}
      <GameOverModal 
        isOpen={isGameOver}
        cash={gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.cash : 0) : (activeOfflinePlayer ? activeOfflinePlayer.cash : 0)}
        accumulatedPenalties={gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.accumulatedPenalties : 0) : (activeOfflinePlayer ? activeOfflinePlayer.accumulatedPenalties : 0)}
        playerRating={gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.playerRating : '') : (activeOfflinePlayer ? activeOfflinePlayer.playerRating : '')}
        history={
          gameMode === 'ONLINE' 
            ? (activeOnlinePlayer ? activeOnlinePlayer.performanceLog : [])
            : (activeOfflinePlayer ? activeOfflinePlayer.performanceLog : [])
        }
        onRestart={handleLeaveRoom}
      />

      {/* Footer Info Guidance */}
      <footer className="w-full mt-10 border-t border-emerald-700/50 pt-6 pb-2 text-center text-[10px] text-emerald-100/70 font-bold uppercase tracking-widest flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>© Prototipe PT Salam Pacific Indonesia Lines (SPIL)</span>
        <div className="flex items-center gap-4 text-emerald-200">
          <span className="flex items-center gap-1 hover:text-white cursor-pointer">
            <Anchor className="w-3.5 h-3.5" /> Ports: SBY - MKS - JYP - MDN
          </span>
          <span className="flex items-center gap-1 hover:text-white cursor-pointer">
            <HelpCircle className="w-3.5 h-3.5" /> Biaya Shifting: Rp 3.000.000 / Move
          </span>
        </div>
      </footer>
    </div>
  );
}
