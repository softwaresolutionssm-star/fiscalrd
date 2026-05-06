'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { findAnswer, ROLE_GREETINGS } from './knowledge-base';

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

const QUICK_QUESTIONS: Record<string, string[]> = {
  owner: [
    '¿Cómo hago una factura?',
    '¿Qué reportes debo enviar a la DGII?',
    '¿Cómo registro una compra?',
    '¿Qué es el ITBIS?',
    '¿Cómo cierro la caja?',
    '¿Cómo agrego un empleado?',
  ],
  admin: [
    '¿Cómo hago una factura?',
    '¿Cómo registro una compra?',
    '¿Qué es el reporte 607?',
    '¿Cómo controlo el inventario?',
  ],
  cashier: [
    '¿Cómo abro la caja?',
    '¿Cómo vendo en el POS?',
    '¿Qué hago si se va el internet?',
    '¿Cómo cierro la caja?',
    '¿Cómo uso el escáner?',
  ],
  accountant: [
    '¿Qué es el reporte IT-1?',
    '¿Cuándo debo declarar?',
    '¿Qué es el reporte 606?',
    '¿Cómo funciona la contabilidad?',
  ],
};

function formatText(text: string) {
  // Convert **bold** and bullet points to HTML-like JSX
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i} className={line.startsWith('•') || line.startsWith('→') || line.startsWith('✅') || line.startsWith('❌') ? 'block pl-2' : 'block'}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="font-semibold text-slate-800">{part}</strong> : part
        )}
        {i < lines.length - 1 && line === '' ? <br /> : null}
      </span>
    );
  });
}

export function ChatBot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize greeting when opened
  useEffect(() => {
    if (open && messages.length === 0) {
      const role = user?.role ?? 'owner';
      const greeting = ROLE_GREETINGS[role] ?? ROLE_GREETINGS['owner'];
      setMessages([{
        id: 'greeting',
        role: 'bot',
        text: greeting,
        timestamp: new Date(),
      }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowQuick(false);
    setIsTyping(true);

    // Simulate thinking delay (feels more natural)
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    const answer = findAnswer(text, user?.role);
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'bot',
      text: answer,
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, botMsg]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const quickQuestions = QUICK_QUESTIONS[user?.role ?? 'owner'] ?? QUICK_QUESTIONS['owner'];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all active:scale-95"
        aria-label="Asistente FiscalRD"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 120px)', height: 540 }}>

          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="bg-white/20 rounded-full p-1.5">
              <Bot size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Asistente FiscalRD</p>
              <p className="text-blue-200 text-xs">Siempre disponible para ayudarte 🟢</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${msg.role === 'bot' ? 'bg-blue-100' : 'bg-slate-200'}`}>
                  {msg.role === 'bot'
                    ? <Bot size={14} className="text-blue-600" />
                    : <User size={14} className="text-slate-600" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'bot'
                    ? 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
                    : 'bg-blue-600 text-white rounded-tr-sm'
                }`}>
                  {msg.role === 'bot' ? formatText(msg.text) : msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-blue-600" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Quick questions */}
            {showQuick && messages.length <= 1 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-slate-400 font-medium px-1">Preguntas frecuentes:</p>
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors text-slate-600"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-slate-100 p-3 flex gap-2 bg-white">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl px-3 py-2 transition-colors flex items-center gap-1"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
