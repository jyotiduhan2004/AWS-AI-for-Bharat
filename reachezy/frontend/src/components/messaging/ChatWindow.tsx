'use client';

import { useRef, useEffect, useState } from 'react';
import { Conversation } from './types';

interface ChatWindowProps {
  conversation: Conversation;
  onSendMessage: (text: string) => void;
  currentUserId?: string;
}

function AvatarFallback({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initial = (name || 'U')[0].toUpperCase();
  if (src) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-white border border-slate-200 overflow-hidden flex-shrink-0 ${className || ''}`}>
        <img src={src} alt={name} className="h-full w-full object-contain p-0.5" />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-primary text-white font-bold flex-shrink-0 ${className || ''}`}
    >
      {initial}
    </div>
  );
}

export default function ChatWindow({ conversation, onSendMessage, currentUserId }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    onSendMessage(text);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const { person, messages } = conversation;

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <AvatarFallback name={person.name} src={person.avatar} className="size-10 text-sm" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{person.name}</h3>
          <p className="text-xs text-slate-500">{person.subtitle}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2.5 ${
                    isOwn
                      ? 'bg-primary text-white rounded-2xl rounded-br-md'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-2xl rounded-bl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isOwn ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 border-t border-slate-200 px-6 py-4 flex-shrink-0">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="input-field"
        />
        <button onClick={handleSend} className="btn-primary !px-4 !py-3">
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </div>
    </div>
  );
}
