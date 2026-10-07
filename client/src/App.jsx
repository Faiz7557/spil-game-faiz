import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import GameShell from './components/game/GameShell';
import BayplanSimulator from './components/BayplanSimulator';
import PerformanceModal from './components/PerformanceModal';
import GameOverModal from './components/GameOverModal';
import TariffModal from './components/TariffModal';
import GlossaryModal from './components/GlossaryModal';
import ISOVisualizerModal from './components/ISOVisualizerModal';
import TutorialModal from './components/TutorialModal';
import LearningAnalyticsModal from './components/LearningAnalyticsModal';
import BadgeGalleryModal from './components/BadgeGalleryModal';
import BotTurnAnimationModal from './components/BotTurnAnimationModal';
import ChatPanel from './components/ChatPanel';
import LandingPage from './landing/LandingPage';
import GridPulse from './components/ui/GridPulse';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTheme } from './hooks/useTheme';
import { validateGridPhysics, formatRupiah, HORIZON_WEEKS, TOTAL_GAME_WEEKS } from './utils/gameHelpers';
import { evaluateEarnedBadges } from '../../shared/badgeDefinitions.js';
import { AlertCircle, Play, Award, Users, LogIn, Monitor, Network, Eye, Cpu, Zap, Scale } from 'lucide-react';
import GameLobby from './components/lobby/GameLobby';

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.port !== '3000' && window.location.port !== '5050' && (window.location.port === '5190' || window.location.port === '5173' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:5050`
    : ''
);

// Stable per-browser identity, persisted across reloads and reconnects.
// Used as the multiplayer player key (replacing socket.id, which changes on
// every reconnect and made the server forget who a player was) and as the
// offline save slot key (replacing the single hardcoded 'OFFLINE_SESSION'
// row every browser used to share in the database).
const getOrCreateClientId = () => {
  const STORAGE_KEY = 'spil_client_id';
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
};
const CLIENT_ID = getOrCreateClientId();

const getStoredAuthUser = () => {
  try {
    const raw = localStorage.getItem('spil_auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [gameMode, setGameMode] = useState(null); // 'OFFLINE' | 'ONLINE' | 'AUTH' | 'LEADERBOARD' | null

  // --- ACCOUNT STATE ---
  // { userId, username, token } | null. A logged-in account's identity
  // (user_<id>, verified server-side from the token) takes over from the
  // anonymous CLIENT_ID everywhere a session/room is created or joined -
  // see effectiveIdRef below.
  const [authUser, setAuthUser] = useState(getStoredAuthUser);
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authUsernameInput, setAuthUsernameInput] = useState('');
  const [authPasswordInput, setAuthPasswordInput] = useState('');

  // Read fresh in effect callbacks and socket listeners registered once at
  // connection time, which would otherwise close over a stale authUser from
  // whenever they were first created.
  const effectiveIdRef = useRef(CLIENT_ID);
  useEffect(() => {
    effectiveIdRef.current = authUser ? `user_${authUser.userId}` : CLIENT_ID;
  }, [authUser]);

  // --- COMMON MULTIPLAYER STATES ---
  const [playerName, setPlayerName] = useState(() => getStoredAuthUser()?.username || localStorage.getItem('spil_player_name') || '');
  const [alertMessage, setAlertMessage] = useState(null);
  const alertTimeoutRef = useRef(null);
  const [leaderboardData, setLeaderboardData] = useState(null); // null = not loaded yet
  const [loading, setLoading] = useState(false);

  // --- ONLINE MODE STATES ---
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const autoRejoinAttemptedRef = useRef(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [turnTimer, setTurnTimer] = useState(null);
  
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [lastWeeklyEvaluation, setLastWeeklyEvaluation] = useState(null);
  const [isTariffOpen, setIsTariffOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isISOOpen, setIsISOOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => !localStorage.getItem('spil_tutorial_completed'));
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isBadgeGalleryOpen, setIsBadgeGalleryOpen] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('spil_badges') || '[]');
    } catch {
      return [];
    }
  });
  const [isSpectator, setIsSpectator] = useState(false);
  const [isBotAnimating, setIsBotAnimating] = useState(false);
  const [pendingOfflineSession, setPendingOfflineSession] = useState(null);
  const socketRef = useRef(null);
  const [activeSocket, setActiveSocket] = useState(null);

  // Desktop keyboard shortcuts
  useKeyboardShortcuts({
    onToggleGlossary: () => setIsGlossaryOpen(prev => !prev),
    onToggleTariff: () => setIsTariffOpen(prev => !prev),
    onToggleISO: () => setIsISOOpen(prev => !prev),
    onCancelSelection: () => {}
  });

  // Unmount cleanup for sockets and timers
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setActiveSocket(null);
      }
    };
  }, []);

  // --- OFFLINE MODE STATES ---
  // undefined = not checked yet, null = checked and nothing to resume, object = a resumable session
  const [resumableSession, setResumableSession] = useState(undefined);
  const [offlinePlayersNames, setOfflinePlayersNames] = useState(() => {
    const names = ['Kapten 1', 'Kapten 2', 'Kapten 3', 'Kapten 4'];
    const loggedInName = getStoredAuthUser()?.username;
    if (loggedInName) names[0] = loggedInName;
    return names;
  });
  const [offlineWeek, setOfflineWeek] = useState(1);
  const [offlineCurrentPort, setOfflineCurrentPort] = useState('SBY');
  const [offlinePlayers, setOfflinePlayers] = useState([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [offlineIsGameOver, setOfflineIsGameOver] = useState(false);
  const [isOfflineGameStarted, setIsOfflineGameStarted] = useState(false);
  const [offlineSharedGrid, setOfflineSharedGrid] = useState(null);
  const [offlinePorts, setOfflinePorts] = useState(['SBY', 'MKS', 'JYP', 'MDN']);
  const [offlineVesselLevel, setOfflineVesselLevel] = useState(1);

  // Connect socket for Online Mode
  const connectSocket = () => {
    if (socketRef.current) return socketRef.current;
    
    const socket = io(API_BASE_URL);
    socketRef.current = socket;
    setActiveSocket(socket);

    socket.on('connect_error', () => {
      showTemporaryAlert('Koneksi ke server terputus. Mencoba menghubungkan kembali...');
      setLoading(false);
    });

    // The server owns every online player's grid/pendingContainers end to
    // end (see place_container/remove_container/claim_cargo in server.js) -
    // roomState.players[myId] IS the current grid/buffer, derived at render
    // time (see activeGrid/activePendingList below). No local mirror to
    // sync here, so these handlers just adopt whatever the server sent.
    socket.on('room_created', ({ roomCode, state }) => {
      setRoomCode(roomCode);
      setRoomState(state);
      setIsInRoom(true);
      setLoading(false);
      localStorage.setItem('spil_room_code', roomCode);
    });

    // Fired for both a fresh join and a reconnect (join_room on the server
    // covers both).
    socket.on('room_joined', ({ roomCode, state }) => {
      setRoomCode(roomCode);
      setRoomState(state);
      setIsInRoom(true);
      setIsSpectator(false);
      setLoading(false);
      localStorage.setItem('spil_room_code', roomCode);
    });

    socket.on('spectate_joined', ({ roomCode, state }) => {
      setRoomCode(roomCode);
      setRoomState(state);
      setIsInRoom(true);
      setIsSpectator(true);
      setLoading(false);
      localStorage.setItem('spil_room_code', roomCode);
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
      setLoading(false);
    });

    socket.on('sailing_completed', (state) => {
      setRoomState(state);
      setTurnTimer(null);
      const me = state.players[effectiveIdRef.current];
      if (me && !state.isGameOver) {
        setLastWeeklyEvaluation(me.lastWeeklyEvaluation);
        setShowWeeklyModal(true);
      }
      setLoading(false);
    });

    socket.on('turn_timer_tick', (data) => {
      setTurnTimer(data);
    });

    socket.on('error_message', (msg) => {
      if (msg.startsWith('auth_expired:')) {
        handleAuthExpired();
        setLoading(false);
        return;
      }
      showTemporaryAlert(msg);
      setLoading(false);
      // Stale/dead room - stop trying to auto-rejoin it next visit.
      if (msg.includes('tidak ditemukan') || msg.includes('telah menyelesaikan')) {
        localStorage.removeItem('spil_room_code');
      }
    });

    return socket;
  };

  const showTemporaryAlert = (msg) => {
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    setAlertMessage(msg);
    alertTimeoutRef.current = setTimeout(() => {
      setAlertMessage(null);
      alertTimeoutRef.current = null;
    }, 6000);
  };

  const handleOpenLeaderboard = () => {
    setGameMode('LEADERBOARD');
    setLeaderboardData(null);
    fetch(`${API_BASE_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(resData => setLeaderboardData(resData.success ? resData.data : []))
      .catch(() => setLeaderboardData([]));
  };

  // --- ACCOUNT HANDLERS ---
  const handleOpenAuth = () => {
    setAuthError('');
    setAuthUsernameInput('');
    setAuthPasswordInput('');
    setGameMode('AUTH');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authUsernameInput.trim() || !authPasswordInput.trim()) {
      return setAuthError('Nama pengguna dan kata sandi wajib diisi.');
    }
    setLoading(true);
    try {
      const endpoint = authMode === 'register' ? 'register' : 'login';
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsernameInput.trim(), password: authPasswordInput })
      });
      const resData = await response.json();
      if (resData.success) {
        const user = resData.data;
        setAuthUser(user);
        localStorage.setItem('spil_auth', JSON.stringify(user));
        setPlayerName(user.username);
        localStorage.setItem('spil_player_name', user.username);
        setOfflinePlayersNames(prev => [user.username, ...prev.slice(1)]);
        setGameMode(null);
      } else {
        setAuthError(resData.message || 'Gagal masuk.');
      }
    } catch (error) {
      console.error('Error with auth:', error);
      setAuthError('Tidak dapat terhubung ke backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem('spil_auth');
    setPlayerName('');
    localStorage.removeItem('spil_player_name');
    setOfflinePlayersNames(prev => ['Kapten 1', ...prev.slice(1)]);
  };

  // A previously-valid token can go stale (30-day expiry, or a manually
  // cleared account) without the app ever finding out until the next
  // request - the server then keeps sending "session not found" for every
  // action, which looks broken. Call this whenever a response signals
  // authExpired: it clears the stale login so the next action falls back to
  // guest play (which still works) instead of failing forever.
  const handleAuthExpired = () => {
    setAuthUser((prev) => {
      if (!prev) return null;
      localStorage.removeItem('spil_auth');
      showTemporaryAlert('Sesi login Anda telah kedaluwarsa. Silakan login kembali.');
      return null;
    });
  };

  // --- ONLINE EVENT HANDLERS ---
  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (loading) return;
    if (!playerName.trim()) {
      return showTemporaryAlert('Silakan masukkan nama Anda terlebih dahulu.');
    }
    setLoading(true);
    localStorage.setItem('spil_player_name', playerName);
    const socket = connectSocket();
    socket.emit('create_room', { playerName, playerId: effectiveIdRef.current, authToken: authUser?.token });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (loading) return;
    if (!playerName.trim()) {
      return showTemporaryAlert('Silakan masukkan nama Anda terlebih dahulu.');
    }
    if (!roomCodeInput.trim()) {
      return showTemporaryAlert('Silakan masukkan kode kamar.');
    }
    setLoading(true);
    localStorage.setItem('spil_player_name', playerName);
    const socket = connectSocket();
    socket.emit('join_room', { roomCode: roomCodeInput, playerName, playerId: effectiveIdRef.current, authToken: authUser?.token });
  };

  // Silently try to rejoin a room left open from a previous visit (refresh,
  // closed tab) - join_room on the server already handles this as a
  // reconnect (same playerId -> same seat), this just skips re-typing the
  // room code. Falls back to the normal lobby form if there's nothing to
  // rejoin, the stored name is missing, or the rejoin itself fails.
  useEffect(() => {
    if (gameMode !== 'ONLINE' || isInRoom || autoRejoinAttemptedRef.current) return;
    autoRejoinAttemptedRef.current = true;

    const storedRoomCode = localStorage.getItem('spil_room_code');
    // playerName's initial state already came from this same localStorage
    // key, so it's already the value to rejoin with here - no need to set it.
    const storedName = localStorage.getItem('spil_player_name');
    if (!storedRoomCode || !storedName) return;

    const socket = connectSocket();
    socket.emit('join_room', { roomCode: storedRoomCode, playerName: storedName, playerId: effectiveIdRef.current, authToken: authUser?.token });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connectSocket is stable for the component's lifetime; adding it would re-run this on every render
  }, [gameMode, isInRoom]);

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

    const me = roomState.players[effectiveIdRef.current];
    if (!me) return;

    if (me.ready) {
      socketRef.current.emit('player_unready');
    } else {
      // Cheap client-side pre-check so an obviously-invalid board doesn't
      // cost a round trip - me.grid is the server's own copy (every
      // placement was already validated server-side), so the server
      // re-validates independently regardless.
      const physicsCheck = validateGridPhysics(me.grid);
      if (!physicsCheck.valid) {
        showTemporaryAlert(`Kesalahan Fisika: ${physicsCheck.errors[0]}`);
        return;
      }

      setLoading(true);
      socketRef.current.emit('player_ready');
    }
  };

  // --- OFFLINE (PASS-AND-PLAY VS BOTS) EVENT HANDLERS ---
  // The server owns this session end to end (see server/server.js, the
  // /api/game/offline/* routes): cash, grid, and cargo pools all live there,
  // keyed by CLIENT_ID (or user_<id> when logged in - the server verifies
  // that from the Authorization header below, never just the sessionId in
  // the body). Every handler below just sends "do this one action" and
  // re-renders from whatever session state the server returns - none of
  // them compute cash, tariffs, or penalties locally anymore.
  const offlineHeaders = () => ({
    'Content-Type': 'application/json',
    ...(authUser ? { Authorization: `Bearer ${authUser.token}` } : {})
  });

  const applyOfflineSession = (session) => {
    setOfflineWeek(session.week);
    setOfflineCurrentPort(session.currentPort);
    setOfflinePlayers(session.players);
    setOfflineSharedGrid(session.sharedGrid);
    setOfflinePorts(session.activePorts);
    setOfflineVesselLevel(session.vesselLevel);
    setOfflineIsGameOver(session.isGameOver);
    setActivePlayerIndex(0);
  };

  // Check once per visit to the offline lobby whether an abandoned session
  // (left via "Keluar", or just a closed tab) is still sitting on the
  // server - "Keluar" never deletes it, only /start (a deliberate "Mulai
  // Baru") does.
  useEffect(() => {
    if (gameMode !== 'OFFLINE' || isOfflineGameStarted || resumableSession !== undefined) return;
    fetch(`${API_BASE_URL}/api/game/offline/resume`, {
      method: 'POST',
      headers: offlineHeaders(),
      body: JSON.stringify({ sessionId: effectiveIdRef.current })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.authExpired) handleAuthExpired();
        setResumableSession(resData.success ? resData.data : null);
      })
      .catch(() => setResumableSession(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- offlineHeaders is a plain function recreated each render; including it would re-run this on every render
  }, [gameMode, isOfflineGameStarted, resumableSession]);

  const handleResumeOfflineGame = () => {
    if (!resumableSession) return;
    applyOfflineSession(resumableSession);
    setIsOfflineGameStarted(true);
  };

  const handleStartOfflineGame = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/offline/start`, {
        method: 'POST',
        headers: offlineHeaders(),
        body: JSON.stringify({
          sessionId: effectiveIdRef.current,
          playerName: offlinePlayersNames[0] || 'Kapten User'
        })
      });
      const resData = await response.json();
      if (resData.authExpired) { handleAuthExpired(); return; }

      if (resData.success) {
        applyOfflineSession(resData.data);
        setResumableSession(null);
        setIsOfflineGameStarted(true);
      } else {
        showTemporaryAlert(resData.message || 'Gagal memulai sesi permainan offline.');
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      showTemporaryAlert('Tidak dapat terhubung ke backend. Pastikan server aktif di port 5050.');
    } finally {
      setLoading(false);
    }
  };

  // Claim cargo from the active player's private pool (Offline)
  const handleClaimCargoOffline = async (orderId) => {
    if (activeOfflinePlayer?.isBot) {
      return showTemporaryAlert('Ini giliran Bot - klik "Berlayar" untuk melanjutkan.');
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/offline/claim-cargo`, {
        method: 'POST',
        headers: offlineHeaders(),
        body: JSON.stringify({ sessionId: effectiveIdRef.current, orderId })
      });
      const resData = await response.json();
      if (resData.authExpired) { handleAuthExpired(); return; }
      if (resData.success) {
        applyOfflineSession(resData.data);
      } else {
        showTemporaryAlert(resData.message || 'Gagal mengklaim kargo.');
      }
    } catch (error) {
      console.error('Error claiming offline cargo:', error);
      showTemporaryAlert('Koneksi server gagal saat mengklaim kargo.');
    }
  };

  // Decline cargo from the active player's private pool (Offline)
  const handleDeclineCargoOffline = async (orderId) => {
    if (activeOfflinePlayer?.isBot) {
      return showTemporaryAlert('Ini giliran Bot - klik "Berlayar" untuk melanjutkan.');
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/offline/decline-cargo`, {
        method: 'POST',
        headers: offlineHeaders(),
        body: JSON.stringify({ sessionId: effectiveIdRef.current, orderId })
      });
      const resData = await response.json();
      if (resData.authExpired) { handleAuthExpired(); return; }
      if (resData.success) {
        applyOfflineSession(resData.data);
      } else {
        showTemporaryAlert(resData.message || 'Gagal menolak kargo.');
      }
    } catch (error) {
      console.error('Error declining offline cargo:', error);
      showTemporaryAlert('Koneksi server gagal saat menolak kargo.');
    }
  };

  const handleUpgradeVesselOffline = async () => {
    if (offlineIsGameOver) return;
    if (activeOfflinePlayer?.isBot) {
      return showTemporaryAlert('Ini giliran Bot - klik "Berlayar" untuk melanjutkan.');
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/offline/upgrade-vessel`, {
        method: 'POST',
        headers: offlineHeaders(),
        body: JSON.stringify({ sessionId: effectiveIdRef.current })
      });
      const resData = await response.json();
      if (resData.authExpired) { handleAuthExpired(); return; }
      if (resData.success) {
        const session = resData.data;
        showTemporaryAlert(`🚢 Kapal berhasil di-upgrade ke Level ${session.vesselLevel} (${Object.keys(session.sharedGrid).length} Bay)!`);
        applyOfflineSession(session);
      } else {
        showTemporaryAlert(resData.message || 'Gagal meng-upgrade kapal.');
      }
    } catch (error) {
      console.error('Error upgrading offline vessel:', error);
      showTemporaryAlert('Koneksi server gagal saat meng-upgrade kapal.');
    }
  };

  // Submit and Sail (Offline)
  const handleDepartOffline = async () => {
    if (loading) return;

    // Cheap client-side pre-check so an obviously-invalid board doesn't cost
    // a round trip - the server re-validates independently regardless.
    const physicsCheck = validateGridPhysics(offlineSharedGrid);
    if (!physicsCheck.valid) {
      showTemporaryAlert(`Kesalahan Fisika: ${physicsCheck.errors[0]}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/offline/depart`, {
        method: 'POST',
        headers: offlineHeaders(),
        body: JSON.stringify({ sessionId: effectiveIdRef.current })
      });

      const resData = await response.json();
      if (resData.authExpired) { handleAuthExpired(); return; }
      if (resData.success) {
        const session = resData.data;
        const prevIndex = activePlayerIndex;

        const hasBots = offlinePlayers.some(p => p.isBot);
        if (hasBots) {
          setPendingOfflineSession(session);
          setIsBotAnimating(true);
        } else {
          finishDepartOffline(session, prevIndex);
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

  const finishDepartOffline = (session, prevIndex) => {
    if (!session) return;
    if (!session.isGameOver && session.players[prevIndex]) {
      const evalData = session.players[prevIndex].lastWeeklyEvaluation;
      setLastWeeklyEvaluation(evalData);
      setShowWeeklyModal(true);
      checkBadges(evalData, session, session.players);
    } else if (session.isGameOver) {
      checkBadges(session.players[0]?.lastWeeklyEvaluation, session, session.players);
    }
    applyOfflineSession(session);
    setPendingOfflineSession(null);
    setIsBotAnimating(false);
  };

  const checkBadges = (evalData, session, players) => {
    const { allEarned, newlyEarned } = evaluateEarnedBadges(evalData, session, players, earnedBadges);
    if (newlyEarned.length > 0) {
      setEarnedBadges(allEarned);
      try {
        localStorage.setItem('spil_badges', JSON.stringify(allEarned));
      } catch (err) {
        console.error(err);
      }
      showTemporaryAlert(`🏆 Lencana Baru Terbuka: ${newlyEarned.map(b => b.title).join(', ')}!`);
    }
  };

  // Spectate Room (Instructor / Observer)
  const handleSpectateRoom = (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    const socket = connectSocket();
    setLoading(true);
    socket.emit('spectate_room', { roomCode: roomCodeInput.trim() });
  };

  // Leave room or reset lobby
  const handleLeaveRoom = () => {
    if (socketRef.current) {
      const socket = socketRef.current;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        socket.disconnect();
      };
      socket.emit('leave_room', finish);
      setTimeout(finish, 1000);
      socketRef.current = null;
      setActiveSocket(null);
      localStorage.removeItem('spil_room_code');
    }
    setIsInRoom(false);
    setIsSpectator(false);
    setRoomCode('');
    setRoomState(null);
    setTurnTimer(null);
    setIsOfflineGameStarted(false);
    setOfflinePlayers([]);
    setResumableSession(undefined);
    autoRejoinAttemptedRef.current = false;
    setGameMode(null);
  };

  // --- LOCAL EDITORS FOR ONLINE GRID STOWAGE ---
  // Both just emit to the server, which validates the exact same physics
  // rules against its own copy of this player's grid/buffer and broadcasts
  // the resulting room state - the client never mutates the grid directly,
  // so there is nothing here for a tampered event to exploit (matches the
  // offline handlers of the same name in shape).
  const handlePlaceContainer = (containerId, bay, row, tier) => {
    if (!socketRef.current) return;
    socketRef.current.emit('place_container', { containerId, bay, row, tier });
  };

  const handleRemoveContainer = (bay, row, tier) => {
    if (!socketRef.current) return;
    socketRef.current.emit('remove_container', { bay, row, tier });
  };

  // --- LOCAL EDITORS FOR OFFLINE GRID STOWAGE ---
  // Both just call the server, which validates the exact same physics rules
  // against its own copy of the grid/buffer and returns the resulting
  // session - the client never mutates offlineSharedGrid/offlinePlayers
  // directly, so there is nothing here for a tampered request to exploit.
  const handlePlaceContainerOffline = async (containerId, bay, row, tier) => {
    if (activeOfflinePlayer?.isBot) {
      return showTemporaryAlert('Ini giliran Bot - klik "Berlayar" untuk melanjutkan.');
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/offline/place-container`, {
        method: 'POST',
        headers: offlineHeaders(),
        body: JSON.stringify({ sessionId: effectiveIdRef.current, containerId, bay, row, tier })
      });
      const resData = await response.json();
      if (resData.authExpired) { handleAuthExpired(); return; }
      if (resData.success) {
        applyOfflineSession(resData.data);
      } else {
        showTemporaryAlert(resData.message || 'Gagal memuat kontainer.');
      }
    } catch (error) {
      console.error('Error placing offline container:', error);
      showTemporaryAlert('Koneksi server gagal saat memuat kontainer.');
    }
  };

  const handleRemoveContainerOffline = async (bay, row, tier) => {
    if (activeOfflinePlayer?.isBot) {
      return showTemporaryAlert('Ini giliran Bot - klik "Berlayar" untuk melanjutkan.');
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/offline/remove-container`, {
        method: 'POST',
        headers: offlineHeaders(),
        body: JSON.stringify({ sessionId: effectiveIdRef.current, bay, row, tier })
      });
      const resData = await response.json();
      if (resData.authExpired) { handleAuthExpired(); return; }
      if (resData.success) {
        applyOfflineSession(resData.data);
      } else {
        showTemporaryAlert(resData.message || 'Gagal membongkar kontainer.');
      }
    } catch (error) {
      console.error('Error removing offline container:', error);
      showTemporaryAlert('Koneksi server gagal saat membongkar kontainer.');
    }
  };

  // Computed directly from state (not effectiveIdRef) since this runs during
  // render, where the ref - only synced by an effect after commit - could
  // lag one render behind a just-changed authUser. Needed by RENDER 2 below
  // already, so it's computed here rather than further down with the rest
  // of RENDER 3's derived values.
  const myPlayerId = authUser ? `user_${authUser.userId}` : CLIENT_ID;

  // --- RENDER 1: LANDING PAGE (Caliber-inspired scrollytelling) ---
  if (gameMode === null) {
    return (
      <>
        <LandingPage
          theme={theme}
          toggleTheme={toggleTheme}
          onStart={() => setGameMode('OFFLINE')}
          onOpenLeaderboard={handleOpenLeaderboard}
          onOpenAuth={handleOpenAuth}
          onOpenTariff={() => setIsTariffOpen(true)}
          onOpenGlossary={() => setIsGlossaryOpen(true)}
          authUser={authUser}
          onLogout={handleLogout}
        />
        {/* Informational Modals accessible from Landing Page */}
        <TariffModal isOpen={isTariffOpen} onClose={() => setIsTariffOpen(false)} currentPort="SBY" />
        <GlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />
      </>
    );
  }

  // --- RENDER: LOGIN / REGISTER ---
  if (gameMode === 'AUTH') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
        <GridPulse className="fixed inset-0 pointer-events-none -z-10" />
        <article className="relative flex flex-col overflow-hidden g-glass-modal max-w-sm w-full p-8 text-center transition-colors">
          <button type="button" onClick={() => setGameMode(null)} className="text-callout text-g-muted hover:text-g-ink mb-6 flex items-center gap-1 mx-auto">&larr; Kembali ke pemilihan mode</button>

          <div className="w-14 h-14 rounded-2xl bg-g-inset border border-g-hair flex items-center justify-center text-g-ink2 mx-auto mb-4">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-title-2 font-semibold text-g-ink mb-1">
            {authMode === 'login' ? 'Masuk ke akun' : 'Daftar akun baru'}
          </h2>
          <p className="text-callout text-g-muted mb-6 border-b border-g-hair pb-4">
            Lacak profil dan peringkat Anda
          </p>

          <form className="space-y-4 text-left" onSubmit={handleAuthSubmit}>
            <div>
              <label className="block text-callout font-semibold text-g-ink2 mb-1.5">Nama pengguna</label>
              <input
                type="text"
                placeholder="3-20 karakter, huruf/angka/underscore"
                value={authUsernameInput}
                onChange={(e) => setAuthUsernameInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-g-line focus:outline-none focus:border-g-green text-body bg-g-surface text-g-ink placeholder:text-g-faint"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-callout font-semibold text-g-ink2 mb-1.5">Kata sandi</label>
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                value={authPasswordInput}
                onChange={(e) => setAuthPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-g-line focus:outline-none focus:border-g-green text-body bg-g-surface text-g-ink placeholder:text-g-faint"
              />
            </div>

            {authError && (
              <p className="text-callout text-g-danger-ink bg-g-danger-bg border border-g-danger-line rounded-xl px-3 py-2">{authError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 g-btn-green font-semibold text-body py-3.5 px-6 rounded-full cursor-pointer"
            >
              {loading ? 'Memproses…' : (authMode === 'login' ? 'Masuk' : 'Daftar')}
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
              className="w-full text-center text-callout text-g-green-ink hover:underline"
            >
              {authMode === 'login' ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Masuk di sini'}
            </button>
          </form>
        </article>
      </div>
    );
  }

  // --- RENDER: GLOBAL LEADERBOARD ---
  if (gameMode === 'LEADERBOARD') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
        <GridPulse className="fixed inset-0 pointer-events-none -z-10" />
        <article className="relative flex flex-col overflow-hidden g-glass-modal max-w-2xl w-full p-8 text-center transition-colors">
          <button type="button" onClick={() => setGameMode(null)} className="text-callout text-g-muted hover:text-g-ink mb-6 flex items-center gap-1 mx-auto">&larr; Kembali ke pemilihan mode</button>

          <div className="w-14 h-14 rounded-2xl bg-g-inset border border-g-hair flex items-center justify-center text-g-ink2 mx-auto mb-4">
            <Award className="w-7 h-7" />
          </div>
          <h2 className="text-title-2 font-semibold text-g-ink mb-1">Papan peringkat global</h2>
          <p className="text-callout text-g-muted mb-6 border-b border-g-hair pb-4">Kapten terbaik berdasarkan saldo akhir</p>

          {leaderboardData === null && (
            <p className="text-callout text-g-muted py-8">Memuat peringkat…</p>
          )}
          {leaderboardData !== null && leaderboardData.length === 0 && (
            <p className="text-callout text-g-muted py-8">Belum ada permainan yang selesai.</p>
          )}
          {leaderboardData !== null && leaderboardData.length > 0 && (
            <div className="text-left overflow-x-auto">
              <table className="w-full text-callout">
                <thead>
                  <tr className="text-caption font-semibold text-g-muted border-b border-g-hair">
                    <th className="py-2 px-2 text-left">#</th>
                    <th className="py-2 px-2 text-left">Kapten</th>
                    <th className="py-2 px-2 text-left">Mode</th>
                    <th className="py-2 px-2 text-left">Peringkat</th>
                    <th className="py-2 px-2 text-right">Saldo akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((entry, idx) => (
                    <tr key={idx} className="border-b border-g-hair">
                      <td className="py-2 px-2 font-plex text-g-muted">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 font-semibold text-g-ink">{entry.player_name}</td>
                      <td className="py-2 px-2 text-g-muted">{entry.mode === 'ONLINE' ? 'Online' : 'Offline'}</td>
                      <td className="py-2 px-2 text-g-muted">{entry.player_rating}</td>
                      <td className={`py-2 px-2 text-right font-plex tabular-nums ${entry.cash < 0 ? 'text-g-danger-ink' : 'text-g-ink'}`}>{formatRupiah(entry.cash)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    );
  }

  // --- RENDER 2: LOBBY FORM ---
  if (gameMode === 'ONLINE' && (!isInRoom || !roomState || (!isSpectator && !roomState.players[myPlayerId]))) {
    return (
      <GameLobby
        icon={Network}
        mode="ONLINE"
        onSwitchMode={setGameMode}
        title="Mabar online"
        subtitle="Bertanding real-time bersama pemain lain dalam satu kamar"
        onBack={() => setGameMode(null)}
        busy={loading}
      >
          <form className="space-y-4 text-left">
            <div>
              <label className="block text-callout font-semibold text-g-ink2 mb-1.5">Nama kapten</label>
              <input
                type="text"
                placeholder="Masukkan nama kapten..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-g-line focus:outline-none focus:border-g-green text-body bg-g-surface text-g-ink placeholder:text-g-faint"
                maxLength={12}
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleCreateRoom}
                className="w-full flex items-center justify-center gap-2 g-btn-green font-semibold text-body py-3.5 px-6 rounded-full cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Buat kamar baru
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-g-hair"></div>
              <span className="flex-shrink mx-4 text-g-muted text-caption">atau gabung</span>
              <div className="flex-grow border-t border-g-hair"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Kode kamar"
                aria-label="Kode kamar"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-g-line focus:outline-none focus:border-g-green font-plex font-medium text-body uppercase tracking-[.12em] placeholder:normal-case placeholder:tracking-normal placeholder:font-sans text-center bg-g-surface text-g-ink placeholder:text-g-faint"
                maxLength={4}
              />
              <button
                onClick={handleJoinRoom}
                className="g-pill font-semibold px-6 text-callout flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Gabung
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSpectateRoom}
                className="g-pill w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 text-callout cursor-pointer"
              >
                <Eye className="w-4 h-4 text-g-ink2" />
                Masuk sebagai penonton
              </button>
            </div>
          </form>

          {alertMessage && (
            <div className="mt-4 p-3 bg-g-danger-bg border border-g-danger-line rounded-xl text-g-danger-ink text-callout">
              {alertMessage}
            </div>
          )}
      </GameLobby>
    );
  }

  if (gameMode === 'OFFLINE' && !isOfflineGameStarted) {
    return (
      <GameLobby
        icon={Monitor}
        mode="OFFLINE"
        onSwitchMode={setGameMode}
        title="Lawan bot AI"
        subtitle={`Bertanding melawan tiga bot AI selama ${TOTAL_GAME_WEEKS} minggu pelayaran`}
        onBack={() => setGameMode(null)}
        busy={loading}
      >
          {resumableSession && (
            <div className="p-4 rounded-2xl bg-g-inset border border-g-hair text-left">
              <p className="text-callout font-semibold text-g-ink mb-1">Ada permainan yang belum selesai</p>
              <p className="text-callout text-g-muted mb-3">
                {resumableSession.players[0]?.name || 'Kapten'} · Minggu {resumableSession.week}/{TOTAL_GAME_WEEKS} · Port {resumableSession.currentPort} · Saldo <span className="font-plex">{formatRupiah(resumableSession.players[0]?.cash)}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResumeOfflineGame}
                  className="flex-1 g-btn-green font-semibold py-2.5 px-4 rounded-full text-callout cursor-pointer"
                >
                  Lanjutkan permainan
                </button>
                <button
                  type="button"
                  onClick={() => setResumableSession(null)}
                  className="g-pill font-semibold text-callout px-4 cursor-pointer"
                >
                  Mulai baru
                </button>
              </div>
            </div>
          )}

          {!resumableSession && (
          <form className="space-y-5 text-left" onSubmit={handleStartOfflineGame}>
            <div>
              <label className="block text-callout font-semibold text-g-ink2 mb-1.5">Nama kapten</label>
              <input
                type="text"
                placeholder="Masukkan nama Anda"
                value={offlinePlayersNames[0] || ''}
                onChange={(e) => {
                  const newNames = [...offlinePlayersNames];
                  newNames[0] = e.target.value;
                  setOfflinePlayersNames(newNames);
                }}
                className="w-full px-4 py-3 rounded-xl border border-g-line focus:outline-none focus:border-g-green text-body bg-g-surface text-g-ink placeholder:text-g-faint"
                maxLength={12}
              />
            </div>

            <div className="pt-1">
              <span className="text-callout font-semibold text-g-ink2 flex items-center justify-between mb-2">
                Kapten lawan <span className="font-plex text-caption font-normal text-g-muted">3 / 3 siap</span>
              </span>
              <ul className="rounded-xl border border-g-hair divide-y divide-g-hair overflow-hidden">
                {[
                  { name: 'Bot Alpha', style: 'Smart', note: 'meminimalkan restow', Icon: Cpu },
                  { name: 'Bot Beta', style: 'Greedy', note: 'memaksimalkan pendapatan', Icon: Zap },
                  { name: 'Bot Gamma', style: 'Balanced', note: 'strategi seimbang', Icon: Scale }
                ].map(({ name, style, note, Icon }) => (
                  <li key={name} className="flex items-center gap-3 px-3 py-2.5 bg-g-inset">
                    <span className="w-8 h-8 rounded-lg border border-g-hair bg-g-surface grid place-items-center shrink-0">
                      <Icon className="w-4 h-4 text-g-muted" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-callout font-semibold text-g-ink">{name}</span>
                      <span className="block text-caption text-g-muted truncate">{style} · {note}</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-g-green shrink-0" title="Siap" />
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleStartOfflineGame}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 g-btn-green font-semibold text-body py-3.5 px-6 rounded-full cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {loading ? 'Menyiapkan bot…' : 'Mulai tanding'}
              </button>
            </div>
          </form>
          )}

          {alertMessage && (
            <div className="p-3 bg-g-danger-bg border border-g-danger-line rounded-xl text-g-danger-ink text-callout">
              {alertMessage}
            </div>
          )}
      </GameLobby>
    );
  }


  // --- RENDER 3: ACTIVE GAME WORKSPACE (ONLINE & OFFLINE) ---
  const firstOnlinePlayer = (gameMode === 'ONLINE' && roomState && Object.keys(roomState.players).length > 0)
    ? Object.values(roomState.players)[0]
    : null;
  const activeOnlinePlayer = (gameMode === 'ONLINE' && roomState) 
    ? (roomState.players[myPlayerId] || (isSpectator ? firstOnlinePlayer : null))
    : null;
  const activeOfflinePlayer = (gameMode === 'OFFLINE' && offlinePlayers.length > 0) ? offlinePlayers[activePlayerIndex] : null;

  // Map room data based on mode
  const activePlayerName = gameMode === 'ONLINE' 
    ? (isSpectator ? `Penonton (Mengamati ${firstOnlinePlayer ? firstOnlinePlayer.name : ''})` : (activeOnlinePlayer ? activeOnlinePlayer.name : '')) 
    : (activeOfflinePlayer ? activeOfflinePlayer.name : '');
  const activePlayerCash = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.cash : 0) : (activeOfflinePlayer ? activeOfflinePlayer.cash : 0);
  const activePlayerPenalties = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.accumulatedPenalties : 0) : (activeOfflinePlayer ? activeOfflinePlayer.accumulatedPenalties : 0);
  const isReadyCurrent = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.ready : false) : (activeOfflinePlayer ? activeOfflinePlayer.ready : false);
  
  const currentWeek = gameMode === 'ONLINE' ? roomState.week : offlineWeek;
  const currentPort = gameMode === 'ONLINE' ? roomState.currentPort : offlineCurrentPort;
  const cargoPool = gameMode === 'ONLINE' ? roomState.globalCargoPool : (activeOfflinePlayer ? activeOfflinePlayer.cargoPool : []);
  const isGameOver = gameMode === 'ONLINE' ? roomState.isGameOver : offlineIsGameOver;

  // Map grid & pending list
  const activeGrid = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.grid : null) : offlineSharedGrid;
  const activePendingList = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.pendingContainers : []) : (activeOfflinePlayer ? activeOfflinePlayer.pendingContainers : []);

  // Leaderboard formatting
  const formattedPlayersList = gameMode === 'ONLINE' ? roomState.players : offlinePlayers.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const currentSocketOrIndexId = gameMode === 'ONLINE' ? myPlayerId : activePlayerIndex;

  // Drain Phase status detection
  const isDrainPhase = (gameMode === 'ONLINE' ? roomState?.isDrainPhase : (offlineWeek > HORIZON_WEEKS && offlineWeek <= TOTAL_GAME_WEEKS)) ?? false;

  return (
    <>
      {/* 1. Global alert toast */}
      {alertMessage && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 w-[min(560px,90vw)] px-0" role="alert">
          <div className="bg-g-inv text-g-inv-ink rounded-[10px] px-4 py-2.5 shadow-[0_10px_30px_var(--g-shadow)] flex items-center gap-3 text-callout">
            <AlertCircle className="w-4 h-4 text-g-red shrink-0" />
            <span className="leading-relaxed">{alertMessage}</span>
          </div>
        </div>
      )}

      {/* 2. Game page: navigation, sticky header and the bayplan workspace */}
      <GameShell
        gameMode={gameMode}
        roomCode={roomCode}
        isSpectator={isSpectator}
        spectatorName={firstOnlinePlayer ? firstOnlinePlayer.name : ''}
        playerName={isSpectator ? 'Penonton' : activePlayerName}
        week={currentWeek}
        currentPort={currentPort}
        cash={activePlayerCash}
        accumulatedPenalties={activePlayerPenalties}
        activePorts={gameMode === 'ONLINE' ? (roomState ? roomState.activePorts : null) : offlinePorts}
        turnTimer={gameMode === 'ONLINE' ? turnTimer : null}
        theme={theme}
        toggleTheme={toggleTheme}
        badgeCount={earnedBadges.length}
        onOpenTariff={() => setIsTariffOpen(true)}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onOpenISO={() => setIsISOOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenBadges={() => setIsBadgeGalleryOpen(true)}
        onLeave={handleLeaveRoom}
      >
        <BayplanSimulator
          grid={activeGrid}
          currentPort={currentPort}
          pendingContainers={activePendingList}
          onPlaceContainer={isSpectator ? () => {} : (gameMode === 'ONLINE' ? handlePlaceContainer : handlePlaceContainerOffline)}
          onRemoveContainer={isSpectator ? () => {} : (gameMode === 'ONLINE' ? handleRemoveContainer : handleRemoveContainerOffline)}
          activePorts={gameMode === 'ONLINE' ? (roomState ? roomState.activePorts : null) : offlinePorts}
          gameMode={gameMode}
          cargoPool={cargoPool}
          onAcceptCargo={isSpectator ? () => {} : (gameMode === 'ONLINE' ? handleClaimCargoOnline : handleClaimCargoOffline)}
          onDeclineCargo={isSpectator ? () => {} : (gameMode === 'ONLINE' ? handleDeclineCargoOnline : handleDeclineCargoOffline)}
          vesselLevel={offlineVesselLevel}
          onUpgradeVessel={isSpectator ? () => {} : handleUpgradeVesselOffline}
          cumulativeGrossRevenue={offlinePlayers[activePlayerIndex]?.cumulativeGrossRevenue || 0}
          onDepart={isSpectator ? () => {} : handleDepartOffline}
          loading={loading || isSpectator}
          isGameOver={isGameOver}
          isReadyCurrent={isReadyCurrent}
          onToggleReadyOnline={isSpectator ? () => {} : handleToggleReadyOnline}
          isDrainPhase={isDrainPhase}
          isSpectator={isSpectator}
          players={formattedPlayersList}
          playerId={currentSocketOrIndexId}
        />
      </GameShell>

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
        players={formattedPlayersList}
        onRestart={handleLeaveRoom}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
      />

      {/* 8. Lembar Informasi Tarif PT. SPIL Modal */}
      <TariffModal 
        isOpen={isTariffOpen} 
        onClose={() => setIsTariffOpen(false)} 
        currentPort={currentPort}
      />

      {/* 9. Glosarium & Standar Operasional SPIL Modal */}
      <GlossaryModal 
        isOpen={isGlossaryOpen} 
        onClose={() => setIsGlossaryOpen(false)} 
      />

      {/* 10. Visualisator Standar ISO 9711 Modal */}
      <ISOVisualizerModal 
        isOpen={isISOOpen} 
        onClose={() => setIsISOOpen(false)} 
      />

      {/* 11. Panduan & Tutorial Interaktif Modal */}
      <TutorialModal 
        isOpen={isTutorialOpen} 
        onClose={() => {
          setIsTutorialOpen(false);
          localStorage.setItem('spil_tutorial_completed', 'true');
        }} 
      />

      {/* 12. Laporan Audit Pembelajaran Modal */}
      <LearningAnalyticsModal 
        isOpen={isAnalyticsOpen} 
        onClose={() => setIsAnalyticsOpen(false)} 
        players={offlinePlayers} 
        humanPlayer={activeOfflinePlayer}
        totalWeeks={TOTAL_GAME_WEEKS}
      />

      {/* 13. In-Game Chat Panel (Online Multiplayer) */}
      {gameMode === 'ONLINE' && isInRoom && (
        <ChatPanel 
          socket={activeSocket} 
          roomCode={roomCode} 
          myPlayerId={myPlayerId} 
        />
      )}

      {/* 14. Galeri Lencana & Pencapaian Modal */}
      <BadgeGalleryModal 
        isOpen={isBadgeGalleryOpen} 
        onClose={() => setIsBadgeGalleryOpen(false)} 
        earnedBadges={earnedBadges} 
      />

      {/* 15. Animasi Giliran Bot AI Modal */}
      <BotTurnAnimationModal 
        isOpen={isBotAnimating} 
        onComplete={() => {
          finishDepartOffline(pendingOfflineSession, activePlayerIndex);
        }}
        bots={offlinePlayers.filter(p => p.isBot)}
        currentPort={currentPort}
        nextPort={offlinePorts[(offlinePorts.indexOf(currentPort) + 1) % offlinePorts.length]}
      />
    </>
  );
}
