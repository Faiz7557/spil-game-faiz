import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import BayplanSimulator from './components/BayplanSimulator';
import PerformanceModal from './components/PerformanceModal';
import GameOverModal from './components/GameOverModal';
import { validateGridPhysics, formatRupiah } from './utils/gameHelpers';
import { AlertCircle, HelpCircle, Anchor, Play, Award, Users, LogIn, Monitor, Network } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5050';

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
  
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [lastWeeklyEvaluation, setLastWeeklyEvaluation] = useState(null);
  const socketRef = useRef(null);

  // Unmount cleanup for sockets and timers
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
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
      setLoading(false);
      localStorage.setItem('spil_room_code', roomCode);
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
      setLoading(false);
    });

    socket.on('sailing_completed', (state) => {
      setRoomState(state);
      const me = state.players[effectiveIdRef.current];
      if (me && !state.isGameOver) {
        setLastWeeklyEvaluation(me.lastWeeklyEvaluation);
        setShowWeeklyModal(true);
      }
      setLoading(false);
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
    const nextActiveIndex = session.activePorts.indexOf(session.currentPort) % session.players.length;
    if (nextActiveIndex !== -1) {
      setActivePlayerIndex(nextActiveIndex);
    }
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
        // Weekly evaluation belongs to whoever was active BEFORE this depart -
        // read it via the still-old activePlayerIndex closure, before
        // applyOfflineSession moves activePlayerIndex to the next branch.
        if (!session.isGameOver && session.players[activePlayerIndex]) {
          setLastWeeklyEvaluation(session.players[activePlayerIndex].lastWeeklyEvaluation);
          setShowWeeklyModal(true);
        }
        if (session.unlockMessages && session.unlockMessages.length > 0) {
          showTemporaryAlert(`🔓 UNLOCK RUTE BARU: ${session.unlockMessages.join('\n')}`);
        }
        applyOfflineSession(session);
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
      const socket = socketRef.current;
      // Wait for the server's ack before disconnecting: emitting then
      // disconnecting immediately can close the transport before the
      // 'leave_room' packet is flushed, silently dropping it and leaving a
      // ghost seat in the room that never gets cleaned up. The timeout is a
      // fallback in case the server/connection is already gone.
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        socket.disconnect();
      };
      socket.emit('leave_room', finish);
      setTimeout(finish, 1000);
      socketRef.current = null;
      localStorage.removeItem('spil_room_code');
    }
    setIsInRoom(false);
    setRoomCode('');
    setRoomState(null);
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

  // --- RENDER 1: MODE SELECTION ---
  if (gameMode === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-slide-up" style={{ backgroundImage: "linear-gradient(to bottom, #103b22, #2E7D4E, #103b22)" }}>
        <div className="glass-panel max-w-2xl w-full p-8 md:p-10 text-center border-slate-200 shadow-2xl relative overflow-hidden">
          {/* Subtle branding decorative background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>

          {/* Account status */}
          <div className="absolute top-4 right-4 text-xs">
            {authUser ? (
              <div className="flex items-center gap-2 text-slate-500 font-bold">
                <span>👤 {authUser.username}</span>
                <button onClick={handleLogout} className="text-rose-500 hover:text-rose-600 uppercase text-[10px] font-extrabold">Keluar Akun</button>
              </div>
            ) : (
              <button onClick={handleOpenAuth} className="flex items-center gap-1.5 text-slate-500 hover:text-spil-green font-extrabold uppercase text-[10px]">
                <LogIn className="w-3.5 h-3.5" /> Login / Daftar
              </button>
            )}
          </div>

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

          <button
            onClick={handleOpenLeaderboard}
            className="mt-6 inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 font-extrabold text-xs uppercase tracking-widest transition-colors"
          >
            <Award className="w-4 h-4" /> Papan Peringkat Global
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER: LOGIN / REGISTER ---
  if (gameMode === 'AUTH') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-slide-up" style={{ backgroundImage: "linear-gradient(to bottom, #103b22, #2E7D4E, #103b22)" }}>
        <div className="glass-panel max-w-sm w-full p-8 text-center border-slate-200 shadow-2xl relative overflow-hidden">
          <button onClick={() => setGameMode(null)} className="text-[10px] text-slate-400 font-extrabold hover:text-slate-600 uppercase mb-6 flex items-center gap-1 mx-auto">&larr; Kembali ke Pemilihan Mode</button>

          <div className="w-14 h-14 rounded-2xl bg-spil-green-light border border-green-100 flex items-center justify-center text-spil-green mx-auto mb-4">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-wider">
            {authMode === 'login' ? 'Masuk ke Akun' : 'Daftar Akun Baru'}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">
            Lacak Profil & Peringkat Anda
          </p>

          <form className="space-y-4 text-left" onSubmit={handleAuthSubmit}>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Nama Pengguna</label>
              <input
                type="text"
                placeholder="3-20 karakter, huruf/angka/underscore"
                value={authUsernameInput}
                onChange={(e) => setAuthUsernameInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-spil-green font-bold text-sm bg-slate-50/50"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Kata Sandi</label>
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                value={authPasswordInput}
                onChange={(e) => setAuthPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-spil-green font-bold text-sm bg-slate-50/50"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{authError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-spil-green hover:bg-spil-green-hover text-white font-extrabold py-3.5 px-6 rounded-xl uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Memproses...' : (authMode === 'login' ? 'Masuk' : 'Daftar')}
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
              className="w-full text-center text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600"
            >
              {authMode === 'login' ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Masuk di sini'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER: GLOBAL LEADERBOARD ---
  if (gameMode === 'LEADERBOARD') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-slide-up" style={{ backgroundImage: "linear-gradient(to bottom, #1a1200, #4a3200, #1a1200)" }}>
        <div className="glass-panel max-w-2xl w-full p-8 text-center border-slate-200 shadow-2xl relative overflow-hidden">
          <button onClick={() => setGameMode(null)} className="text-[10px] text-slate-400 font-extrabold hover:text-slate-600 uppercase mb-6 flex items-center gap-1 mx-auto">&larr; Kembali ke Pemilihan Mode</button>

          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
            <Award className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-wider">Papan Peringkat Global</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Kapten Terbaik Berdasarkan Saldo Akhir</p>

          {leaderboardData === null && (
            <p className="text-xs text-slate-400 font-bold uppercase py-8">Memuat peringkat...</p>
          )}
          {leaderboardData !== null && leaderboardData.length === 0 && (
            <p className="text-xs text-slate-400 font-bold uppercase py-8">Belum ada permainan yang selesai.</p>
          )}
          {leaderboardData !== null && leaderboardData.length > 0 && (
            <div className="text-left overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-2 px-2 text-left">#</th>
                    <th className="py-2 px-2 text-left">Kapten</th>
                    <th className="py-2 px-2 text-left">Mode</th>
                    <th className="py-2 px-2 text-left">Peringkat</th>
                    <th className="py-2 px-2 text-right">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-50">
                      <td className="py-2 px-2 font-black text-slate-400">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </td>
                      <td className="py-2 px-2 font-extrabold text-slate-800">{entry.player_name}</td>
                      <td className="py-2 px-2 text-slate-500 font-bold">{entry.mode === 'ONLINE' ? 'Online' : 'Offline'}</td>
                      <td className="py-2 px-2 text-slate-500 font-medium">{entry.player_rating}</td>
                      <td className={`py-2 px-2 text-right font-black ${entry.cash < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatRupiah(entry.cash)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER 2: LOBBY FORM ---
  if (gameMode === 'ONLINE' && (!isInRoom || !roomState || !roomState.players[myPlayerId])) {
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
          
          <h2 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-wider">Single Player vs Bot AI</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Mode Offline Skripsi: Bermain Bertanding Melawan 3 AI Agent</p>

          {resumableSession && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-left">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Permainan Belum Selesai Ditemukan</p>
              <p className="text-xs text-slate-600 font-bold mb-3">
                {resumableSession.players[0]?.name || 'Kapten'} · Minggu {resumableSession.week}/8 · Port {resumableSession.currentPort} · Saldo {formatRupiah(resumableSession.players[0]?.cash)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResumeOfflineGame}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 px-4 rounded-lg uppercase tracking-wider text-xs shadow-sm"
                >
                  Lanjutkan Permainan
                </button>
                <button
                  type="button"
                  onClick={() => setResumableSession(null)}
                  className="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600 px-3"
                >
                  Mulai Baru
                </button>
              </div>
            </div>
          )}

          {!resumableSession && (
          <form className="space-y-5 text-left">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider border-l-2 border-spil-green pl-2">NAMA KAPTEN ANDA (HUMAN PLAYER):</label>
              <input
                type="text"
                placeholder="Masukkan Nama Anda..."
                value={offlinePlayersNames[0] || ''}
                onChange={(e) => {
                  const newNames = [...offlinePlayersNames];
                  newNames[0] = e.target.value;
                  setOfflinePlayersNames(newNames);
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-spil-green font-bold text-sm bg-slate-50/50"
                maxLength={12}
              />
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2 border-l-2 border-indigo-500 pl-2">KAPTEN LAWAN (BOT AGENTS SKRIPSI):</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-gradient-to-br from-indigo-50/70 to-white p-3 rounded-xl border border-indigo-150 shadow-sm">
                  <span className="font-extrabold text-indigo-900 block text-[11px] mb-0.5">🤖 Bot Alpha (Smart AI)</span>
                  <span className="text-[8px] text-indigo-600 font-bold uppercase tracking-wider block">Smart Restow Minimizer</span>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50/70 to-white p-3 rounded-xl border border-amber-150 shadow-sm">
                  <span className="font-extrabold text-amber-900 block text-[11px] mb-0.5">⚡ Bot Beta (Greedy AI)</span>
                  <span className="text-[8px] text-amber-600 font-bold uppercase tracking-wider block">Revenue Maximizer</span>
                </div>

                <div className="bg-gradient-to-br from-emerald-50/70 to-white p-3 rounded-xl border border-emerald-150 shadow-sm">
                  <span className="font-extrabold text-emerald-900 block text-[11px] mb-0.5">⚖️ Bot Gamma (Balanced)</span>
                  <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider block">Balanced Strategy</span>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={handleStartOfflineGame}
                disabled={loading}
                className="w-full bg-spil-green hover:bg-spil-green-hover text-white font-extrabold py-3.5 px-6 rounded-xl uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                {loading ? 'Menyiapkan Simulasi Bot...' : 'Mulai Tanding vs Bot AI'}
              </button>
            </div>
          </form>
          )}

        </div>
      </div>
    );
  }


  // --- RENDER 3: ACTIVE GAME WORKSPACE (ONLINE & OFFLINE) ---
  const activeOnlinePlayer = (gameMode === 'ONLINE' && roomState) ? roomState.players[myPlayerId] : null;
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
  const activeGrid = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.grid : null) : offlineSharedGrid;
  const activePendingList = gameMode === 'ONLINE' ? (activeOnlinePlayer ? activeOnlinePlayer.pendingContainers : []) : (activeOfflinePlayer ? activeOfflinePlayer.pendingContainers : []);

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
