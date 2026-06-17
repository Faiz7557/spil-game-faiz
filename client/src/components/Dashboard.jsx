import React from 'react';
import { formatRupiah, PORT_NAMES, getNextPort } from '../utils/gameHelpers';
import { Calendar, Wallet, AlertTriangle, ArrowRight, Anchor, Users, CheckCircle2, Trophy, Navigation } from 'lucide-react';

export default function Dashboard({ week, currentPort, cash, accumulatedPenalties, roomCode, players, socketId, activePorts }) {
  const nextPort = getNextPort(currentPort, activePorts);
  const playersList = players ? Object.values(players).sort((a, b) => b.cash - a.cash) : [];
  
  return (
    <header className="w-full flex flex-col gap-5 mb-6 animate-slide-up">
      {/* Top Banner: Corporate Header */}
      <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col lg:flex-row justify-between items-center gap-5 shadow-sm relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50/50 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Logo & Game Info */}
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="w-16 h-12 flex items-center justify-center shrink-0">
            <svg 
              viewBox="0 0 100 65" 
              className="w-full h-full drop-shadow-sm select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" 
                fill="#D21E20" 
                stroke="#B5181A"
                strokeWidth="1.5"
              />
              <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
              <circle cx="5" cy="2" r="3" fill="#64748b" />
              <text 
                x="45" 
                y="30" 
                fill="#FFFFFF" 
                fontSize="18" 
                fontWeight="900" 
                fontFamily="'Outfit', 'Inter', sans-serif"
                textAnchor="middle" 
                transform="rotate(6, 45, 30)"
                letterSpacing="1"
              >
                SPIL
              </text>
            </svg>
          </div>
          
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 font-display">
              SPIL Game: 4 Jalur 
              <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full uppercase tracking-wider">
                Active Session
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase mt-0.5">
              Portal Perencanaan Stowage & Manajemen Pelayaran
            </p>
          </div>
        </div>

        {/* Room / Mode Indicator */}
        {roomCode && (
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl self-start lg:self-auto shrink-0 shadow-inner">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">KODE ROOM:</span>
            <span className={`text-sm font-black uppercase tracking-widest ${roomCode.includes('LOCAL') ? 'text-emerald-700' : 'text-indigo-600'}`}>
              {roomCode}
            </span>
          </div>
        )}

        {/* Port Sailing Voyage Timeline */}
        <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/80 w-full lg:w-auto shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-[9px] font-black uppercase tracking-wider pl-1">
            <Anchor className="w-3.5 h-3.5 text-spil-green" /> Port
          </div>
          <span className="px-3 py-1.5 rounded-lg text-xs font-black uppercase bg-spil-green text-white shadow-sm flex items-center gap-1 select-none">
            {currentPort}
            <span className="text-[9px] font-medium text-emerald-100">({PORT_NAMES[currentPort]})</span>
          </span>
          
          <div className="flex flex-col items-center shrink-0">
            <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Sailing</span>
            <ArrowRight className="w-4 h-4 text-slate-400 animate-bounce-horizontal" />
          </div>
          
          <span className="px-3 py-1.5 rounded-lg text-xs font-black uppercase bg-indigo-650 text-white shadow-sm flex items-center gap-1 select-none">
            {nextPort}
            <span className="text-[9px] font-medium text-indigo-150">({PORT_NAMES[nextPort]})</span>
          </span>
        </div>
      </div>

      {/* Stats Cards & Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Side: Stats cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Week Tracker Card */}
          <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-indigo-600 bg-white hover:shadow-md transition-all duration-300">
            <div>
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block mb-1">
                SIKLUS WAKTU
              </span>
              <span className="text-xl font-black text-slate-800">
                Minggu {week} <span className="text-slate-400 text-xs font-bold uppercase">/ 8</span>
              </span>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${(week / 8) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* Cash Balance Card */}
          <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-spil-green bg-white hover:shadow-md transition-all duration-300">
            <div>
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block mb-1">
                SALDO KAPTEN
              </span>
              <span className={`text-xl font-black tracking-tight ${cash >= 0 ? 'text-spil-green' : 'text-spil-red'}`}>
                {formatRupiah(cash)}
              </span>
              <span className="text-[8px] text-slate-400 font-bold block mt-2 uppercase">Target: Rp 300.000.000+</span>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm ${
              cash >= 0 
                ? 'bg-emerald-50 border-emerald-150 text-spil-green' 
                : 'bg-rose-50 border-rose-150 text-spil-red animate-pulse'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Accumulated Penalties Card */}
          <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-spil-red bg-white hover:shadow-md transition-all duration-300">
            <div>
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block mb-1">
                AKUMULASI DENDA
              </span>
              <span className={`text-xl font-black tracking-tight ${accumulatedPenalties > 0 ? 'text-spil-red' : 'text-slate-400'}`}>
                {formatRupiah(accumulatedPenalties)}
              </span>
              <span className="text-[8px] text-slate-400 font-bold block mt-2 uppercase">Denda Shifting & Rolling</span>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm ${
              accumulatedPenalties > 0 
                ? 'bg-rose-50 border-rose-150 text-spil-red animate-shake' 
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Right Side: Shared Papan Peringkat (Leaderboard) */}
        <div className="lg:col-span-1 glass-panel p-4 bg-white flex flex-col justify-between border-l-4 border-l-indigo-650 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50/20 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <span className="text-[9px] text-slate-450 font-black tracking-widest uppercase block mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Papan Peringkat
            </span>
            
            <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin">
              {playersList.map((p, idx) => {
                const isMe = p.id === socketId;
                
                // Rank badges
                let rankBadge = (
                  <span className="font-extrabold text-[9px] text-slate-400 w-4 text-center">#{idx + 1}</span>
                );
                if (idx === 0) rankBadge = <span className="w-4 flex justify-center text-amber-500 font-bold" title="Juara 1">🥇</span>;
                if (idx === 1) rankBadge = <span className="w-4 flex justify-center text-slate-400 font-bold" title="Juara 2">🥈</span>;
                if (idx === 2) rankBadge = <span className="w-4 flex justify-center text-amber-700 font-bold" title="Juara 3">🥉</span>;

                return (
                  <div 
                    key={p.id} 
                    className={`flex items-center justify-between text-xs p-2 rounded-xl border transition-all duration-200 ${
                      isMe 
                        ? 'bg-indigo-50/70 border-indigo-250 font-black text-indigo-900 shadow-sm scale-[0.99]' 
                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {rankBadge}
                      <span className="truncate max-w-[75px] font-bold" title={p.name}>{p.name}</span>
                      {p.ready && (
                        <span className="flex items-center text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full p-0.5" title="Siap Berlayar">
                          <CheckCircle2 className="w-3 h-3 fill-emerald-600 text-white" />
                        </span>
                      )}
                    </div>
                    <span className={`font-extrabold shrink-0 text-[11px] ${p.cash >= 0 ? 'text-emerald-700' : 'text-spil-red'}`}>
                      {p.cash >= 1000000000 
                        ? `${(p.cash / 1000000000).toFixed(1)}M` 
                        : `${(p.cash / 1000000).toFixed(0)}J`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
