import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Users } from 'lucide-react';

const QUICK_REACTIONS = [
  'Siap berlayar!',
  'Kargo bernilai tinggi!',
  'Hati-hati restow!',
  'Kapal saya penuh!',
  'GG, Kapten!'
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
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-g-inv text-g-inv-ink rounded-full shadow-[0_8px_24px_var(--g-shadow)] font-semibold text-callout transition-opacity hover:opacity-90"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Obrolan kamar</span>
          {messages.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-g-green" aria-label="Ada pesan"></span>
          )}
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="g-glass-modal w-80 sm:w-96 overflow-hidden flex flex-col h-[420px] transition-colors text-g-ink">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-g-hair">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-g-muted" />
              <span className="text-callout font-semibold">Obrolan kamar <span className="font-plex font-medium">{roomCode}</span></span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup obrolan"
              className="g-pill w-7 h-7 flex items-center justify-center text-g-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Reaction Chips */}
          <div className="p-2 bg-g-inset border-b border-g-hair flex gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_REACTIONS.map((reaction, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(reaction)}
                className="g-pill px-3 py-1 text-caption font-medium text-g-ink whitespace-nowrap shrink-0"
              >
                {reaction}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2 text-callout">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-g-muted text-center p-4">
                <Users className="w-8 h-8 text-g-faint mb-2" />
                <p className="font-semibold text-callout">Belum ada pesan</p>
                <p className="text-caption mt-0.5">Sapa kapten lain atau kirim reaksi cepat di atas.</p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe = m.playerId === myPlayerId;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-caption text-g-muted mb-0.5 px-1">
                      {isMe ? 'Anda' : m.playerName}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-callout ${
                        isMe
                          ? 'bg-g-green text-white rounded-br-md'
                          : 'bg-g-inset border border-g-hair text-g-ink rounded-bl-md'
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
            className="p-2.5 bg-g-inset border-t border-g-hair flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan…"
              aria-label="Pesan"
              maxLength={200}
              className="flex-1 px-3.5 py-2 text-callout rounded-full bg-g-surface border border-g-hair focus:outline-none focus:border-g-green text-g-ink placeholder:text-g-faint"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              aria-label="Kirim"
              className="w-9 h-9 flex items-center justify-center g-btn-green rounded-full"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
