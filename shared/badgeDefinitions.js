/**
 * Badge & Achievement definitions for SPIL-GAME.
 * Shared between client (UI gallery) and server (evaluation engine).
 */

export const BADGE_DEFINITIONS = [
  {
    id: 'zero_restow',
    title: 'Zero Shifting Master',
    category: 'Stowage',
    icon: '🏆',
    description: 'Menyelesaikan minggu pelayaran dengan 0 restow blocker (tidak ada denda shifting).',
    color: 'from-amber-400 to-yellow-600',
    check: (evaluation) => (evaluation?.restowCount ?? 0) === 0
  },
  {
    id: 'committed_champion',
    title: 'Mitra Terpercaya (100% Committed)',
    category: 'Customer',
    icon: '⭐',
    description: 'Berhasil memuat seluruh kargo kontrak Committed tanpa ada satu pun yang tertinggal (0 rolling penalty).',
    color: 'from-emerald-400 to-teal-600',
    check: (evaluation) => {
      const rolledList = evaluation?.rolledDetails || [];
      return !rolledList.some(r => r.customerType?.includes('Committed'));
    }
  },
  {
    id: 'capacity_optimizer',
    title: 'Master Utilisasi Kapal',
    category: 'Efficiency',
    icon: '🎯',
    description: 'Mencapai efisiensi utilisasi muatan kapal di atas 85% dari total slot yang tersedia.',
    color: 'from-blue-400 to-indigo-600',
    check: (evaluation, session) => {
      const loaded = evaluation?.loadedCount || 0;
      return loaded >= 20; // 20+ containers on board
    }
  },
  {
    id: 'reefer_specialist',
    title: 'Spesialis Kargo Berpendingin',
    category: 'Reefer',
    icon: '🧊',
    description: 'Menata kargo REEFER dengan sempurna pada bay bercolokan listrik (Bay 10 & 14).',
    color: 'from-cyan-400 to-sky-600',
    check: (evaluation, session) => {
      return (evaluation?.dischargedCount || 0) >= 4;
    }
  },
  {
    id: 'profit_max',
    title: 'Konglomerat Logistik SPIL',
    category: 'Finance',
    icon: '💰',
    description: 'Mencapai akumulasi saldo kas operasional melebihi Rp 250.000.000.',
    color: 'from-emerald-500 to-green-700',
    check: (evaluation) => (evaluation?.cashSnapshot || 0) >= 250000000
  },
  {
    id: 'drain_survivor',
    title: 'Penjelajah Sirkuit Lengkap',
    category: 'Navigation',
    icon: '⚓',
    description: 'Berhasil menyelesaikan seluruh horizon pelayaran hingga akhir Drain Phase (Minggu 11).',
    color: 'from-purple-500 to-violet-700',
    check: (evaluation) => (evaluation?.week || 0) >= 11
  },
  {
    id: 'bot_beater',
    title: 'Penakluk Benchmark AI',
    category: 'Challenge',
    icon: '🤖',
    description: 'Mengungguli perolehan kas Bot Alpha (SMART) dalam evaluasi akhir.',
    color: 'from-rose-500 to-pink-700',
    check: (evaluation, session, players) => {
      if (!players || players.length < 2) return false;
      const human = players[0];
      const botSmart = players.find(p => p.personality === 'SMART');
      return botSmart && human && human.cash > botSmart.cash;
    }
  }
];

/**
 * Evaluates which badges have been earned by a player given their evaluations.
 */
export const evaluateEarnedBadges = (evaluation, session, players, currentEarned = []) => {
  const earnedSet = new Set(currentEarned);
  const newlyEarned = [];

  BADGE_DEFINITIONS.forEach(b => {
    if (!earnedSet.has(b.id)) {
      try {
        if (b.check(evaluation, session, players)) {
          earnedSet.add(b.id);
          newlyEarned.push(b);
        }
      } catch (err) {
        console.error('Error checking badge', b.id, err);
      }
    }
  });

  return {
    allEarned: Array.from(earnedSet),
    newlyEarned
  };
};
