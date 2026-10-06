import { useState, useEffect } from 'react';
import { FastForward, CheckCircle2 } from 'lucide-react';
import Sheet from './ui/Sheet';

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
    <Sheet labelledBy="bot-turn-title">
      <div className="g-glass-modal max-w-md w-full overflow-hidden p-6 text-center flex flex-col items-center transition-colors text-g-ink">
        {/* Animated Radar/Ship Icon */}
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-3xl bg-g-inset border border-g-hair flex items-center justify-center text-4xl animate-bounce-slow">
            {activeBot.avatar || '🤖'}
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-g-green-line opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-g-green"></span>
          </span>
        </div>

        <span className="text-caption font-semibold text-g-muted mb-1">
          Giliran bot AI
        </span>

        <h3 id="bot-turn-title" className="text-title-2 font-semibold text-g-ink">
          {activeBot.name} sedang menata kapal
        </h3>
        
        <p className="text-callout text-g-muted mt-1.5 mb-4 max-w-xs">
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
              className={`px-3 py-1.5 rounded-full border text-caption font-semibold flex items-center gap-1.5 transition-colors ${
                idx === currentBotIndex
                  ? 'bg-g-inv text-g-inv-ink border-transparent'
                  : idx < currentBotIndex
                  ? 'bg-g-green-bg text-g-green-ink border-g-green-line'
                  : 'bg-g-inset text-g-muted border-g-hair'
              }`}
            >
              <span>{b.avatar || '🤖'}</span>
              <span>{b.name.split(' ')[0]}</span>
              {idx < currentBotIndex && <CheckCircle2 className="w-3 h-3 text-g-green-ink" />}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-g-inset h-2 rounded-full overflow-hidden mb-6 flex">
          <div
            className="bg-g-green h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="g-pill flex items-center gap-2 px-5 py-2.5 font-semibold text-callout"
        >
          <FastForward className="w-4 h-4" /> Lewati animasi
        </button>
      </div>
    </Sheet>
  );
}
