import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Users } from 'lucide-react';

const QUICK_REACTIONS = [
  '⚓ Siap Berlayar!',
  '⚡ Kargo bernilai tinggi!',
  '⚠️ Hati-hati restow!',
  '📦 Kapal saya penuh!',
  '🚢 GG Kapten!'
];

export default function ChatPanel({ socket, roomCode, myPlayerId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (msg) => {
      setMessages((prev) => [...prev.slice(-49), msg]); // Keep last 50
    };

    socket.on('chat_message', handleIncomingMessage);

    return () => {
      socket.off('chat_message', handleIncomingMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || !socket) return;

    socket.emit('chat_message', { message: text });
    setInputText('');
  };

  if (!socket) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl hover:scale-105 transition-all border border-slate-700 font-extrabold text-xs uppercase tracking-wider"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>Obrolan Kamar</span>
          {messages.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-spil-green animate-pulse"></span>
          )}
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-80 sm:w-96 overflow-hidden flex flex-col h-[420px] animate-scale-up">
          {/* Header */}
          <div className="bg-slate-900 p-3.5 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black tracking-wide">Obrolan Kamar {roomCode}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Reaction Chips */}
          <div className="p-2 bg-slate-50 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_REACTIONS.map((reaction, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(reaction)}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 whitespace-nowrap shadow-xs transition-colors shrink-0"
              >
                {reaction}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                <Users className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-xs text-slate-500">Belum ada pesan</p>
                <p className="text-[10px] mt-0.5">Sapa kapten lain atau kirim reaksi cepat di atas!</p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe = m.playerId === myPlayerId;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 font-bold mb-0.5 px-1">
                      {isMe ? 'Anda' : m.playerName}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-spil-green text-white rounded-br-xs font-semibold'
                          : 'bg-slate-100 text-slate-800 rounded-bl-xs font-medium'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan..."
              maxLength={200}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-spil-green text-slate-800"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-spil-green hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
