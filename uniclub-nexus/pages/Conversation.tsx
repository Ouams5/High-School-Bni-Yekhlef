import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { ChatMessage, UserRole } from '../types';
import { Send, MessageSquareCode, ShieldAlert, Code2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const Conversation = () => {
  const { user, isDev, isOwner } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Permission check inside effect not ideal for redirects, handled by render
    if (!user || (!isDev && !isOwner)) return;

    const unsubscribe = db.subscribeToDevChat((msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user, isDev, isOwner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user || (!isDev && !isOwner)) {
    return <Navigate to="/" />;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await db.sendDevMessage({
        text: newMessage,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatarUrl,
        senderRole: user.role,
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
                <MessageSquareCode size={24} className="text-blue-400" />
            </div>
            <div>
                <h1 className="font-bold text-lg">Dev & Owner Channel</h1>
                <p className="text-xs text-slate-400">Encrypted • Real-time</p>
            </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
            {isOwner && <span className="bg-blue-600 px-2 py-1 rounded">OWNER ACCESS</span>}
            {isDev && <span className="bg-purple-600 px-2 py-1 rounded">DEV ACCESS</span>}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 mt-1">
                        {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                {msg.senderName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-xs font-bold text-slate-600">{msg.senderName}</span>
                             {msg.senderRole === UserRole.OWNER && <ShieldAlert size={12} className="text-blue-600"/>}
                             {msg.senderRole === UserRole.DEV && <Code2 size={12} className="text-purple-600"/>}
                        </div>
                        <div className={`px-4 py-2 rounded-2xl text-sm ${
                            isMe 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                </div>
            );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="flex gap-2">
            <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message to the team..."
                className="flex-1 p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Send size={20} />
            </button>
        </form>
      </div>
    </div>
  );
};