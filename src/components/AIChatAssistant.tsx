'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AIChatAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! Soy tu Analista de Negocios AI. 🐔📊\nPuedes preguntarme sobre ventas, stock de pollos, o cuadre de caja.',
            timestamp: new Date()
        }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Llamada a la API Route de Next.js (Serverless Function local)
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMessage.content })
            });

            const data = await response.json();

            if (!response.ok) {
                console.warn('Error en API:', data.error);
                throw new Error(data.error || 'Error en el servidor');
            }

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply || 'No pude obtener una respuesta.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);

        } catch (error: any) {
            console.error('Error enviando mensaje:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ ${error.message || 'Error al conectar con el asistente'}`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* Ventana de Chat */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-200 w-[380px] h-[500px] mb-4 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-pocholo-red to-red-700 p-4 flex items-center justify-between text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                    <Bot size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Kodefy Analyst AI</h3>
                                    <p className="text-xs text-red-100 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                        En línea
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Lista de Mensajes */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-300">
                            {messages.map((msg) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
                                        ${msg.role === 'assistant'
                                            ? 'bg-gradient-to-br from-pocholo-yellow to-amber-500 text-white'
                                            : 'bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {msg.role === 'assistant' ? <Sparkles size={14} /> : <User size={14} />}
                                    </div>

                                    {/* Burbuja */}
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm
                                        ${msg.role === 'user'
                                            ? 'bg-slate-800 text-white rounded-tr-none'
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap leading-relaxed">
                                            {msg.content}
                                        </div>
                                        <div className={`text-[10px] mt-1 opacity-70 ${msg.role === 'user' ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Loading Indicator */}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pocholo-yellow to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                        <Loader2 size={14} className="animate-spin" />
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                            <form
                                onSubmit={handleSendMessage}
                                className="flex gap-2 items-center bg-slate-100 rounded-xl px-3 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-pocholo-red/10 focus-within:border-pocholo-red/30 transition-all"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Pregunta sobre ventas, stock..."
                                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                            <div className="text-center mt-2">
                                <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                    <BarChart3 size={10} />
                                    Powered by Kodefy AI • Solo lectura
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Botón Flotante */}
            <motion.button
                layoutId="ai-chat-trigger"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors z-50
                    ${isOpen
                        ? 'bg-slate-600 text-white'
                        : 'bg-gradient-to-r from-pocholo-red to-red-600 text-white hover:shadow-red-500/25'
                    }`}
            >
                {isOpen ? (
                    <X size={24} />
                ) : (
                    <MessageCircle size={28} />
                )}
            </motion.button>
        </div>
    );
}
