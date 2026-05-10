'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';
import { useDashboard } from './layout';

import './dashboard.css';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const { updateCredits, addChat } = useDashboard() || {};

  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sidebar listeners
  useEffect(() => {
    const onNewChat = () => { setActiveChatId(null); setMessages([]); setInput(''); };
    const onLoadChat = async (e) => {
      const { chatId } = e.detail;
      try {
        const res = await fetch(`/api/chats/${chatId}`);
        const data = await res.json();
        setActiveChatId(chatId);
        setMessages(data.chat?.messages || []);
      } catch { showToast('Failed to load chat', 'error'); }
    };
    const onUsePrompt = (e) => {
      setInput(e.detail.prompt);
      setTimeout(() => textareaRef.current?.focus(), 100);
    };

    window.addEventListener('newChat', onNewChat);
    window.addEventListener('loadChat', onLoadChat);
    window.addEventListener('usePrompt', onUsePrompt);
    return () => {
      window.removeEventListener('newChat', onNewChat);
      window.removeEventListener('loadChat', onLoadChat);
      window.removeEventListener('usePrompt', onUsePrompt);
    };
  }, []);

  // Scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (overrideInput) => {
    const query = (overrideInput || input).trim();
    if (!query || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    let chatId = activeChatId;
    if (!chatId) {
      try {
        const res = await fetch('/api/chats', { method: 'POST' });
        const data = await res.json();
        chatId = data.chatId;
        setActiveChatId(chatId);
        addChat?.({ _id: chatId, title: query.substring(0, 45), updatedAt: new Date() });
      } catch { /* fail silent */ }
    }

    try {
      const res = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chatId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Search failed');
      if (data.creditsRemaining !== undefined) updateCredits?.(data.creditsRemaining);

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.status === 'chat' ? data.message : query,
        searchId: data.searchId,
        status: data.status || 'processing',
        leads: data.leads || [],
        insights: data.insights || null,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (chatId) {
        const allMessages = [...messagesRef.current.filter(m => m.id !== userMsg.id), userMsg, assistantMsg];
        fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages, title: query.substring(0, 50) }),
        }).catch(() => { });
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: query,
        error: err.message,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeChatId, updateCredits, addChat]);

  const handleSuggestionClick = (q) => {
    setInput(q);
    setTimeout(() => sendMessage(q), 100);
  };

  const handleSaveLead = async (lead) => {
    try {
      const res = await fetch('/api/leads/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Lead saved successfully!');
      } else {
        throw new Error(data.error || 'Failed to save lead');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="messages-area">
          <div className="chat-max-width">
            {messages.length === 0 ? (
              <div className="welcome-focus animate-in">
                <h1 className="welcome-title">How can I help you today?</h1>
                <p className="welcome-subtitle">Search for leads, ask about business automation, or explore growth strategies.</p>

                <div className="suggestion-grid-minimal">
                  <div className="suggestion-item" onClick={() => handleSuggestionClick("Find real estate agents in New York")}>
                    <div className="suggestion-header">Find Prospects</div>
                    <div className="suggestion-body">"Find real estate agents in New York looking for automation."</div>
                  </div>
                  <div className="suggestion-item" onClick={() => handleSuggestionClick("How can I automate my sales follow-ups?")}>
                    <div className="suggestion-header">Automation Strategy</div>
                    <div className="suggestion-body">"How can I automate my sales follow-ups with LeadLinx?"</div>
                  </div>
                  <div className="suggestion-item" onClick={() => handleSuggestionClick("Analyze r/SaaS for growth hacks")}>
                    <div className="suggestion-header">Market Analysis</div>
                    <div className="suggestion-body">"Analyze r/SaaS for the latest growth hacks and trends."</div>
                  </div>
                  <div className="suggestion-item" onClick={() => handleSuggestionClick("Write a cold email for digital agencies")}>
                    <div className="suggestion-header">Content Creation</div>
                    <div className="suggestion-body">"Write a high-converting cold email for digital agencies."</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg, idx) => (
                  <div key={idx} className="message-bubble-human animate-in">
                    <div className={`avatar-minimal ${msg.role === 'assistant' ? 'avatar-ai' : ''}`}>
                      {msg.role === 'assistant' ? 'AI' : (session?.user?.name?.[0] || 'U')}
                    </div>
                    <div className="message-text">
                      <ChatMessage message={msg} onSave={handleSaveLead} />
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="message-bubble-human animate-in">
                    <div className="avatar-minimal avatar-ai">AI</div>
                    <div className="message-text">
                      <div className="flex gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="input-container">
          <div className="input-box-engineered">
            <textarea
              ref={textareaRef}
              className="textarea-engineered"
              placeholder="Ask anything..."
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              className="action-btn-minimal"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
            </button>
          </div>
          <div className="max-w-[800px] mx-auto mt-3 px-1 text-[10px] text-gray-400 font-medium tracking-tight uppercase letter-spacing-[0.05em]">
            LeadLinx AI • Reddit Intelligence Engine
          </div>
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-24 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-in ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>{toast.msg}</div>
      )}
    </div>
  );
}
