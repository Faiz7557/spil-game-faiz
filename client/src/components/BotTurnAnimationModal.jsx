import { useState, useEffect } from 'react';
import { FastForward, CheckCircle2 } from 'lucide-react';

export default function BotTurnAnimationModal({ 
  isOpen, 
  onComplete, 
  bots = []
}) {
  const [currentBotIndex, setCurrentBotIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentBotIndex < bots.length - 1) {
            setCurrentBotIndex(c => c + 1);
            return 0;
          } else {
            clearInterval(interval);
            setTimeout(() => {
              setCurrentBotIndex(0);
              setProgress(0);
              onComplete?.();
            }, 400);
            return 100;
          }
        }
        return prev + 25; // 4 ticks per bot ~ 1s total per bot
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isOpen, currentBotIndex, bots.length, onComplete]);

  if (!isOpen) return null;

  const handleSkip = () => {
    setCurrentBotIndex(0);
    setProgress(0);
    onComplete?.();
  };

  const activeBot = bots[currentBotIndex] || {
    name: 'Bot Benchmark',
    personality: 'SMART',
    avatar: '🤖'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-up p-6 text-center flex flex-col items-center">
        {/* Animated Radar/Ship Icon */}
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-4xl shadow-inner animate-bounce-slow">
            {activeBot.avatar || '🤖'}
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-600"></span>
          </span>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full mb-2">
          Simulasi Giliran AI Benchmark
        </span>

        <h3 className="text-lg font-black text-slate-800 tracking-tight">
          {activeBot.name} Sedang Menata Kapal
        </h3>
        
        <p className="text-xs text-slate-500 font-medium mt-1 mb-4 leading-relaxed max-w-xs">
          {activeBot.personality === 'SMART' && 'Memfilter pesanan bernilai tinggi dan menyusun kargo Later-Port di posisi terdalam...'}
          {activeBot.personality === 'GREEDY' && 'Menerima semua kargo yang ditawarkan hingga kapasitas kapal penuh...'}
          {activeBot.personality === 'BALANCED' && 'Menyeimbangkan kuota risiko committed dan non-committed...'}
          {!['SMART', 'GREEDY', 'BALANCED'].includes(activeBot.personality) && 'Menjalankan optimasi alokasi bayplan...'}
        </p>

        {/* Bot Queue Indicator */}
        <div className="flex gap-2 mb-5">
          {bots.map((b, idx) => (
            <div
              key={idx}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${
                idx === currentBotIndex
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                  : idx < currentBotIndex
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <span>{b.avatar || '🤖'}</span>
              <span>{b.name.split(' ')[0]}</span>
              {idx < currentBotIndex && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6 flex">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-all hover:scale-105"
        >
          <FastForward className="w-4 h-4" /> Lewati Animasi (Skip)
        </button>
      </div>
    </div>
  );
}
